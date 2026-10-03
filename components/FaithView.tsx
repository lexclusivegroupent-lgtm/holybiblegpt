
import React from 'react';

const FaithView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-12">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">What We Believe</h2>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mx-auto" />
      </header>

      <section className="glass-dark border border-white/5 p-10 rounded-[2.5rem] space-y-6 shadow-2xl text-center">
        <ul className="space-y-6 text-sm text-stone-300 font-bold uppercase tracking-widest leading-relaxed">
          <li>The Bible is the Word of God</li>
          <li>God exists as Father, Son, and Holy Spirit</li>
          <li>Jesus Christ is Lord</li>
          <li>Jesus died for our sins</li>
          <li>Jesus rose from the dead</li>
          <li>Salvation is by grace through faith in Christ</li>
          <li>The Holy Spirit leads believers into truth</li>
          <li>The Bible has final authority for faith and life</li>
        </ul>
      </section>
    </div>
  );
};

export default FaithView;
