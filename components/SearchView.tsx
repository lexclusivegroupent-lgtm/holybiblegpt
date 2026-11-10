import React, { useRef, useState } from 'react';
import { Translation } from '../types';
import { getVerseText } from '../services/bibleService';
import {
  MAX_SEARCH_VERSES,
  chapterVerses,
  chooseVerseText,
  loadBundledIndex,
  resolveTopicSearch,
} from '../services/scriptureSearch.mjs';

interface SearchViewProps {
  onOpenPassage: (book: string, chapter: string, verse?: string) => void;
  translation: Translation;
}

interface StoredVerse {
  book: string;
  chapter: string;
  verse: string;
  text: string;
}

interface SearchNotice {
  title: string;
  text: string;
}

const REF_REGEX = /^((?:\d\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)(?::(\d+))?$/;

const bibleCache = new Map<string, Promise<Map<string, { number: number; text: string }[]>>>();

function storedBible(translation: Translation) {
  const key = translation === Translation.WEB ? 'WEB' : translation === Translation.KJV ? 'KJV' : 'NONE';
  let pending = bibleCache.get(key);
  if (!pending) {
    pending = loadBundledIndex(translation);
    bibleCache.set(key, pending);
  }
  return pending;
}

const SearchView: React.FC<SearchViewProps> = ({ onOpenPassage, translation }) => {
  const [query, setQuery] = useState('');
  const [verses, setVerses] = useState<StoredVerse[]>([]);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [notice, setNotice] = useState<SearchNotice | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [mode, setMode] = useState<'reference' | 'topic'>('topic');
  const requestRef = useRef(0);

  const handleReferenceSearch = (q: string) => {
    const match = q.trim().match(REF_REGEX);
    if (match) {
      onOpenPassage(match[1].trim(), match[2], match[3]);
      return true;
    }
    return false;
  };

  const handleTopicSearch = async (q: string) => {
    const id = ++requestRef.current;
    setIsSearching(true);
    setVerses([]);
    setCommentary(null);
    setNotice(null);
    setHasSearched(true);
    try {
      const puter = (window as any).puter;
      if (!puter?.ai?.chat) throw new Error('puter_unavailable');

      const topic = q.replace(/\s+/g, ' ').trim().slice(0, 240);
      const prompt = `You are a Bible concordance. Suggest up to ${MAX_SEARCH_VERSES} real verse references about the topic. Do not write, quote, or paraphrase any verse.

Use this shape only:
REF: Book Chapter:Verse
COMMENTARY: one or two sentences in your own words. This is not Scripture.

Topic: ${topic}
The reader is using ${translation}. Name references only.`;

      const response = await puter.ai.chat(prompt, false, { model: 'gpt-4o-mini' });
      const raw: string = response?.message?.content?.[0]?.text
        || (typeof response?.message?.content === 'string' ? response.message.content : '')
        || '';

      const index = await storedBible(translation);
      const resolved = await resolveTopicSearch(raw, async (book: string, chapter: string, verse: number) => {
        const stored = chapterVerses(index, book, chapter);
        if (stored) return chooseVerseText(stored, null, verse);
        if (translation !== Translation.KJV && translation !== Translation.WEB) return null;
        try {
          const fetched = await getVerseText(translation, book, chapter);
          return chooseVerseText(null, fetched, verse);
        } catch {
          return null;
        }
      });
      if (id !== requestRef.current) return;
      setVerses(resolved.verses);
      setCommentary(resolved.commentary);
    } catch (err: any) {
      if (id !== requestRef.current) return;
      if (err.message === 'puter_unavailable') {
        setNotice({
          title: 'Sign In Required',
          text: 'A free sign-in is needed so Holy Bible GPT can offer this AI feature at no cost. Use the Study tab to sign in, then come back to search by topic.',
        });
      } else {
        setNotice({
          title: 'Notice',
          text: 'Topic search requires an internet connection. Try again shortly.',
        });
      }
    } finally {
      if (id === requestRef.current) setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (handleReferenceSearch(query)) return;
    handleTopicSearch(query);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-8 pb-28">
      <header className="text-center space-y-2">
        <h2 className="accent-font text-2xl font-bold gold-gradient-text uppercase tracking-widest">Scripture Search</h2>
        <p className="text-[10px] text-stone-600 uppercase tracking-widest">References from the study helper. Verse text from the stored Bible.</p>
      </header>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-stone-900/50 rounded-2xl border border-white/5">
        {(['topic', 'reference'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
              mode === m ? 'bg-[#D4AF37] text-black shadow' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {m === 'topic' ? '✨ Topic Search' : '📖 Reference'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="relative group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === 'topic' ? 'e.g. anxiety, forgiveness, hope' : 'e.g. John 3:16 or Genesis 1'}
          className="w-full bg-stone-900/50 border border-white/10 rounded-2xl px-6 py-4 text-stone-200 focus:outline-none focus:border-[#D4AF37] bible-font text-lg transition-all"
          aria-label="Search Bible"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D4AF37] hover:scale-110 transition-transform disabled:opacity-40"
        >
          {isSearching ? (
            <div className="w-5 h-5 border-t-2 border-[#D4AF37] rounded-full animate-spin" />
          ) : '🔍'}
        </button>
      </form>

      {isSearching && (
        <div className="text-center py-8 space-y-3">
          <p className="text-[10px] text-stone-600 uppercase tracking-widest animate-pulse">Searching Scripture…</p>
        </div>
      )}

      {notice && (
        <div className="glass-dark border border-white/5 p-6 rounded-2xl space-y-2" role="status">
          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{notice.title}</p>
          <p className="text-stone-400 text-sm leading-relaxed">{notice.text}</p>
        </div>
      )}

      <div className="space-y-4">
        {verses.map((verse) => (
          <button
            key={`${verse.book}-${verse.chapter}-${verse.verse}`}
            type="button"
            onClick={() => onOpenPassage(verse.book, verse.chapter, verse.verse)}
            className="w-full text-left glass-dark border border-[#D4AF37]/15 hover:border-[#D4AF37]/30 p-6 rounded-2xl space-y-3 transition-all"
          >
            <div className="flex justify-between items-center gap-3">
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">
                {verse.book} {verse.chapter}:{verse.verse}
              </span>
              <span className="text-[8px] text-stone-500 uppercase tracking-widest">{translation} · Tap to read</span>
            </div>
            <p className="text-stone-300 text-sm italic leading-relaxed bible-font">{verse.text}</p>
          </button>
        ))}
      </div>

      {commentary && (
        <aside className="border border-white/10 bg-stone-950/40 p-6 rounded-2xl space-y-2" aria-label="AI commentary">
          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">AI commentary</p>
          <p className="text-[10px] text-stone-600 uppercase tracking-widest">The study helper wrote this. It is not Scripture.</p>
          <p className="text-stone-400 text-sm leading-relaxed">{commentary}</p>
        </aside>
      )}

      {hasSearched && !isSearching && !notice && verses.length === 0 && (
        <div className="text-center pt-4 space-y-3" role="status">
          <p className="text-sm text-stone-400">No stored verse matched this search.</p>
          <p className="text-[10px] text-stone-600 uppercase tracking-widest leading-relaxed">
            References that are not in the stored Bible are left out. No verse text is guessed.
          </p>
        </div>
      )}

      {!hasSearched && !isSearching && (
        <div className="text-center pt-8 space-y-3">
          <p className="text-[9px] text-stone-700 uppercase tracking-widest leading-relaxed">
            Topic search asks the study helper for references. The wording on the page comes from the stored Bible. A free sign-in is needed to enable it.
          </p>
          <p className="text-[9px] text-stone-800 uppercase tracking-widest">
            Direct references (e.g. Romans 8:28) always work without sign-in
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchView;
