import React from 'react';
import { giftLinkVisible } from '../services/billingAvailability.mjs';

interface MissionGiftProps {
  giftUrl: string;
}

const MissionGift: React.FC<MissionGiftProps> = ({ giftUrl }) => {
  if (!giftLinkVisible(giftUrl)) return null;

  return (
    <section className="glass-dark border border-white/10 p-8 md:p-10 rounded-[2.5rem] space-y-6">
      <h3 className="text-xs font-bold text-stone-500 uppercase tracking-[0.3em]">Support the mission</h3>
      <p className="text-stone-400 text-sm leading-relaxed">
        Giving is optional and unlocks nothing. HolyBibleGPT is not a registered charity, so gifts are not tax-deductible.
      </p>
      <p className="text-stone-500 text-sm leading-relaxed">
        Suggested amounts are $5, $10, and $25. The payment page sets the amount.
      </p>
      <a
        href={giftUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center font-bold py-4 px-6 rounded-2xl uppercase tracking-widest text-xs bg-stone-900 border border-white/10 text-stone-100 hover:bg-stone-800 hover:border-white/20 transition-all"
      >
        Give a gift
      </a>
    </section>
  );
};

export default MissionGift;
