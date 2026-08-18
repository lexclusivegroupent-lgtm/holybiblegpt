
import React, { useState } from 'react';
import { storage } from '../services/storageService';
import { Translation, AppTab } from '../types';

interface HomeViewProps {
  onOpenPassage: (book: string, chapter: string, verse?: string) => void;
  onTabChange: (tab: AppTab) => void;
  translation: Translation;
}

// Parse "Book Chapter:Verse" reliably including numbered books like "1 Corinthians 13:4"
const parseVerseRef = (ref: string) => {
  const match = ref.match(/^((?:\d\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+)$/);
  if (!match) return { book: ref.split(' ')[0], chapter: '1', verse: '' };
  return { book: match[1].trim(), chapter: match[2], verse: match[3] };
};

const HomeView: React.FC<HomeViewProps> = ({ onOpenPassage, onTabChange, translation }) => {
  const settings = storage.getSettings();
  const today = new Date().toLocaleDateString();
  const [completed, setCompleted] = useState(storage.getProgress().includes(today));
  const streak = storage.getStreak();

  const encouragements = [
    { ref: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me.", focus: "Strength" },
    { ref: "Joshua 1:9", text: "Be strong and of a good courage; be not afraid, neither be thou dismayed.", focus: "Courage" },
    { ref: "Matthew 11:28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.", focus: "Rest" },
    { ref: "Romans 8:28", text: "And we know that all things work together for good to them that love God.", focus: "Trust" },
    { ref: "Psalm 23:1", text: "The LORD is my shepherd; I shall not want.", focus: "Peace" },
    { ref: "Isaiah 40:31", text: "They that wait upon the LORD shall renew their strength.", focus: "Endurance" },
    { ref: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son.", focus: "Love" },
  ];

  const dailyVerse = encouragements[new Date().getDate() % encouragements.length];

  const handleComplete = () => {
    storage.markDayComplete(today);
    setCompleted(true);
  };

  const handleResume = () => {
    if (settings.lastRead) {
      onOpenPassage(settings.lastRead.book, settings.lastRead.chapter, settings.lastRead.verse.toString());
    } else {
      onOpenPassage("John", "1");
    }
  };

  const { book, chapter, verse } = parseVerseRef(dailyVerse.ref);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 lg:py-12 max-w-4xl mx-auto w-full space-y-8 pb-28">

      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
        <div className="space-y-1">
          <h2 className="accent-font text-2xl font-bold gold-gradient-text uppercase tracking-widest leading-none">My Walk</h2>
          <p className="text-[10px] text-stone-600 uppercase tracking-[0.3em]">Daily Discipleship</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#D4AF37]/5 px-4 py-3 rounded-2xl border border-[#D4AF37]/20">
            <span className="text-xl">🔥</span>
            <div>
              <p className="text-[8px] font-bold text-[#D4AF37] uppercase tracking-widest leading-none">Streak</p>
              <p className="text-lg font-bold text-stone-200 leading-none mt-1">{streak} Days</p>
            </div>
          </div>
        </div>
      </header>

      {/* Daily Focus Card */}
      <section className="glass-dark border border-white/5 rounded-[2rem] p-7 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 text-[9rem] accent-font opacity-[0.03] pointer-events-none select-none">
          {dailyVerse.focus[0]}
        </div>
        <div className="relative space-y-6">
          <div className="flex items-center gap-4">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <span className="text-[#D4AF37] text-[9px] font-bold uppercase tracking-[0.4em]">Today · {dailyVerse.focus}</span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>
          <p className="bible-font text-2xl md:text-4xl text-stone-100 leading-[1.2] italic font-light">
            "{dailyVerse.text}"
          </p>
          <div className="flex items-center justify-between pt-5 border-t border-white/5">
            <span className="text-[10px] font-bold text-stone-600 tracking-[0.2em] uppercase">— {dailyVerse.ref}</span>
            <button
              onClick={() => onOpenPassage(book, chapter, verse)}
              className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest hover:text-white transition-colors py-2 px-3 bg-white/5 rounded-lg border border-white/5 min-h-[36px]"
            >
              Read Chapter →
            </button>
          </div>
        </div>
      </section>

      {/* Resume Reading */}
      <button
        onClick={handleResume}
        className="w-full flex items-center justify-between gap-6 glass-dark border border-white/10 px-7 py-6 rounded-[2rem] hover:border-[#D4AF37]/40 transition-all duration-500 text-left group shadow-[0_15px_40px_rgba(0,0,0,0.4)] relative overflow-hidden min-h-[88px]"
      >
        <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-[#D4AF37]/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shrink-0">
            📖
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-stone-500 uppercase tracking-[0.3em]">Continue Reading</p>
            <p className="text-xl font-bold text-stone-100 leading-tight">
              {settings.lastRead
                ? `${settings.lastRead.book} ${settings.lastRead.chapter}:${settings.lastRead.verse}`
                : 'Open the Sacred Word'}
            </p>
          </div>
        </div>
        <span className="text-2xl text-stone-700 group-hover:text-[#D4AF37] group-hover:translate-x-2 transition-all shrink-0">→</span>
      </button>

      {/* Quick Access Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { id: 'study', label: 'Study with AI', icon: '✨' },
          { id: 'prayer', label: 'Petitions', icon: '🙏' },
          { id: 'learn', label: 'Timeline', icon: '📜' },
          { id: 'kids', label: 'Kids Mode', icon: '🎨' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as AppTab)}
            className="flex flex-col items-center gap-3 py-7 px-4 glass-dark border border-white/5 rounded-[1.5rem] hover:bg-white/5 hover:border-[#D4AF37]/30 transition-all duration-300 group min-h-[100px]"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
            <span className="text-[9px] font-bold text-stone-600 uppercase tracking-[0.25em] group-hover:text-[#D4AF37] transition-colors text-center leading-tight">{item.label}</span>
          </button>
        ))}
      </section>

      {/* Daily Reading Goal */}
      <section>
        <div className={`p-7 rounded-[2rem] border transition-all duration-500 flex flex-col sm:flex-row items-center justify-between gap-5 ${
          completed
            ? 'bg-emerald-950/10 border-emerald-900/40'
            : 'glass-dark border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3)]'
        }`}>
          <div className="space-y-2 text-center sm:text-left">
            <p className={`text-[9px] font-bold uppercase tracking-[0.3em] ${completed ? 'text-emerald-500' : 'text-stone-500'}`}>
              Reading Goal
            </p>
            <p className="text-stone-300 text-base italic font-light bible-font leading-relaxed">
              "Thy word is a lamp unto my feet, and a light unto my path."
            </p>
          </div>
          <button
            onClick={handleComplete}
            disabled={completed}
            className={`px-10 py-4 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all shadow-lg min-h-[48px] shrink-0 ${
              completed
                ? 'text-emerald-500 border border-emerald-500/30 bg-emerald-500/5'
                : 'bg-[#D4AF37] text-black hover:opacity-90 active:scale-95'
            }`}
          >
            {completed ? '✓ Goal Complete' : 'Mark Complete'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default HomeView;
