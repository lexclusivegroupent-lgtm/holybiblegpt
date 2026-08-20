
import React, { useState } from 'react';
import { storage } from '../services/storageService';
import { AppTab } from '../types';

interface NotesViewProps {
  onOpenPassage: (book: string, chapter: string, verse?: string) => void;
  onTabChange: (tab: AppTab) => void;
}

// ref format: "${book}-${chapter}-${verse}" — book names don't contain hyphens
const parseRef = (ref: string) => {
  const parts = ref.split('-');
  const verse = parts[parts.length - 1];
  const chapter = parts[parts.length - 2];
  const book = parts.slice(0, parts.length - 2).join(' ');
  return { book, chapter, verse };
};

const NotesView: React.FC<NotesViewProps> = ({ onOpenPassage, onTabChange }) => {
  const [notes, setNotes] = useState<Record<string, string>>(storage.getNotes());

  const entries = Object.entries(notes).filter(([, text]) => text.trim());

  const handleDelete = (ref: string) => {
    storage.deleteNote(ref);
    setNotes(storage.getNotes());
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-10 pb-28">
      <header className="text-center">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">My Notes</h2>
        <p className="text-[10px] text-stone-700 uppercase tracking-[0.4em] mt-2">Personal Reflections</p>
      </header>

      {entries.length === 0 ? (
        <div className="text-center py-32 space-y-6">
          <div className="text-6xl opacity-10">📝</div>
          <p className="text-stone-600 italic text-sm">No notes yet.</p>
          <p className="text-[10px] text-stone-700 uppercase tracking-widest">
            Tap any verse in the Reader, then choose Note to write your reflection.
          </p>
          <button
            onClick={() => onTabChange('read')}
            className="px-8 py-3 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all"
          >
            Open Reader →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(([ref, text]) => {
            const { book, chapter, verse } = parseRef(ref);
            return (
              <div key={ref} className="glass-dark border border-white/5 p-7 rounded-[2rem] space-y-4 group hover:border-white/10 transition-colors">
                <div className="flex justify-between items-start">
                  <button
                    onClick={() => onOpenPassage(book, chapter, verse)}
                    className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest hover:text-white transition-colors text-left"
                  >
                    {book} {chapter}:{verse} →
                  </button>
                  <button
                    onClick={() => handleDelete(ref)}
                    className="text-stone-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    aria-label="Delete note"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-stone-300 text-sm leading-relaxed whitespace-pre-wrap bible-font italic">{text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotesView;
