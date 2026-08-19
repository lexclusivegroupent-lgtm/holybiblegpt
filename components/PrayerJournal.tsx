
import React, { useState } from 'react';
import { storage } from '../services/storageService';
import { PrayerEntry, PrayerCategory, AppMode } from '../types';
import { sendMessageStream } from '../services/aiService';

const CATEGORIES: PrayerCategory[] = ['Family', 'Health', 'Church', 'Growth', 'Other'];

const PrayerJournal: React.FC = () => {
  const [prayers, setPrayers] = useState<PrayerEntry[]>(storage.getPrayers());
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<PrayerCategory>('Other');
  const [isAIHelping, setIsAIHelping] = useState(false);

  const handleSave = () => {
    if (!newText.trim()) return;
    const entry: PrayerEntry = {
      id: Date.now().toString(),
      title: newTitle || 'Untitled Prayer',
      text: newText,
      category: newCategory,
      timestamp: Date.now(),
      isAnswered: false
    };
    storage.savePrayer(entry);
    setPrayers(storage.getPrayers());
    setIsAdding(false);
    setNewTitle('');
    setNewText('');
    setNewCategory('Other');
  };

  const handleAIHelp = async () => {
    if (isAIHelping) return;
    setIsAIHelping(true);
    const prompt = `Help me write a prayer about ${newCategory}${newTitle ? ` specifically regarding: ${newTitle}` : ''}. Keep it short and rooted in Scripture.`;
    try {
      await sendMessageStream(
        AppMode.PRAYER_HELP,
        'KJV' as any,
        false,
        [{ role: 'user', content: prompt }],
        (chunk) => setNewText(chunk)
      );
    } catch {
      setNewText('Lord, help me to express what is on my heart…');
    } finally {
      setIsAIHelping(false);
    }
  };

  const toggleAnswered = (p: PrayerEntry) => {
    const updated = { ...p, isAnswered: !p.isAnswered };
    storage.savePrayer(updated);
    setPrayers(storage.getPrayers());
  };

  const deletePrayer = (id: string) => {
    storage.deletePrayer(id);
    setPrayers(storage.getPrayers());
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-12 max-w-4xl mx-auto w-full space-y-12 pb-32">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="accent-font text-2xl font-bold gold-gradient-text uppercase tracking-widest">Sanctuary</h2>
          <p className="text-[10px] text-stone-600 uppercase tracking-[0.4em] mt-2">Private Spirit Communication</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-14 h-14 rounded-2xl bg-[#D4AF37] text-black flex items-center justify-center text-3xl shadow-xl hover:scale-110 active:scale-95 transition-all"
        >
          +
        </button>
      </header>

      {isAdding && (
        <div className="glass-dark border border-[#D4AF37]/30 p-10 rounded-[3rem] space-y-8 animate-in fade-in slide-in-from-top-4 shadow-2xl">
          <div className="space-y-4">
             <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setNewCategory(c)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${newCategory === c ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'border-white/10 text-stone-500'}`}>
                    {c}
                  </button>
                ))}
             </div>
             <input 
              placeholder="Prayer Topic..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-stone-900/50 border border-white/10 rounded-2xl px-6 py-4 outline-none text-stone-200"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center px-2">
               <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">Prayer Petition</label>
               <button
                onClick={handleAIHelp}
                disabled={isAIHelping}
                className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37] hover:underline disabled:text-stone-700 disabled:cursor-not-allowed"
               >
                 {isAIHelping ? 'Writing…' : '✨ Help me write this'}
               </button>
            </div>
            <textarea 
              placeholder="Open your heart here..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={6}
              className="w-full bg-stone-900/50 border border-white/10 rounded-2xl px-6 py-4 outline-none text-stone-300 text-sm italic"
            />
          </div>
          <div className="flex gap-4">
            <button onClick={handleSave} className="flex-1 bg-[#D4AF37] text-black py-5 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-95">Save Petition</button>
            <button onClick={() => setIsAdding(false)} className="flex-1 bg-white/5 text-stone-500 py-5 rounded-2xl font-bold uppercase tracking-widest text-xs active:scale-95">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {prayers.length === 0 ? (
          <div className="text-center py-32 space-y-4">
             <div className="text-6xl opacity-10">🙏</div>
             <p className="text-stone-600 italic">No petitions recorded. Let your requests be made known unto God.</p>
          </div>
        ) : (
          prayers.map(p => (
            <div key={p.id} className={`glass-dark border p-8 rounded-[2.5rem] space-y-6 group transition-all relative overflow-hidden ${p.isAnswered ? 'border-emerald-900/40 bg-emerald-950/5' : 'border-white/5'}`}>
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                     <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${p.isAnswered ? 'border-emerald-500/30 text-emerald-500' : 'border-white/10 text-stone-600'}`}>{p.category}</span>
                     <span className="text-[9px] text-stone-700 font-bold">{new Date(p.timestamp).toLocaleDateString()}</span>
                  </div>
                  <h3 className={`font-bold uppercase tracking-widest text-lg ${p.isAnswered ? 'text-emerald-400 opacity-60' : 'text-stone-200'}`}>{p.title}</h3>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => toggleAnswered(p)} className={`p-2 rounded-xl border border-white/5 transition-all text-[9px] font-bold uppercase tracking-widest ${p.isAnswered ? 'bg-emerald-500 text-black border-emerald-500' : 'text-stone-600 hover:text-[#D4AF37] hover:border-[#D4AF37]/40'}`}>
                    {p.isAnswered ? '✓ Answered' : 'Mark Answered'}
                  </button>
                  <button onClick={() => deletePrayer(p.id)} className="p-2 text-stone-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">✕</button>
                </div>
              </div>
              <p className={`text-stone-400 text-base italic leading-relaxed whitespace-pre-wrap relative z-10 ${p.isAnswered ? 'line-through opacity-40' : ''}`}>{p.text}</p>
              <div className="absolute -bottom-10 -right-10 text-9xl accent-font opacity-[0.01] pointer-events-none select-none">{p.category[0]}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PrayerJournal;
