
import React, { useState, useEffect, useRef } from 'react';
import { Translation, ReaderState, AppMode, Highlight } from '../types';
import { getVerseText, VerseData, BIBLE_BOOKS, HISTORICAL_BOOKS, prefetchAdjacent, isChapterOffline } from '../services/bibleService';
import { HISTORICAL_INTRODUCTIONS } from '../constants';
import { storage } from '../services/storageService';
import CrossReferencePanel from './CrossReferencePanel';

interface BibleReaderProps {
  state: ReaderState;
  translation: Translation;
  onClose: () => void;
  onNavigate: (book: string, chapter: string) => void;
  onStudyVerse?: (mode: AppMode, verse: number) => void;
  onStudyChapter?: (mode: AppMode) => void;
  onReport?: () => void;
}

const ALL_BOOKS = [...BIBLE_BOOKS, ...HISTORICAL_BOOKS];

const BibleReader: React.FC<BibleReaderProps> = ({
  state,
  translation,
  onNavigate,
  onStudyVerse,
  onStudyChapter,
  onReport,
  onClose
}) => {
  const [content, setContent] = useState<VerseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const settings = storage.getSettings();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isHistorical = HISTORICAL_BOOKS.some(b => b.name === state.book);
    if (isHistorical && state.chapter === '1' && !loading) {
      setShowIntro(true);
    } else {
      setShowIntro(false);
      loadVerses();
    }
    storage.addHistory({ book: state.book, chapter: state.chapter, timestamp: Date.now() });
    prefetchAdjacent(translation, state.book, state.chapter);
    checkOfflineStatus();
    setHighlights(storage.getHighlights());
  }, [state.book, state.chapter, translation]);

  const checkOfflineStatus = async () => {
    const offline = await isChapterOffline(translation, state.book, state.chapter);
    setIsOffline(offline);
  };

  const loadVerses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVerseText(translation, state.book, state.chapter);
      setContent(data);
    } catch {
      setError("Scripture connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const closeVerseMenu = () => {
    setSelectedVerse(null);
    setShowNoteInput(false);
    setNoteInput('');
  };

  const handleVerseClick = (num: number) => {
    if (selectedVerse === num) {
      closeVerseMenu();
    } else {
      setSelectedVerse(num);
      setShowNoteInput(false);
      setNoteInput('');
      storage.saveLastRead(state.book, state.chapter, num);
    }
  };

  const applyHighlight = (color: string) => {
    if (!selectedVerse) return;
    const h: Highlight = { book: state.book, chapter: state.chapter, verse: selectedVerse, color, timestamp: Date.now() };
    storage.addHighlight(h);
    setHighlights(storage.getHighlights());
    closeVerseMenu();
  };

  const saveNote = () => {
    if (selectedVerse && noteInput.trim()) {
      storage.saveNote(`${state.book}-${state.chapter}-${selectedVerse}`, noteInput.trim());
    }
    closeVerseMenu();
  };

  const getVerseHighlight = (num: number) => {
    return highlights.find(h => h.book === state.book && h.chapter === state.chapter && h.verse === num)?.color;
  };

  const currentBookData = ALL_BOOKS.find(b => b.name === state.book) || ALL_BOOKS[0];
  const chapterNum = parseInt(state.chapter, 10);
  const hasPrev = chapterNum > 1;
  const hasNext = chapterNum < currentBookData.chapters;

  if (showIntro) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-black">
        <div className="glass-dark border border-[#D4AF37]/20 p-10 rounded-[2.5rem] max-w-xl space-y-8 shadow-2xl">
          <header className="text-center space-y-4">
            <div className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.4em]">Historical Context</div>
            <h2 className="accent-font text-4xl gold-gradient-text uppercase tracking-widest">{state.book}</h2>
          </header>
          <p className="bible-font text-stone-300 leading-relaxed italic text-center text-lg">
            "{HISTORICAL_INTRODUCTIONS[state.book] || "A valuable historical witness."}"
          </p>
          <button onClick={() => { setShowIntro(false); loadVerses(); }} className="w-full bg-[#D4AF37] text-black font-bold py-5 rounded-2xl uppercase tracking-widest text-xs">
            Enter Study
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full relative ${settings.nightMode ? 'bg-stone-950' : 'bg-transparent'}`}>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="px-3 py-1.5 border-b border-white/5 flex items-center gap-2 glass-dark z-20 min-h-[52px]">

        {/* Back — distinct text label, never just an arrow */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 min-h-[44px] px-2 text-stone-400 hover:text-white transition-colors shrink-0"
          aria-label="Back to home"
        >
          <span className="text-lg leading-none">‹</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Back</span>
        </button>

        <div className="h-5 w-px bg-white/10 shrink-0" />

        {/* Book + Chapter selects */}
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar min-w-0">
          <select
            value={state.book}
            onChange={(e) => onNavigate(e.target.value, '1')}
            className="text-[10px] font-bold bg-stone-900 border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none text-stone-300 min-h-[36px]"
          >
            <optgroup label="Old Testament">
              {BIBLE_BOOKS.slice(0, 39).map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </optgroup>
            <optgroup label="New Testament">
              {BIBLE_BOOKS.slice(39).map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </optgroup>
            <optgroup label="Historical">
              {HISTORICAL_BOOKS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </optgroup>
          </select>

          <select
            value={state.chapter}
            onChange={(e) => onNavigate(state.book, e.target.value)}
            className="text-[10px] font-bold bg-stone-900 border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none text-stone-300 min-h-[36px]"
          >
            {Array.from({ length: currentBookData.chapters }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>

          <span className={`text-[8px] uppercase tracking-widest font-bold shrink-0 hidden sm:inline ${isOffline ? 'text-emerald-500' : 'text-stone-600'}`}>
            {isOffline ? '● Offline' : '● Live'}
          </span>
        </div>

        {/* Chapter overview shortcut */}
        <button
          onClick={() => onStudyChapter?.(AppMode.CHAPTER_OVERVIEW)}
          className="min-h-[44px] px-2 flex items-center justify-center text-stone-600 hover:text-[#D4AF37] transition-colors rounded-lg hover:bg-white/5 shrink-0 text-base"
          aria-label="Chapter overview"
          title="Chapter Overview"
        >
          📋
        </button>

        {/* Chapter navigation — double-chevrons so they look nothing like Back */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => hasPrev && onNavigate(state.book, (chapterNum - 1).toString())}
            disabled={!hasPrev}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 hover:text-white disabled:opacity-20 transition-colors rounded-lg hover:bg-white/5 text-lg font-bold"
            aria-label="Previous chapter"
          >
            «
          </button>
          <button
            onClick={() => hasNext && onNavigate(state.book, (chapterNum + 1).toString())}
            disabled={!hasNext}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 hover:text-white disabled:opacity-20 transition-colors rounded-lg hover:bg-white/5 text-lg font-bold"
            aria-label="Next chapter"
          >
            »
          </button>
        </div>
      </div>

      {/* ── Scripture content ────────────────────────────────────────────────── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 md:px-0 py-10 scroll-smooth">
        <div className="max-w-3xl mx-auto w-full">

          <header className="mb-12 text-center space-y-3">
            <h2 className="accent-font text-4xl md:text-5xl font-bold tracking-[0.1em] gold-gradient-text uppercase">
              {state.book} {state.chapter}
            </h2>
            <p className="text-[10px] uppercase font-bold tracking-[0.4em] text-stone-700">
              Holy Scripture · {translation}
            </p>
          </header>

          {loading && (
            <div className="flex items-center justify-center py-24 gap-3">
              <div className="w-5 h-5 border-t-2 border-[#D4AF37] rounded-full animate-spin" />
              <span className="text-[10px] uppercase tracking-widest text-stone-600 animate-pulse">Loading…</span>
            </div>
          )}

          {error && (
            <div className="text-center py-16 space-y-4">
              <p className="text-stone-500 text-sm">{error}</p>
              <button onClick={loadVerses} className="px-6 py-2 border border-white/10 rounded-xl text-[10px] uppercase tracking-widest text-stone-400 hover:text-white transition-colors">
                Retry
              </button>
            </div>
          )}

          <div className="space-y-0 relative">
            {content.map((v, idx) => {
              const hColor = getVerseHighlight(v.number);
              return (
                <div
                  key={v.number}
                  onClick={() => handleVerseClick(v.number)}
                  className={`group/verse relative flex gap-5 px-3 py-5 cursor-pointer transition-all rounded-lg ${
                    selectedVerse === v.number ? 'bg-[#D4AF37]/10' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <span className="text-[10px] font-bold text-stone-600 w-5 shrink-0 pt-1 leading-none">{v.number}</span>
                  <p
                    style={{
                      fontSize: `${settings.fontSize}px`,
                      lineHeight: settings.lineHeight,
                      backgroundColor: hColor || 'transparent'
                    }}
                    className={`bible-font text-stone-200 flex-1 ${
                      idx === 0 && state.chapter === '1' ? 'drop-cap' : ''
                    } ${hColor ? 'px-2 py-0.5 rounded' : ''}`}
                  >
                    {v.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Bottom chapter navigation */}
          {content.length > 0 && (
            <div className="flex items-center justify-between mt-14 pt-8 border-t border-white/5 gap-4">
              <button
                onClick={() => hasPrev && onNavigate(state.book, (chapterNum - 1).toString())}
                disabled={!hasPrev}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-white hover:border-white/20 disabled:opacity-20 transition-all min-h-[44px]"
              >
                « Prev Chapter
              </button>
              <button
                onClick={() => onStudyChapter?.(AppMode.CHAPTER_OVERVIEW)}
                className="px-5 py-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all min-h-[44px]"
              >
                📋 Chapter Overview
              </button>
              <button
                onClick={() => hasNext && onNavigate(state.book, (chapterNum + 1).toString())}
                disabled={!hasNext}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-white hover:border-white/20 disabled:opacity-20 transition-all min-h-[44px]"
              >
                Next Chapter »
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Verse Tool Menu ──────────────────────────────────────────────────── */}
      {selectedVerse && (
        <div className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-6">
          <div className="max-w-xl mx-auto glass-dark border border-[#D4AF37]/30 rounded-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.6)] flex flex-col" style={{ maxHeight: '75vh' }}>

            {/* Pinned header */}
            <header className="flex justify-between items-center border-b border-white/5 px-5 pt-5 pb-3 shrink-0">
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.3em]">
                {state.book} {state.chapter}:{selectedVerse}
              </span>
              <button
                onClick={closeVerseMenu}
                className="text-stone-600 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
              >
                ✕
              </button>
            </header>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 pb-5">
            {showNoteInput ? (
              <div className="space-y-3 pt-5">
                <textarea
                  autoFocus
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder="Write your reflection on this verse…"
                  rows={3}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-stone-200 bible-font text-base resize-none leading-relaxed"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowNoteInput(false); setNoteInput(''); }}
                    className="flex-1 min-h-[44px] border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveNote}
                    className="flex-1 min-h-[44px] bg-[#D4AF37] rounded-xl text-[10px] font-bold uppercase tracking-widest text-black hover:opacity-90 transition-opacity"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-5 space-y-5">
                <div className="grid grid-cols-5 gap-2">
                  {[
                    {
                      icon: '📋', label: 'Copy',
                      action: () => {
                        navigator.clipboard.writeText(
                          `${state.book} ${state.chapter}:${selectedVerse} — ${content.find(v => v.number === selectedVerse)?.text}`
                        );
                        closeVerseMenu();
                      }
                    },
                    {
                      icon: '🔖', label: 'Bookmark',
                      action: () => {
                        storage.addBookmark({ book: state.book, chapter: state.chapter, verse: selectedVerse!, timestamp: Date.now() });
                        closeVerseMenu();
                      }
                    },
                    {
                      icon: '🖍️', label: 'Highlight',
                      action: () => applyHighlight('#D4AF3733')
                    },
                    {
                      icon: '📝', label: 'Note',
                      action: () => setShowNoteInput(true)
                    },
                    {
                      icon: '🖼️', label: 'Card',
                      action: () => {
                        const verse = content.find(v => v.number === selectedVerse);
                        if (!verse) return;
                        const scale = 2;
                        const W = 800, H = 450;
                        const canvas = document.createElement('canvas');
                        canvas.width = W * scale;
                        canvas.height = H * scale;
                        const ctx = canvas.getContext('2d')!;
                        ctx.scale(scale, scale);

                        // Background
                        const grad = ctx.createLinearGradient(0, 0, 0, H);
                        grad.addColorStop(0, '#111111');
                        grad.addColorStop(1, '#000000');
                        ctx.fillStyle = grad;
                        ctx.fillRect(0, 0, W, H);

                        // Gold border
                        ctx.strokeStyle = 'rgba(212,175,55,0.5)';
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(20, 20, W - 40, H - 40);

                        // Subtle cross watermark
                        ctx.fillStyle = 'rgba(212,175,55,0.06)';
                        ctx.font = '160px serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('✝', W / 2, H / 2);

                        // Verse text with word wrap
                        ctx.fillStyle = '#e7e5e4';
                        ctx.font = 'italic 22px Georgia, serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'alphabetic';
                        const maxW = W - 120;
                        const words = verse.text.trim().split(' ');
                        const lines: string[] = [];
                        let line = '';
                        for (const word of words) {
                          const test = line ? `${line} ${word}` : word;
                          if (ctx.measureText(test).width > maxW) {
                            lines.push(line);
                            line = word;
                          } else {
                            line = test;
                          }
                        }
                        if (line) lines.push(line);
                        if (lines.length > 0) {
                          lines[0] = `“${lines[0]}`;
                          lines[lines.length - 1] = `${lines[lines.length - 1]}”`;
                        }

                        const lh = 36;
                        const totalH = lines.length * lh;
                        const startY = H / 2 - totalH / 2 + 10;
                        lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lh));

                        // Reference
                        ctx.fillStyle = '#D4AF37';
                        ctx.font = 'bold 15px Georgia, serif';
                        ctx.fillText(`— ${state.book} ${state.chapter}:${selectedVerse} (${translation})`, W / 2, startY + totalH + 28);

                        // Branding
                        ctx.fillStyle = 'rgba(212,175,55,0.35)';
                        ctx.font = '11px sans-serif';
                        ctx.fillText('Holy Bible GPT · HolyBibleGPT.com', W / 2, H - 28);

                        const link = document.createElement('a');
                        link.download = `${state.book}-${state.chapter}-${selectedVerse}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                        closeVerseMenu();
                      }
                    }
                  ].map(({ icon, label, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="flex flex-col items-center gap-2 p-3 min-h-[60px] rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
                      <span className="text-[8px] font-bold text-stone-500 uppercase tracking-widest">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/5" />

                {/* Three AI mode actions */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Study', icon: '✨', mode: AppMode.THEOLOGIAN, desc: 'Deep study' },
                    { label: 'Pray', icon: '🙏', mode: AppMode.PRAYER_HELP, desc: 'Write a prayer' },
                    { label: 'Context', icon: '🏛️', mode: AppMode.CONTEXT, desc: 'Historical background' },
                  ].map(({ label, icon, mode }) => (
                    <button
                      key={label}
                      onClick={() => { onStudyVerse?.(mode, selectedVerse!); closeVerseMenu(); }}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 bg-stone-950/60 border border-white/5 rounded-xl hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition-all min-h-[56px] group"
                    >
                      <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
                      <span className="text-[8px] font-bold text-stone-500 uppercase tracking-wider group-hover:text-[#D4AF37] transition-colors">{label}</span>
                    </button>
                  ))}
                </div>

                <CrossReferencePanel
                  book={state.book}
                  chapter={state.chapter}
                  verse={selectedVerse}
                  translation={translation}
                  onOpenVerse={(b, c, v) => { onNavigate(b, c); closeVerseMenu(); }}
                />
              </div>
            )}
            </div>{/* end scrollable body */}
          </div>
        </div>
      )}
    </div>
  );
};

export default BibleReader;
