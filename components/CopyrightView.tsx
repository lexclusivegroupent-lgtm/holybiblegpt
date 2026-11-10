import React from 'react';

const CopyrightView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-8 text-sm text-stone-300 leading-relaxed">
      <header className="text-center space-y-4">
        <h1 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Translation copyright</h1>
      </header>
      <section className="glass-dark border border-white/5 p-8 rounded-[2rem] space-y-4">
        <p>The King James Version text on this site is in the public domain. The label on those pages is KJV.</p>
        <p>The World English Bible is in the public domain. When that translation is selected, the reader requests WEB text and the label is WEB. [Owner: if you want the World English Bible's customary acknowledgement printed in full, paste the notice you approve.]</p>
        <p>The English Standard Version is not shown. Crossway's license and the notice they require are not in place. This site does not present King James text as the ESV.</p>
        <p className="text-stone-500 text-xs">[Owner: if you license the ESV later, paste Crossway's required notice here and show it wherever ESV text appears. Do not enable the translation until that notice is on the page.]</p>
      </section>
    </div>
  );
};

export default CopyrightView;
