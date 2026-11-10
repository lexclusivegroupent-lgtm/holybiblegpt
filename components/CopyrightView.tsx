import React from 'react';

const CopyrightView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-8 text-sm text-stone-300 leading-relaxed">
      <header className="text-center space-y-4">
        <h1 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Translation copyright</h1>
      </header>
      <section className="glass-dark border border-white/5 p-8 rounded-[2rem] space-y-4">
        <p>The King James Version text on this site is in the public domain. The label on those pages is KJV.</p>
        <p>The World English Bible is in the public domain. When that translation is selected, the reader requests WEB text and the label is WEB. This page does not add a separate acknowledgement.</p>
        <p>The English Standard Version is not shown. Crossway's license and the notice they require are not in place. This site does not present King James text as the ESV. If that translation is offered later, its required notice will be added on this page and wherever that text appears.</p>
        <p>By The Christian's Deck</p>
      </section>
    </div>
  );
};

export default CopyrightView;
