
import React from 'react';
import { AppTab } from '../types';

interface InstructionsViewProps {
  onTabChange?: (tab: AppTab) => void;
}

const InstructionsView: React.FC<InstructionsViewProps> = ({ onTabChange }) => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-16 pb-32">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest leading-tight">Add this app to your phone</h2>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mx-auto" />
        <p className="text-[10px] text-stone-600 uppercase tracking-[0.4em]">Fast access to the Word</p>
      </header>

      {/* iOS Section */}
      <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg">
            <span className="text-xl">🍎</span>
          </div>
          <h3 className="accent-font text-xl font-bold text-stone-100 uppercase tracking-widest">Install on iPhone</h3>
        </div>

        <div className="glass-dark border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
          <ol className="space-y-4">
            {[
              { text: "Open Safari.", icon: "🧭" },
              { text: "Go to the Holy Bible GPT website.", icon: "🌐" },
              { text: "Tap the Share icon.", icon: "📤" },
              { text: "Scroll down.", icon: "↕️" },
              { text: "Tap Add to Home Screen.", icon: "➕" },
              { text: "Edit the name if needed.", icon: "✏️" },
              { text: "Tap Add.", icon: "✅" }
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-4 group">
                <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-stone-600 border border-white/5">{i + 1}</span>
                <span className="text-sm text-stone-300 font-medium group-hover:text-white transition-colors">{step.text}</span>
              </li>
            ))}
          </ol>
          <div className="pt-4 border-t border-white/5">
            <p className="text-[10px] text-stone-600 font-bold uppercase tracking-widest">
              Note: Works only in Safari on iPhone.
            </p>
          </div>
        </div>
      </section>

      {/* Android Section */}
      <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg">
            <span className="text-xl">🤖</span>
          </div>
          <h3 className="accent-font text-xl font-bold text-stone-100 uppercase tracking-widest">Install on Android</h3>
        </div>

        <div className="glass-dark border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
          <ol className="space-y-4">
            {[
              { text: "Open Chrome.", icon: "🌍" },
              { text: "Go to the Holy Bible GPT website.", icon: "🌐" },
              { text: "Tap the three dots in the top right.", icon: "⋮" },
              { text: "Tap Add to Home screen.", icon: "➕" },
              { text: "Edit the name if needed.", icon: "✏️" },
              { text: "Tap Add.", icon: "✅" },
              { text: "Confirm the prompt.", icon: "🆗" }
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-4 group">
                <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-stone-600 border border-white/5">{i + 1}</span>
                <span className="text-sm text-stone-300 font-medium group-hover:text-white transition-colors">{step.text}</span>
              </li>
            ))}
          </ol>
          <div className="pt-4 border-t border-white/5">
            <p className="text-[10px] text-stone-600 font-bold uppercase tracking-widest">
              Tip: If it fails, refresh the page and try again.
            </p>
          </div>
        </div>
      </section>

      {/* Support Section nudge */}
      {onTabChange && (
        <section className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-8 rounded-[2.5rem] text-center space-y-6 shadow-xl">
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Help the Mission</h4>
            <p className="text-sm text-stone-300 italic leading-relaxed">
              “Support helps keep the Bible free for others.”
            </p>
          </div>
          <button 
            onClick={() => onTabChange('support')}
            className="px-10 py-4 bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all shadow-lg active:scale-95"
          >
            Give Support
          </button>
        </section>
      )}

      {/* Bottom Reminder */}
      <footer className="pt-8 text-center space-y-4">
        <div className="h-px w-full bg-white/5 mb-8" />
        <p className="text-sm text-[#D4AF37] font-medium italic leading-relaxed">
          “This creates a shortcut on your phone. It opens like an app.”
        </p>
        <div className="flex items-center justify-center gap-2 pt-4 opacity-30">
          <span className="text-xs font-bold uppercase tracking-[0.4em] text-stone-600">Sacred Access • Everywhere</span>
        </div>
      </footer>
    </div>
  );
};

export default InstructionsView;
