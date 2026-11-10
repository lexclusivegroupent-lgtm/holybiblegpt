
import React, { useState, useEffect } from 'react';
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

interface SupportViewProps {
  onOpenTerms?: () => void;
}

const SupportView: React.FC<SupportViewProps> = ({ onOpenTerms }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
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

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 lg:py-20 max-w-6xl mx-auto w-full space-y-16 pb-32">
      <header className="text-center space-y-6">
        <div className="inline-flex w-20 h-20 bg-[#D4AF37]/10 rounded-3xl items-center justify-center text-4xl mb-2 border border-[#D4AF37]/20 shadow-[0_0_30px_rgba(212,175,55,0.1)]">❤️</div>
        <div className="space-y-2">
          <h2 className="accent-font text-3xl md:text-5xl font-bold gold-gradient-text uppercase tracking-widest leading-tight">Support Holy Bible GPT</h2>
          <p className="text-[10px] md:text-xs text-stone-600 uppercase tracking-[0.5em] font-bold">Maintaining the Sanctuary of the Word</p>
        </div>
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mx-auto" />
      </header>

      <section className="glass-dark border border-white/5 rounded-[3rem] p-8 md:p-16 shadow-[0_30px_70px_rgba(0,0,0,0.6)] space-y-12">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <p className="bible-font text-2xl md:text-3xl text-stone-200 leading-relaxed font-light italic">
            Reading, search, and AI study are free forever. Plus and gifts are optional.
          </p>
        </div>

        {!isOnline && (
          <div className="p-5 bg-red-950/20 border border-red-900/30 rounded-2xl text-center">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
              Links need internet access. Please try again when you are online.
            </p>
          </div>
        )}

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

        <div className="grid md:grid-cols-2 gap-10 items-stretch">
          {/* Section 1 - Give a Gift */}
          <div className="glass-dark border border-white/10 p-10 rounded-[2.5rem] flex flex-col justify-between space-y-10 hover:border-[#D4AF37]/30 transition-all duration-500 group">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                 <span className="text-3xl">☕</span>
                 <h3 className="text-xs font-bold text-stone-500 uppercase tracking-[0.3em]">Give a Gift</h3>
              </div>
              <p className="text-stone-400 text-sm leading-relaxed">
                If you want to give a one time gift to support our mission and server costs, use this link:
              </p>
            </div>
            <a 
              href={isOnline ? "https://buymeacoffee.com/holybiblegpt?status=1" : "#"} 
              target={isOnline ? "_blank" : "_self"} 
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-3 font-bold py-6 rounded-2xl uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 ${
                isOnline 
                  ? 'bg-[#D4AF37] text-black hover:scale-[1.02] shadow-[0_15px_30px_rgba(212,175,55,0.25)]' 
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed grayscale'
              }`}
              onClick={(e) => !isOnline && e.preventDefault()}
            >
              Buy Me a Coffee
            </a>
          </div>

          {/* Section 2 - Shop Merchandise */}
          <div className="glass-dark border border-white/10 p-10 rounded-[2.5rem] flex flex-col justify-between space-y-10 hover:border-[#D4AF37]/30 transition-all duration-500 group">
            <div className="space-y-6">
               <div className="flex items-center gap-4">
                 <span className="text-3xl">👕</span>
                 <h3 className="text-xs font-bold text-stone-500 uppercase tracking-[0.3em]">Official Shop</h3>
              </div>
              <p className="text-stone-400 text-sm leading-relaxed">
                Support the project while wearing the message. You also support the project by buying merch here:
              </p>
            </div>
            <a 
              href={isOnline ? "https://holy-bible-gpt.printify.me/" : "#"} 
              target={isOnline ? "_blank" : "_self"} 
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-3 font-bold py-6 rounded-2xl uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 ${
                isOnline 
                  ? 'bg-stone-900 border border-white/10 text-stone-100 hover:bg-stone-800 hover:border-white/20' 
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed grayscale border-transparent'
              }`}
              onClick={(e) => !isOnline && e.preventDefault()}
            >
              Shop Merchandise
            </a>
          </div>
        </div>

        <footer className="text-center pt-10 space-y-10">
          <p className="text-stone-400 text-sm md:text-base tracking-wide">
            Reading, search, and AI study stay free whether or not you subscribe or give.
          </p>
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">
              <button onClick={onOpenTerms} className="hover:text-[#D4AF37] transition-colors">Terms & Disclaimers</button>
              <span className="hidden md:inline text-stone-800">•</span>
              <a href="mailto:thechristiansdeck@gmail.com" className="text-stone-700 hover:text-[#D4AF37] transition-colors">thechristiansdeck@gmail.com</a>
            </div>
          </div>
        </footer>
      </section>

      <div className="text-center py-16 opacity-30 select-none">
        <div className="accent-font text-xs uppercase tracking-[0.6em] text-stone-700">Faith • Hope • Love</div>
      </div>
    </div>
  );
};

export default SupportView;
