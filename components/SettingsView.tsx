
import React, { useState } from 'react';
import { storage } from '../services/storageService';
import { initializeOfflineKJV } from '../services/bibleService';
import { AppSettings, AppTab } from '../types';

interface SettingsViewProps {
  onTabChange: (tab: AppTab) => void;
  onReport?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onTabChange, onReport }) => {
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const update = (newSettings: Partial<AppSettings>) => {
    const s = { ...settings, ...newSettings };
    setSettings(s);
    storage.saveSettings(s);
  };

  const startSync = async () => {
    setSyncStatus("Starting...");
    try {
      await initializeOfflineKJV(setSyncStatus);
      setSyncStatus(null);
      alert("KJV Offline Ready");
    } catch {
      setSyncStatus("Error");
      setTimeout(() => setSyncStatus(null), 2000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-12 pb-24">
      <header className="text-center">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Settings</h2>
        <p className="text-[10px] text-stone-700 uppercase tracking-[0.4em] mt-2">Holy Bible GPT</p>
      </header>

      <section className="space-y-10">

        {/* Free AI Notice */}
        <div className="glass-dark border border-[#D4AF37]/20 p-6 rounded-[2rem] space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔑</span>
            <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-[#D4AF37]">Free AI via Puter</h3>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Holy Bible GPT uses <strong className="text-stone-300">Puter.com</strong> for unlimited, free AI Bible study — no subscription or credit card required. Sign in with your free Puter account to ask questions, study Scripture, and generate prayers.
          </p>
          <p className="text-[10px] text-stone-600 leading-snug">
            AI responses are powered by GPT-4o-mini via Puter · Scripture is the final authority
          </p>
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
              <h4 className="text-[9px] font-bold text-stone-600 uppercase tracking-widest">Not collected:</h4>
              <ul className="text-xs text-stone-400 space-y-2">
                <li>• No account required</li>
                <li>• No email or name</li>
                <li>• No payment info</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Offline KJV */}
        <div className="glass-dark border border-white/5 p-8 rounded-[2rem] space-y-6 text-center">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500">Offline Bible</h3>
          <p className="text-xs text-stone-500 leading-relaxed px-4">Download the full KJV for 100% offline reading — no internet needed.</p>
          <button
            onClick={startSync}
            disabled={syncStatus !== null}
            className={`w-full py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
              syncStatus !== null
                ? 'bg-stone-900 text-stone-700'
                : 'bg-[#D4AF37] text-black shadow-xl hover:scale-[1.01] active:scale-95'
            }`}
          >
            {syncStatus ?? 'Download Offline KJV'}
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
