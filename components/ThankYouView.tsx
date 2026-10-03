
import React from 'react';

const ThankYouView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-12">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Thank You</h2>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mx-auto" />
      </header>

      <section className="glass-dark border border-white/5 p-10 rounded-[2.5rem] space-y-10 shadow-2xl text-center">
        <ul className="space-y-6 text-sm text-stone-300 font-bold uppercase tracking-widest">
          <li>Thank you for using this app</li>
          <li>Thank you for praying for this project</li>
          <li>Your support helps keep this mission alive</li>
        </ul>

        <div className="pt-8 border-t border-white/5">
          <a href="https://thechristiansdeck.com" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] hover:text-[#F9E3A5] transition-all">
            POWERED BY THE CHRISTIAN’S DECK
          </a>
        </div>
      </section>
    </div>
  );
};

export default ThankYouView;
