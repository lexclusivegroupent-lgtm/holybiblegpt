
import React from 'react';

const RoadmapView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-12">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Coming Features</h2>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mx-auto" />
      </header>

      <section className="glass-dark border border-white/5 p-10 rounded-[2.5rem] space-y-8 shadow-2xl text-center">
        <h3 className="text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-4">Future Plans</h3>
        <ul className="space-y-6 text-sm text-stone-300 font-bold uppercase tracking-widest">
          <li>Audio Bible</li>
          <li>Offline study tools</li>
          <li>Children study mode</li>
          <li>Themed reading plans</li>
          <li>Group study support</li>
        </ul>
      </section>
    </div>
  );
};

export default RoadmapView;
