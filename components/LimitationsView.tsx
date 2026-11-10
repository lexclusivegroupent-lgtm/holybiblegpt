import React from 'react';

const LimitationsView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-8 text-sm text-stone-300 leading-relaxed">
      <header className="text-center space-y-4">
        <h1 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Limits of the study aid</h1>
      </header>
      <section className="glass-dark border border-white/5 p-8 rounded-[2rem] space-y-4">
        <p>The study aid can be wrong. It can miss a passage, flatten a disagreement, or sound more certain than the text is.</p>
        <p>It is instructed to quote only text that was retrieved for that question, and to say "I cannot establish that from Scripture" when the retrieved text does not support the claim. It is also instructed not to invent a Hebrew or Greek word or a historical source. Those are instructions, not a guarantee. Nothing in the browser checks the finished paragraph against the text.</p>
        <p>The model runs through your Puter account as gpt-4o-mini. Puter and its model provider see the question.</p>
        <p>If an answer and the passage disagree, trust the passage. Read the chapter, and talk with your pastor or church when the question is one Christians have long disputed.</p>
        <p>By The Christian's Deck</p>
      </section>
    </div>
  );
};

export default LimitationsView;
