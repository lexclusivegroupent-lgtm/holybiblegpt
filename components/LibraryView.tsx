
import React, { useState } from 'react';
import { storage } from '../services/storageService';
import { AppTab } from '../types';

interface LibraryViewProps {
  onOpenPassage: (book: string, chapter: string, verse?: string) => void;
  onTabChange?: (tab: AppTab) => void;
}

// ref format: "${book}-${chapter}-${verse}"  e.g. "Genesis-1-1", "1 Corinthians-13-4"
const parseRef = (ref: string): { book: string; chapter: string; verse: string } => {
  const parts = ref.split('-');
  const verse = parts[parts.length - 1];
  const chapter = parts[parts.length - 2];
  const book = parts.slice(0, parts.length - 2).join(' ');
  return { book, chapter, verse };
};

const displayRef = (ref: string): string => {
  const { book, chapter, verse } = parseRef(ref);
  return `${book} ${chapter}:${verse}`;
};

const HIGHLIGHT_LABELS: Record<string, string> = {
  '#D4AF3733': 'Gold',
  '#3b82f633': 'Blue',
  '#22c55e33': 'Green',
  '#f9731633': 'Amber',
  '#a855f733': 'Purple',
};

type SubTab = 'bookmarks' | 'highlights' | 'notes' | 'history';

