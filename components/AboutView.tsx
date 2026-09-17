
import React from 'react';

const AboutView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-12 pb-24">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">About</h2>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mx-auto" />
        <p className="text-[10px] text-stone-700 uppercase tracking-[0.4em]">Holy Bible GPT</p>
      </header>

      {/* Mission */}
      <section className="glass-dark border border-white/5 p-10 rounded-[2.5rem] space-y-8 shadow-2xl text-center">
        <p className="bible-font text-xl text-stone-200 leading-relaxed font-light italic">
          "Holy Bible GPT exists to help people read the Bible and grow closer to God. Scripture remains the final authority. The app helps explain. The Bible speaks Truth."
        </p>

        <div className="space-y-6 pt-6 border-t border-white/5">
          <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">Our Mission</h3>
          <ul className="space-y-4 text-sm text-stone-400 font-bold uppercase tracking-widest">
            <li>Help believers read daily</li>
            <li>Help believers understand Scripture</li>
            <li>Help believers love Jesus more</li>
          </ul>
        </div>

        <footer className="pt-8">
          <p className="text-[10px] font-bold text-stone-700 uppercase tracking-[0.4em]">To God be the glory.</p>
        </footer>
      </section>

      {/* What this app is */}
      <section className="glass-dark border border-white/5 p-8 rounded-[2.5rem] space-y-5">
        <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">What Holy Bible GPT Is</h3>
        <ul className="space-y-3">
          {[
            ['📖', 'A Scripture-first study companion'],
            ['🔍', 'A tool to help you explore the Bible\'s meaning'],
            ['🙏', 'A place to write and save personal prayers'],
            ['📝', 'A way to bookmark and annotate verses'],
          ].map(([icon, text]) => (
            <li key={text} className="flex items-start gap-3 text-sm text-stone-400">
              <span className="shrink-0 mt-0.5">{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* What this app is NOT */}
      <section className="glass-dark border border-[#D4AF37]/10 p-8 rounded-[2.5rem] space-y-5">
        <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">What Holy Bible GPT Is Not</h3>
        <ul className="space-y-3">
          {[
            'Not a pastor, priest, or spiritual authority',
            'Not a replacement for your local church',
            'Not a substitute for the Holy Spirit\'s guidance',
            'Not infallible — AI can make mistakes',
            'Not a source of new revelation',
          ].map((text) => (
            <li key={text} className="flex items-start gap-3 text-sm text-stone-500">
              <span className="shrink-0 text-stone-700 mt-0.5">✕</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* AI honesty note */}
      <section className="p-6 rounded-[1.5rem] border border-[#D4AF37]/15 bg-[#D4AF37]/3 space-y-3">
        <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">A Note on AI</h3>
        <p className="text-xs text-stone-400 leading-relaxed">
          The AI assistant is powered by a large language model and can produce errors, incomplete interpretations, or reflect gaps in theological training. <strong className="text-stone-300">Always verify</strong> what you read here against the actual text of Scripture. When in doubt, pray, consult your pastor, and trust the Holy Spirit.
        </p>
        <p className="text-[10px] text-stone-600 italic">
          "Thy word is a lamp unto my feet, and a light unto my path." — Psalm 119:105 (KJV)
        </p>
      </section>
    </div>
  );
};

export default AboutView;
