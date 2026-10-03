
import React from 'react';

const PrivacyView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-12">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Privacy Policy</h2>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mx-auto" />
      </header>

      <section className="glass-dark border border-white/5 p-10 rounded-[2.5rem] space-y-8 shadow-2xl">
        <div className="space-y-6 text-stone-300 leading-relaxed text-sm">
          <p className="font-bold text-[#D4AF37] uppercase tracking-widest text-center mb-4">Clear. Honest. Simple.</p>
          
          <p>
            We respect your privacy. We do not sell your data. We do not trade it. We do not collect more than we need. We store only what is needed to run bookmarks, notes, reading plans, and settings.
          </p>
          
          <div className="grid gap-8 pt-4 border-t border-white/5">
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">What saves on your device:</h4>
              <ul className="text-xs text-stone-400 space-y-2">
                <li className="flex gap-2"><span>•</span> <span>Reading progress</span></li>
                <li className="flex gap-2"><span>•</span> <span>Bookmarks</span></li>
                <li className="flex gap-2"><span>•</span> <span>Notes</span></li>
                <li className="flex gap-2"><span>•</span> <span>Highlights</span></li>
                <li className="flex gap-2"><span>•</span> <span>Install settings</span></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">What may save on our systems:</h4>
              <ul className="text-xs text-stone-400 space-y-2">
                <li className="flex gap-2"><span>•</span> <span>Anonymous usage stats</span></li>
                <li className="flex gap-2"><span>•</span> <span>Error logs to fix bugs</span></li>
                <li className="flex gap-2"><span>•</span> <span>AI questions, without personal identity</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 space-y-4 border-t border-white/5">
            <h4 className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">About AI & Safety</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              When you ask a question, the text goes to our AI provider so the answer can be generated. Do not share personal, financial, medical, or private life details here. Use this app for prayer and study only.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-stone-600 uppercase tracking-widest mb-2">Need to delete your data?</p>
          <a 
            href="mailto:thechristiansdeck@gmail.com" 
            className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest hover:underline"
          >
            Request data removal: thechristiansdeck@gmail.com
          </a>
        </div>
      </section>

      <div className="text-center py-8 opacity-20">
        <p className="text-[9px] uppercase tracking-[0.5em] text-stone-600">Sacred Trust • Study Faithfully</p>
      </div>
    </div>
  );
};

export default PrivacyView;
