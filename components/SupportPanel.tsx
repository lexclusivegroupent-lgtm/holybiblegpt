
import React, { useEffect, useState } from 'react';
import MissionGift from './MissionGift';
import PlusPlan from './PlusPlan';
import { signIntoPuter } from '../services/aiService';
import {
  BillingAvailability,
  BillingInterval,
  checkProStatus,
  getBillingAvailability,
  getUserId,
  startCheckout,
} from '../services/syncService';

interface SupportPanelProps {
  onClose: () => void;
}

const SupportPanel: React.FC<SupportPanelProps> = ({ onClose }) => {
  const [billing, setBilling] = useState<BillingAvailability | 'checking'>('checking');
  const [userId, setUserId] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [accountKnown, setAccountKnown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBillingAvailability().then((next) => {
      if (!cancelled) setBilling(next);
    });
    getUserId().then(async (id) => {
      if (cancelled) return;
      setUserId(id);
      if (!id) {
        setActive(false);
        setAccountKnown(true);
        return;
      }
      const status = await checkProStatus(id);
      if (cancelled) return;
      setActive(status === 'pro');
      setAccountKnown(true);
    }).catch(() => {
      if (!cancelled) setAccountKnown(true);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSignIn = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await signIntoPuter();
      const id = await getUserId();
      setUserId(id);
      setActive(id ? (await checkProStatus(id)) === 'pro' : false);
      setAccountKnown(true);
    } catch (e: any) {
      setMessage(e.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCheckout = async (interval: BillingInterval) => {
    if (!userId) return handleSignIn();
    setBusy(true);
    setMessage(null);
    try {
      await startCheckout(userId, interval);
    } catch (e: any) {
      setMessage(e.message || 'Could not start checkout.');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-black overflow-y-auto">
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-stone-900/40 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Support Project</span>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/5 rounded-lg text-stone-500 hover:text-white transition-all"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-8 py-12 space-y-12">
        <header>
          <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest mb-6">Support Holy Bible GPT</h2>
          <p className="bible-font text-xl text-stone-300 leading-relaxed font-light">
            Reading, search, and AI study are free forever. Plus and gifts are optional.
          </p>
        </header>

        <PlusPlan
          billing={billing}
          signedIn={Boolean(userId)}
          active={active}
          accountKnown={accountKnown}
          busy={busy}
          message={message}
          onSignIn={handleSignIn}
          onCheckout={handleCheckout}
        />

        <MissionGift giftUrl={billing === 'checking' ? '' : billing.giftUrl} />

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600">Give a gift</h3>
          <p className="text-stone-400 text-sm leading-relaxed mb-4">
            If you want to give a one time gift, use this link:
          </p>
          <a 
            href="https://buymeacoffee.com/holybiblegpt?status=1" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between group p-4 bg-stone-900/50 border border-white/5 rounded-2xl hover:border-[#D4AF37]/40 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-xl">☕</div>
              <span className="text-stone-200 font-medium">Buy Me a Coffee</span>
            </div>
            <svg className="h-5 w-5 text-stone-600 group-hover:text-[#D4AF37] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600">Shop merchandise</h3>
          <p className="text-stone-400 text-sm leading-relaxed mb-4">
            You also support the project by buying merch here:
          </p>
          <a 
            href="https://holy-bible-gpt.printify.me/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between group p-4 bg-stone-900/50 border border-white/5 rounded-2xl hover:border-[#D4AF37]/40 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-xl">👕</div>
              <span className="text-stone-200 font-medium">Official Merchandise</span>
            </div>
            <svg className="h-5 w-5 text-stone-600 group-hover:text-[#D4AF37] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </section>

        <footer className="pt-8 border-t border-white/5">
          <p className="text-stone-400 text-sm">
            Reading, search, and AI study stay free whether or not you subscribe or give.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default SupportPanel;
