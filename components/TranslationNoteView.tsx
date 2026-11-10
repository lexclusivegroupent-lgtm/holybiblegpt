import React from 'react';

const TranslationNoteView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-12">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">About Bible Translations</h2>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mx-auto" />
      </header>

      <section className="glass-dark border border-white/5 p-10 rounded-[2.5rem] space-y-8 shadow-2xl text-sm text-stone-300 leading-relaxed">
        <p>
          The label on a passage is the translation of the words on the screen. This site does not show one translation under another translation's name.
        </p>
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">King James Version</h3>
          <p>The King James Version is the default. It is in the public domain. The reader uses that text, and the verse of the day quotes it in full.</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">World English Bible</h3>
          <p>The World English Bible is a public-domain translation. When it is selected, the reader requests WEB text and the study aid is told to quote WEB, not to treat it as the ESV.</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">English Standard Version</h3>
          <p>
            The English Standard Version is not offered. Showing it would require a license from Crossway and their copyright notice. Until that is in place, ESV is not a choice in the reader, and King James text is not labeled ESV.
          </p>
          <p className="text-xs text-stone-500">
            [Owner: if you later add a Crossway API key, turn the notice back on in the ESV proxy and only then return ESV to the translation list.]
          </p>
        </div>
        <p className="text-xs text-stone-500">
          Readers in other traditions may use other translations. This page does not treat one tradition's preferred edition as the only Bible.
        </p>
      </section>
    </div>
  );
};

export default TranslationNoteView;
