
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storageService';
import { initializeOfflineKJV, getCachedChapterCount } from '../services/bibleService';
import { getUserId, checkProStatus, startCheckout, openBillingPortal, pushSyncData, pullSyncData, ProStatus } from '../services/syncService';
import { signIntoPuter } from '../services/aiService';
import { AppSettings, AppTab } from '../types';

interface SettingsViewProps {
  onTabChange: (tab: AppTab) => void;
  onReport?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onTabChange, onReport }) => {
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [cachedCount, setCachedCount] = useState<number>(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [proStatus, setProStatus] = useState<ProStatus | 'checking'>('checking');
  const [proBusy, setProBusy] = useState(false);
  const [proMessage, setProMessage] = useState<string | null>(null);

  const refreshProStatus = async () => {
    const id = await getUserId();
    setUserId(id);
    if (id) {
      setProStatus(await checkProStatus(id));
    } else {
      setProStatus('free');
    }
  };

  useEffect(() => {
    getCachedChapterCount().then(setCachedCount);
    refreshProStatus();
  }, []);

  const handleSignIn = async () => {
    setProBusy(true);
    try {
      await signIntoPuter();
      await refreshProStatus();
    } catch (e: any) {
      setProMessage(e.message || 'Sign-in failed.');
    } finally {
      setProBusy(false);
    }
  };

  const handleUpgrade = async () => {
    if (!userId) return handleSignIn();
    setProBusy(true);
    setProMessage(null);
    try {
      await startCheckout(userId);
    } catch (e: any) {
      setProMessage(e.message || 'Could not start checkout.');
      setProBusy(false);
    }
  };

  const handleManage = async () => {
    if (!userId) return;
    setProBusy(true);
    setProMessage(null);
    try {
      await openBillingPortal(userId);
    } catch (e: any) {
      setProMessage(e.message || 'Could not open billing portal.');
      setProBusy(false);
    }
  };

  const handleBackup = async () => {
    if (!userId) return;
    setProBusy(true);
    setProMessage(null);
    try {
      await pushSyncData(userId);
      setProMessage('Backed up to the cloud just now.');
    } catch (e: any) {
      setProMessage(e.message || 'Backup failed.');
    } finally {
      setProBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!userId) return;
    if (!window.confirm('This will replace the notes, bookmarks, prayers, and progress on this device with your cloud backup. Continue?')) return;
    setProBusy(true);
    setProMessage(null);
    try {
      const found = await pullSyncData(userId);
      setSettings(storage.getSettings());
      setProMessage(found ? 'Restored from your cloud backup.' : 'No cloud backup found yet — back up from another device first.');
    } catch (e: any) {
      setProMessage(e.message || 'Restore failed.');
    } finally {
      setProBusy(false);
    }
  };

  const update = (newSettings: Partial<AppSettings>) => {
    const s = { ...settings, ...newSettings };
    setSettings(s);
    storage.saveSettings(s);
  };

  const startSync = async () => {
    setSyncStatus("Starting...");
    try {
      await initializeOfflineKJV(setSyncStatus);
      const count = await getCachedChapterCount();
      setCachedCount(count);
      setSyncStatus(null);
      alert("KJV Offline Ready");
    } catch {
      setSyncStatus("Error");
      setTimeout(() => setSyncStatus(null), 2000);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-12 pb-24">
      <header className="text-center">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Settings</h2>
        <p className="text-[10px] text-stone-700 uppercase tracking-[0.4em] mt-2">Holy Bible GPT</p>
      </header>

      <section className="space-y-10">

        {/* Free AI Notice */}
        <div className="glass-dark border border-[#D4AF37]/20 p-6 rounded-[2rem] space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔑</span>
            <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-[#D4AF37]">Free AI Study Helper</h3>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Holy Bible GPT keeps the AI study helper completely free by using a free third-party AI service — no subscription or credit card required. A free sign-in is needed to activate it. Bible reading, notes, and Gospel Harmony work without any account.
          </p>
          <p className="text-[10px] text-stone-600 leading-snug">
            The AI is a study aid, not a pastor or spiritual authority · Scripture is the final authority
          </p>
        </div>

        {/* Holy Bible GPT Pro */}
        <div className="glass-dark border border-[#D4AF37]/30 p-8 rounded-[2rem] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">Holy Bible GPT Pro</h3>
            {proStatus === 'pro' && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-950/30 px-3 py-1 rounded-full">Active</span>
            )}
          </div>

          {proStatus === 'checking' && (
            <p className="text-xs text-stone-500">Checking status…</p>
          )}

          {proStatus !== 'checking' && !userId && (
            <>
              <p className="text-xs text-stone-400 leading-relaxed">
                Sign in to sync your notes, bookmarks, prayers, and reading progress across every device — $6.99/month.
              </p>
              <button
                onClick={handleSignIn}
                disabled={proBusy}
                className="w-full py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] bg-[#D4AF37] text-black shadow-xl hover:scale-[1.01] active:scale-95 disabled:opacity-50"
              >
                {proBusy ? 'Opening…' : 'Sign In to Continue'}
              </button>
            </>
          )}

          {proStatus === 'free' && userId && (
            <>
              <p className="text-xs text-stone-400 leading-relaxed">
                Sync your notes, bookmarks, prayers, and reading progress across every device. Everything else stays free, always.
              </p>
              <button
                onClick={handleUpgrade}
                disabled={proBusy}
                className="w-full py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] bg-[#D4AF37] text-black shadow-xl hover:scale-[1.01] active:scale-95 disabled:opacity-50"
              >
                {proBusy ? 'Opening…' : 'Upgrade to Pro — $6.99/mo'}
              </button>
            </>
          )}

          {proStatus === 'pro' && (
            <div className="space-y-4">
              <p className="text-xs text-stone-400 leading-relaxed">
                Cloud sync is active for this account.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleBackup}
                  disabled={proBusy}
                  className="py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37] text-black disabled:opacity-50"
                >
                  Back Up
                </button>
                <button
                  onClick={handleRestore}
                  disabled={proBusy}
                  className="py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest glass-dark border border-white/10 text-stone-300 disabled:opacity-50"
                >
                  Restore
                </button>
              </div>
              <button
                onClick={handleManage}
                disabled={proBusy}
                className="w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-stone-300 disabled:opacity-50"
              >
                Manage Subscription
              </button>
            </div>
          )}

          {proMessage && (
            <p className="text-[10px] text-stone-500 text-center">{proMessage}</p>
          )}
        </div>

        {/* Safety Section */}
        <div className="glass-dark border border-white/5 p-8 rounded-[2rem] space-y-6">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500">Safety & Family</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm text-stone-300 block">Kids Mode</span>
              <span className="text-[9px] text-stone-600 uppercase tracking-widest">Simple words · Shorter answers</span>
            </div>
            <button
              onClick={() => update({ kidsMode: !settings.kidsMode })}
              className={`w-14 h-7 rounded-full relative transition-colors ${settings.kidsMode ? 'bg-[#D4AF37]' : 'bg-stone-900'}`}
              aria-label="Toggle Kids Mode"
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${settings.kidsMode ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Reading Experience */}
        <div className="glass-dark border border-white/5 p-8 rounded-[2rem] space-y-8">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500">Reading Experience</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-xs text-stone-400">
              <label htmlFor="font-size">Font Size</label>
              <span>{settings.fontSize}px</span>
            </div>
            <input
              id="font-size"
              type="range"
              min="14"
              max="48"
              value={settings.fontSize}
              onChange={(e) => update({ fontSize: parseInt(e.target.value) })}
              className="w-full h-2 bg-stone-900 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-300">Night Reading Mode</span>
            <button
              onClick={() => update({ nightMode: !settings.nightMode })}
              className={`w-14 h-7 rounded-full relative transition-colors ${settings.nightMode ? 'bg-[#D4AF37]' : 'bg-stone-900'}`}
              aria-label="Toggle Night Mode"
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${settings.nightMode ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Your Data */}
        <div className="glass-dark border border-white/5 p-8 rounded-[2rem] space-y-8">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500">Your Data</h3>
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest">Saved on your device:</h4>
              <ul className="text-xs text-stone-400 space-y-2">
                <li>• Reading progress & history</li>
                <li>• Bookmarks & highlights</li>
                <li>• Notes & prayers</li>
                <li>• Preferences</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-[9px] font-bold text-stone-600 uppercase tracking-widest">On the free plan:</h4>
              <ul className="text-xs text-stone-400 space-y-2">
                <li>• No account required</li>
                <li>• No email or name</li>
                <li>• No payment info</li>
              </ul>
              <p className="text-[9px] text-stone-600 leading-snug">
                Pro is optional. If you upgrade, billing is handled by Stripe — card details go directly to them, never to us.
              </p>
            </div>
          </div>
        </div>

        {/* Offline KJV */}
        <div className="glass-dark border border-white/5 p-8 rounded-[2rem] space-y-6 text-center">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500">Offline Bible</h3>
          <p className="text-xs text-stone-500 leading-relaxed px-4">
            Chapters you read are saved automatically for offline use. You can also download the full KJV at once below.
          </p>
          {cachedCount > 0 && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl">
              <span className="text-emerald-500 text-sm">●</span>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                {cachedCount} chapter{cachedCount !== 1 ? 's' : ''} cached offline
              </p>
            </div>
          )}
          <button
            onClick={startSync}
            disabled={syncStatus !== null}
            className={`w-full py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
              syncStatus !== null
                ? 'bg-stone-900 text-stone-700'
                : 'bg-[#D4AF37] text-black shadow-xl hover:scale-[1.01] active:scale-95'
            }`}
          >
            {syncStatus ?? 'Download Full KJV Offline'}
          </button>
        </div>

        {/* Links */}
        <div className="grid gap-4">
          <button
            onClick={() => onTabChange('privacy')}
            className="w-full py-4 glass-dark border border-white/5 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-stone-300 transition-colors"
          >
            Privacy Policy
          </button>
          <button
            onClick={() => window.location.href = "mailto:thechristiansdeck@gmail.com?subject=Holy%20Bible%20GPT%20Feedback"}
            className="w-full py-4 glass-dark border border-white/5 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-[#D4AF37] transition-colors"
          >
            Send Feedback
          </button>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
