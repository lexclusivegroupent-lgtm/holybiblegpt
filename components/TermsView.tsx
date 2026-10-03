
import React from 'react';

const TermsView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-4xl mx-auto w-full space-y-12 pb-32">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Terms and Disclaimer</h2>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mx-auto" />
      </header>

      <section className="glass-dark border border-white/5 p-10 rounded-[2.5rem] space-y-10 shadow-2xl">
        <div className="space-y-6">
          <p className="text-stone-300 text-sm leading-relaxed">
            By using Holy Bible GPT, you acknowledge and agree to the following terms and disclaimers. 
            This app is a tool designed to support spiritual growth and biblical literacy.
          </p>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Crisis Support</h3>
            <p className="text-xs text-stone-500 leading-relaxed font-bold">
              This app is not for crisis support. If you are in danger or struggling, speak with a trusted person or a local professional.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Educational Purpose</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              This app is for Bible study and education. It does not replace prayer, Bible reading, pastors, or churches.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">No Professional Advice</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              It does not give medical, legal, or financial advice. Use the app at your own discretion and always compare everything with Scripture.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Community Rules</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              There is no place here for hate, abuse, harassment, or attacks. If you submit feedback or testimonies, keep your words respectful and Christlike.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Age Guidance</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              This app is designed for adults and older teens. Users under the age of 13 should use the app only with direct parental supervision.
            </p>
          </div>
        </div>

        <footer className="pt-8 border-t border-white/5">
           <p className="text-[9px] font-bold text-stone-700 uppercase tracking-[0.2em] text-center">
             Study faithfully. Walk humbly.
           </p>
        </footer>
      </section>
    </div>
  );
};

export default TermsView;
