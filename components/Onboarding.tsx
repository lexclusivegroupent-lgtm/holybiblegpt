
import React, { useState } from 'react';

interface OnboardingProps {
  onAccept: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onAccept }) => {
  const [step, setStep] = useState(0);

  const screens = [
    {
      icon: '✝️',
      title: 'Holy Bible GPT',
      desc: 'A Scripture-first study companion for daily Bible reading and growth. God\'s Word is the final authority — this tool helps you understand it, never replaces it.',
    },
    {
      icon: '📖',
      title: 'Read & Explore',
      desc: 'Open any chapter, tap a verse to highlight or bookmark it, and ask the free AI to explain, cross-reference, or apply it to your life.',
    },
    {
      icon: '🌱',
      title: 'Grow Daily',
      desc: 'Track your reading, save prayer notes, and let Scripture shape your day. No subscriptions. No limits. Just God\'s Word.',
    },
    {
      icon: '⚠️',
      title: 'A Note on AI',
      desc: 'This AI is a study aid, not a pastor, priest, or spiritual authority. It can make mistakes. Always verify what you read here against your Bible, pray for discernment, and seek your local church community.',
      note: 'The Holy Spirit guides believers — not an app.',
    },
  ];

  const handleNext = () => {
    if (step < screens.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('hbgpt_onboarding_accepted', 'true');
      onAccept();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hbgpt_onboarding_accepted', 'true');
    onAccept();
  };

  const current = screens[step];
  const isLastStep = step === screens.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-sm glass-dark border border-[#D4AF37]/30 rounded-[2.5rem] px-8 py-10 space-y-8 shadow-2xl flex flex-col items-center text-center">

        {/* Skip */}
        {!isLastStep && (
          <button
            onClick={handleSkip}
            className="absolute top-5 right-6 text-[9px] font-bold text-stone-600 uppercase tracking-widest hover:text-stone-400 transition-colors"
          >
            Skip
          </button>
        )}

        {/* Icon */}
        <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center border shadow-2xl ${
          isLastStep
            ? 'bg-stone-950 border-[#D4AF37]/20'
            : 'bg-stone-900 border-white/10'
        }`}>
          <span className="text-4xl" aria-hidden="true">{current.icon}</span>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h2 className="accent-font text-2xl font-bold gold-gradient-text uppercase tracking-widest">{current.title}</h2>
          <p className="text-stone-400 text-base leading-relaxed">
            {current.desc}
          </p>
          {current.note && (
            <p className="text-[10px] text-[#D4AF37]/70 italic border-t border-white/5 pt-3 mt-3">
              "{current.note}"
            </p>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {screens.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-[#D4AF37]' : 'w-2 bg-stone-800'
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleNext}
          className={`w-full font-bold py-4 rounded-2xl uppercase tracking-widest text-[11px] shadow-xl hover:opacity-95 active:scale-95 transition-all ${
            isLastStep
              ? 'bg-[#D4AF37] text-black'
              : 'bg-[#D4AF37] text-black'
          }`}
        >
          {isLastStep ? 'I Understand — Begin Reading' : 'Continue'}
        </button>

        {isLastStep && (
          <p className="text-[9px] text-stone-700 uppercase tracking-widest -mt-4">
            Scripture first · Always
          </p>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