const LibraryView: React.FC<LibraryViewProps> = ({ onOpenPassage, onTabChange }) => {
  const [activeSub, setActiveSub] = useState<SubTab>('bookmarks');
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>(storage.getNotes());

  const bookmarks = storage.getBookmarks();
  const highlights = storage.getHighlights();
  const history = storage.getHistory();

  const noteEntries = Object.entries(notes).filter(([, t]) => t.trim());

  const handleEditStart = (ref: string, text: string) => {
    setEditingRef(ref);
    setEditText(text);
  };

  const handleEditSave = () => {
    if (!editingRef) return;
    if (editText.trim()) {
      storage.saveNote(editingRef, editText.trim());
    } else {
      storage.deleteNote(editingRef);
    }
    setNotes(storage.getNotes());
    setEditingRef(null);
    setEditText('');
  };

  const handleDeleteNote = (ref: string) => {
    storage.deleteNote(ref);
    setNotes(storage.getNotes());
  };

  const handleExportNotes = () => {
    if (noteEntries.length === 0) return;
    let content = 'Holy Bible GPT — My Spiritual Journal\n====================================\n\n';
    noteEntries.forEach(([ref, text]) => {
      content += `${displayRef(ref)}\n${text}\n\n----\n\n`;
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    link.download = `HolyBibleGPT_Notes_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  const tabs: { id: SubTab; label: string; count?: number }[] = [
    { id: 'bookmarks',  label: 'Bookmarks',  count: bookmarks.length },
    { id: 'highlights', label: 'Highlights', count: highlights.length },
    { id: 'notes',      label: 'Notes',      count: noteEntries.length },
    { id: 'history',    label: 'History',    count: history.length },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-5 py-10 max-w-3xl mx-auto w-full space-y-8 pb-32">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="accent-font text-2xl font-bold gold-gradient-text uppercase tracking-widest">My Library</h2>
          <p className="text-[10px] text-stone-600 uppercase tracking-[0.3em] mt-1">Saved Grace & Wisdom</p>
        </div>
        {activeSub === 'notes' && noteEntries.length > 0 && (
          <button
            onClick={handleExportNotes}
            className="px-4 py-2 bg-stone-900 border border-[#D4AF37]/20 text-[#D4AF37] text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#D4AF37]/10 transition-all min-h-[36px]"
          >
            Export Notes
          </button>
        )}
      </header>

      {/* Sub-tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-1 p-1 bg-stone-900/40 rounded-2xl border border-white/5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSub(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all min-h-[36px] ${
              activeSub === tab.id
                ? 'bg-white/10 text-white shadow'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                activeSub === tab.id ? 'bg-[#D4AF37] text-black' : 'bg-stone-800 text-stone-500'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Bookmarks */}
      {activeSub === 'bookmarks' && (
        bookmarks.length === 0 ? (
          <EmptyState icon="🔖" text="No bookmarks yet." sub="Tap any verse while reading, then choose Bookmark." onAction={() => onTabChange?.('read')} actionLabel="Open Reader" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {bookmarks.map((b, i) => (
              <button
                key={i}
                onClick={() => onOpenPassage(b.book, b.chapter, b.verse.toString())}
                className="glass-dark border border-white/5 p-6 rounded-2xl text-left hover:border-[#D4AF37]/40 transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">
                    {b.book} {b.chapter}:{b.verse}
                  </span>
                  <span className="text-[9px] text-stone-700">{new Date(b.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="bible-font text-sm text-stone-500 leading-relaxed group-hover:text-stone-300 transition-colors">
                  Tap to read this passage →
                </p>
              </button>
            ))}
          </div>
        )
      )}

      {/* Highlights */}
      {activeSub === 'highlights' && (
        highlights.length === 0 ? (
          <EmptyState icon="🖍️" text="No highlights yet." sub="Tap any verse while reading, then choose Highlight." onAction={() => onTabChange?.('read')} actionLabel="Open Reader" />
        ) : (
          <div className="space-y-3">
            {highlights.map((h, i) => (
              <button
                key={i}
                onClick={() => onOpenPassage(h.book, h.chapter, h.verse.toString())}
                className="w-full flex items-center gap-4 p-5 glass-dark border border-white/5 rounded-2xl text-left hover:border-[#D4AF37]/30 transition-all group"
              >
                <div
                  className="w-3 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: h.color || '#D4AF3733', opacity: 0.8 }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">
                    {h.book} {h.chapter}:{h.verse}
                  </p>
                  <p className="text-[9px] text-stone-600 mt-0.5">
                    {HIGHLIGHT_LABELS[h.color] ?? 'Highlighted'} · {new Date(h.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-stone-700 group-hover:text-[#D4AF37] transition-colors text-sm">→</span>
              </button>
            ))}
          </div>
        )
      )}

      {/* Notes */}
      {activeSub === 'notes' && (
        noteEntries.length === 0 ? (
          <EmptyState icon="📝" text="No notes yet." sub="Tap any verse, choose Note, and write your reflection." onAction={() => onTabChange?.('read')} actionLabel="Open Reader" />
        ) : (
          <div className="space-y-4">
            {noteEntries.map(([ref, text]) => (
              <div key={ref} className="glass-dark border border-white/5 p-6 rounded-2xl space-y-4 group hover:border-white/10 transition-colors">
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => {
                      const { book, chapter, verse } = parseRef(ref);
                      onOpenPassage(book, chapter, verse);
                    }}
                    className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest hover:text-white transition-colors"
                  >
                    {displayRef(ref)} →
                  </button>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditStart(ref, text)}
                      className="text-[9px] font-bold text-stone-500 hover:text-stone-200 transition-colors px-2 py-1 rounded border border-white/5 min-h-[28px]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteNote(ref)}
                      className="text-stone-800 hover:text-red-500 transition-colors px-2 py-1 min-h-[28px]"
                      aria-label="Delete note"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {editingRef === ref ? (
                  <div className="space-y-2">
                    <textarea
                      autoFocus
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-black/40 border border-[#D4AF37]/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-stone-200 bible-font text-base resize-none leading-relaxed"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingRef(null); setEditText(''); }}
                        className="flex-1 min-h-[36px] border border-white/10 rounded-xl text-[9px] font-bold uppercase tracking-widest text-stone-500 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEditSave}
                        className="flex-1 min-h-[36px] bg-[#D4AF37] rounded-xl text-[9px] font-bold uppercase tracking-widest text-black"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-stone-300 text-sm italic leading-relaxed whitespace-pre-wrap bible-font">{text}</p>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* History */}
      {activeSub === 'history' && (
        history.length === 0 ? (
          <EmptyState icon="📜" text="No reading history yet." sub="Your recently read chapters will appear here." />
        ) : (
          <div className="space-y-1">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => onOpenPassage(h.book, h.chapter)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 rounded-xl border-b border-white/5 last:border-0 transition-colors group"
              >
                <span className="text-stone-300 font-medium group-hover:text-[#D4AF37] transition-colors bible-font">
                  {h.book} {h.chapter}
                </span>
                <span className="text-[9px] text-stone-700 uppercase tracking-widest">
                  {new Date(h.timestamp).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
};

const EmptyState: React.FC<{
  icon: string;
  text: string;
  sub: string;
  onAction?: () => void;
  actionLabel?: string;
}> = ({ icon, text, sub, onAction, actionLabel }) => (
  <div className="text-center py-24 space-y-5">
    <div className="text-6xl opacity-10">{icon}</div>
    <p className="text-stone-500 italic text-sm">{text}</p>
    <p className="text-[10px] text-stone-700 uppercase tracking-widest">{sub}</p>
    {onAction && actionLabel && (
      <button
        onClick={onAction}
        className="mt-2 px-6 py-3 border border-white/10 rounded-xl text-[9px] font-bold uppercase tracking-widest text-stone-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all"
      >
        {actionLabel} →
      </button>
    )}
  </div>
);

export default LibraryView;
