
import React, { useState } from 'react';
import { Translation } from '../types';

interface SearchViewProps {
  onOpenPassage: (book: string, chapter: string, verse?: string) => void;
  translation: Translation;
}

interface SearchResult {
  book: string;
  chapter: string;
  verse?: string;
  text: string;
  isAI?: boolean;
}

const REF_REGEX = /^((?:\d\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)(?::(\d+))?$/;

const SearchView: React.FC<SearchViewProps> = ({ onOpenPassage, translation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mode, setMode] = useState<'reference' | 'topic'>('topic');

  const handleReferenceSearch = (q: string) => {
    const match = q.trim().match(REF_REGEX);
    if (match) {
      onOpenPassage(match[1].trim(), match[2], match[3]);
      return true;
    }
    return false;
  };

  const handleTopicSearch = async (q: string) => {
    setIsSearching(true);
    setResults([]);
    try {
      const puter = (window as any).puter;
      if (!puter?.ai?.chat) throw new Error('puter_unavailable');

      const prompt = `You are a Bible concordance. Find 5 relevant ${translation} verses about: "${q}".

For each verse, output exactly:
REF: [Book Chapter:Verse]
TEXT: [verse text]

Only output real, accurate Scripture. No commentary between entries.`;

      const response = await puter.ai.chat(prompt, false, { model: 'gpt-4o-mini' });
      const raw: string = response?.message?.content?.[0]?.text
        || (typeof response?.message?.content === 'string' ? response.message.content : '')
        || '';

      const parsed: SearchResult[] = [];
      let pendingRef = '';
      for (const line of raw.split('\n')) {
        const t = line.trim();
        if (t.startsWith('REF:')) {
          pendingRef = t.slice(4).trim();
        } else if (t.startsWith('TEXT:') && pendingRef) {
          const verseText = t.slice(5).trim();
          const m = pendingRef.match(/^((?:\d\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+)/);
          if (m) {
            parsed.push({ book: m[1].trim(), chapter: m[2], verse: m[3], text: verseText, isAI: true });
          }
          pendingRef = '';
        }
      }

      if (parsed.length === 0) {
        setResults([{ book: 'Tip', chapter: '', text: `Try the Study tab to ask about "${q}" for a deeper exploration.` }]);
      } else {
        setResults(parsed);
      }
    } catch (err: any) {
      if (err.message === 'puter_unavailable') {
        setResults([{ book: 'Sign In Required', chapter: '', text: 'Sign in to your free Puter account (puter.com) to unlock AI topic search.' }]);
      } else {
        setResults([{ book: 'Notice', chapter: '', text: 'Topic search requires an internet connection. Try again shortly.' }]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (handleReferenceSearch(query)) return;
    handleTopicSearch(query);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-8 pb-28">
      <header className="text-center space-y-2">
        <h2 className="accent-font text-2xl font-bold gold-gradient-text uppercase tracking-widest">Scripture Search</h2>
        <p className="text-[10px] text-stone-600 uppercase tracking-widest">Reference or topic — powered by AI</p>
      </header>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-stone-900/50 rounded-2xl border border-white/5">
        {(['topic', 'reference'] as const).map(m => (
          <button
            key={m}
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

      <div className="space-y-4">
        {results.map((res, i) => (
          <div key={i} className={`glass-dark border p-6 rounded-2xl space-y-3 ${res.isAI ? 'border-[#D4AF37]/15 hover:border-[#D4AF37]/30 cursor-pointer transition-all' : 'border-white/5'}`}
            onClick={() => res.isAI && res.verse && onOpenPassage(res.book, res.chapter, res.verse)}
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">
                {res.book}{res.chapter ? ` ${res.chapter}` : ''}{res.verse ? `:${res.verse}` : ''}
              </span>
              {res.isAI && <span className="text-[8px] text-stone-700 uppercase tracking-widest">Tap to read →</span>}
            </div>
            <p className="text-stone-400 text-sm italic leading-relaxed bible-font">{res.text}</p>
          </div>
        ))}
      </div>

      {results.length === 0 && !isSearching && (
        <div className="text-center pt-8 space-y-3">
          <p className="text-[9px] text-stone-700 uppercase tracking-widest leading-relaxed">
            Topic search uses AI to find relevant verses · Sign in to Puter (free) to enable
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
