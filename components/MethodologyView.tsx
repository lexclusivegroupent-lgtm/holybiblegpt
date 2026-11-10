import React from 'react';

const MethodologyView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-8 text-sm text-stone-300 leading-relaxed">
      <header className="text-center space-y-4">
        <h1 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">How answers are made</h1>
      </header>
      <section className="glass-dark border border-white/5 p-8 rounded-[2rem] space-y-4">
        <p>Scripture is the authority. The study aid is an assistant. It does not replace a pastor, a church, or your own reading.</p>
        <p>Before an answer, the app looks up passage text. If you name a verse, it fetches that verse. If you name a topic such as fear or prayer, it fetches a short list of real passages and says that list is not exhaustive. If a chapter is open, it fetches the start of that chapter. The words come from the King James Version or the World English Bible, which are public domain.</p>
        <p>A quotation and an explanation are separate. The quotation is supposed to be the retrieved text, with the reference and the translation. The explanation is the assistant's words. An explanation is not a verse.</p>
        <p>Where Christians disagree, the assistant is instructed to name the main views and the verses each view uses, and not to treat one tradition's opinion as the explicit statement of the text.</p>
        <p className="text-stone-500 text-xs">[Owner: add any confessional statement you want this page to carry. Do not put it here until you have approved the wording.]</p>
      </section>
    </div>
  );
};

export default MethodologyView;
