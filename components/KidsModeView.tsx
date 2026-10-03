
import React, { useState } from 'react';

interface Story {
  title: string;
  book: string;
  chapter: string;
  icon: string;
  summary: string;
  question: string;
}

interface KidsModeViewProps {
  onOpenPassage: (book: string, chapter: string) => void;
}

const KidsModeView: React.FC<KidsModeViewProps> = ({ onOpenPassage }) => {
  const [acceptedNotice, setAcceptedNotice] = useState(false);

  const stories: Story[] = [
    { title: "Creation", book: "Genesis", chapter: "1", icon: "🌎", summary: "God made the whole beautiful world and everything in it in six days!", question: "What is your favorite thing God made?" },
    { title: "Noah's Ark", book: "Genesis", chapter: "6", icon: "🌈", summary: "God saved Noah and his family and two of every animal from a big flood.", question: "How many animals can you name?" },
    { title: "Moses", book: "Exodus", chapter: "2", icon: "🌊", summary: "Moses led God's people to freedom and God showed him great wonders.", question: "Would you like to see a sea part in two?" },
    { title: "David", book: "1 Samuel", chapter: "17", icon: "⚔️", summary: "A young shepherd boy named David beat a giant because he trusted God.", question: "Who helps you feel brave?" },
    { title: "Jesus", book: "Matthew", chapter: "1", icon: "✨", summary: "Jesus is God's Son who came to earth to show us how much He loves us.", question: "How can we show love to others today?" }
  ];

  if (!acceptedNotice) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-black">
        <div className="glass-dark border border-[#D4AF37]/30 p-10 rounded-[3rem] max-w-md text-center space-y-8 animate-in zoom-in-95 duration-500 shadow-2xl">
          <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto text-4xl mb-4 border border-[#D4AF37]/20">👨‍👩‍👧‍👦</div>
          <h2 className="accent-font text-2xl font-bold gold-gradient-text uppercase tracking-widest">Parent Notice</h2>
          <p className="text-stone-300 text-sm leading-relaxed italic">
            “Parents guide children. Scripture leads the home. The app supports learning.”
          </p>
          <button 
            onClick={() => setAcceptedNotice(true)}
            className="w-full bg-[#D4AF37] text-black font-bold py-5 rounded-2xl uppercase tracking-widest text-xs hover:scale-[1.02] transition-all shadow-xl active:scale-95"
          >
            Enter Kids Mode
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-4xl mx-auto w-full space-y-16">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-4xl font-bold gold-gradient-text uppercase tracking-widest">Kids Mode</h2>
        <p className="text-[10px] text-stone-600 uppercase tracking-[0.4em]">Simple Stories • Big Truths</p>
      </header>

      <div className="grid gap-8">
        {stories.map((s, i) => (
          <section key={i} className="glass-dark border border-white/5 p-8 rounded-[2.5rem] flex flex-col md:flex-row gap-8 items-center group hover:border-[#D4AF37]/40 transition-all shadow-2xl">
            <div className="w-24 h-24 shrink-0 bg-stone-900 rounded-3xl flex items-center justify-center text-5xl shadow-inner border border-white/10 group-hover:scale-110 transition-transform">
              {s.icon}
            </div>
            <div className="space-y-4 text-center md:text-left">
              <h3 className="accent-font text-2xl font-bold text-stone-100 uppercase tracking-widest">{s.title}</h3>
              <p className="bible-font text-2xl text-stone-300 leading-relaxed font-light">{s.summary}</p>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Gentle Question</p>
                <p className="text-sm text-[#D4AF37] font-medium italic">{s.question}</p>
              </div>
              <button 
                onClick={() => onOpenPassage(s.book, s.chapter)}
                className="inline-flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] hover:text-[#D4AF37] transition-colors"
              >
                📖 Read the story in {s.book} {s.chapter} →
              </button>
            </div>
          </section>
        ))}
      </div>

      <footer className="pt-12 text-center">
        <p className="text-[9px] text-stone-700 uppercase tracking-widest">Focused on Reading, Prayer, and Unity.</p>
      </footer>
    </div>
  );
};

export default KidsModeView;
