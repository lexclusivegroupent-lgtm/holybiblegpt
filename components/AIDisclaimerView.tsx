
import React from 'react';

const AIDisclaimerView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-12">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Important Note</h2>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mx-auto" />
      </header>

      <section className="glass-dark border border-white/5 p-10 rounded-[2.5rem] space-y-8 shadow-2xl text-center">
        <ul className="space-y-6 text-sm text-stone-300 font-bold uppercase tracking-widest">
          <li>AI helps answer questions</li>
          <li>AI sometimes misunderstands</li>
          <li>The Bible does not change</li>
          <li>Always compare explanations with Scripture</li>
          <li>Pray for wisdom when you study</li>
        </ul>

        <div className="pt-8 border-t border-white/5">
          <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
            If something feels wrong, trust the Bible.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AIDisclaimerView;
