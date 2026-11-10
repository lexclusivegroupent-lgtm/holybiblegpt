import React from 'react';

const CorrectionsView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-8 text-sm text-stone-300 leading-relaxed">
      <header className="text-center space-y-4">
        <h1 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Corrections</h1>
      </header>
      <section className="glass-dark border border-white/5 p-8 rounded-[2rem] space-y-4">
        <p>If a verse on the site does not match the translation it names, or an answer adds words the passage does not say, write to thechristiansdeck@gmail.com. Include the reference, the translation label, and the words you saw.</p>
        <p>A quotation should be the full verse from a public-domain text, or it should not be shown as that verse. A partial line needs a partial reference, such as a verse range, and it still must not change the words.</p>
        <p>Reports about the study aid are also welcome from the report button in the reader. A correction to the wording of Scripture is not the same thing as a disagreement about an interpretation. Say which one you are sending.</p>
        <p className="text-stone-500 text-xs">[Owner: name who reviews corrections, and how a confirmed text error is published.]</p>
      </section>
    </div>
  );
};

export default CorrectionsView;
