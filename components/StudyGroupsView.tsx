
import React, { useState, useEffect } from 'react';

interface StudyGroup {
  id: string;
  name: string;
  created: number;
}

const StudyGroupsView: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'create' | 'share'>('overview');
  const [localGroups, setLocalGroups] = useState<StudyGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('hbgpt_local_groups');
    if (stored) setLocalGroups(JSON.parse(stored));
  }, []);

  const createGroup = () => {
    if (!newGroupName.trim()) return;
    const group = { id: Date.now().toString(), name: newGroupName.trim(), created: Date.now() };
    const updated = [...localGroups, group];
    setLocalGroups(updated);
    localStorage.setItem('hbgpt_local_groups', JSON.stringify(updated));
    setNewGroupName('');
    setActiveView('overview');
  };

  const discussionPrompts = [
    "How does this passage show God's character?",
    "What is one thing you can do today to follow Jesus better?",
    "Was there a verse that surprised you during the reading?",
    "How can we pray for each other based on this chapter?"
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-4xl mx-auto w-full space-y-16 pb-32">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Church Study Groups</h2>
        <p className="text-[10px] text-stone-600 uppercase tracking-[0.4em]">Family & Small Group Unity</p>
      </header>

      <nav className="flex justify-center bg-stone-900/50 p-1 rounded-2xl border border-white/5 max-w-md mx-auto">
        {(['overview', 'create', 'share'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveView(tab)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeView === tab ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {tab === 'overview' && localGroups.length > 0 ? `My Groups (${localGroups.length})` : tab}
          </button>
        ))}
      </nav>

      {activeView === 'overview' && (
        <div className="space-y-10 animate-in fade-in duration-500">
          {localGroups.length > 0 && (
            <div className="grid gap-4">
              <h3 className="text-[10px] font-bold text-stone-600 uppercase tracking-widest px-2">Active Sessions</h3>
              {localGroups.map(g => (
                <div key={g.id} className="p-6 glass-dark border border-[#D4AF37]/20 rounded-2xl flex justify-between items-center">
                   <div className="space-y-1">
                      <span className="text-stone-200 font-bold uppercase tracking-widest text-xs">{g.name}</span>
                      <p className="text-[8px] text-stone-700">Established {new Date(g.created).toLocaleDateString()}</p>
                   </div>
                   <button className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest px-4 py-2 bg-stone-900 rounded-lg">Resume</button>
                </div>
              ))}
            </div>
          )}

          <section className="glass-dark border border-white/5 p-8 rounded-3xl space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Discussion Prompts</h3>
              <button 
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'Holy Bible GPT Study', text: 'Join my Bible study group! Here are today\'s discussion prompts.', url: window.location.href });
                  }
                }}
                className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest px-3 py-1 bg-[#D4AF37]/5 rounded-lg border border-[#D4AF37]/20"
              >
                Share Passage
              </button>
            </div>
            <ul className="space-y-4">
              {discussionPrompts.map((p, i) => (
                <li key={i} className="flex gap-4 group">
                  <span className="text-[#D4AF37] font-bold">0{i+1}.</span>
                  <p className="text-stone-300 text-sm leading-relaxed group-hover:text-stone-100 transition-colors">{p}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {activeView === 'create' && (
        <div className="glass-dark border border-white/5 p-10 rounded-[3rem] space-y-8 animate-in slide-in-from-bottom-4 duration-500 text-center">
          <h3 className="accent-font text-2xl font-bold text-stone-100 uppercase tracking-widest">Create a Study List</h3>
          <p className="text-stone-400 text-sm leading-relaxed">Prepare a list of verses for your next family or church gathering.</p>
          <div className="space-y-4">
            <input 
              type="text" 
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group Name (e.g. Sunday Morning Study)" 
              className="w-full bg-stone-900 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-[#D4AF37] transition-all text-stone-200" 
            />
            <button 
              onClick={createGroup}
              className="w-full bg-[#D4AF37] text-black font-bold py-5 rounded-2xl uppercase tracking-widest text-xs hover:scale-[1.02] transition-all active:scale-95 shadow-xl"
            >
              Initialize Local List
            </button>
          </div>
        </div>
      )}

      {activeView === 'share' && (
        <div className="glass-dark border border-white/5 p-10 rounded-[3rem] space-y-8 animate-in slide-in-from-bottom-4 duration-500 text-center">
          <h3 className="accent-font text-2xl font-bold text-stone-100 uppercase tracking-widest">Share Reading Plan</h3>
          <p className="text-stone-400 text-sm leading-relaxed">Focus on reading, prayer, and unity. No global public chat is allowed to maintain privacy.</p>
          <div className="p-8 bg-stone-900/50 rounded-2xl border border-dashed border-white/10">
            <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-4">Plan Share Link Generator</p>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`Holy Bible GPT Study: Join my reading plan for ${new Date().toLocaleDateString()}`);
              }}
              className="bg-white/5 border border-white/10 text-stone-400 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
            >
              Copy Invite Code
            </button>
          </div>
        </div>
      )}

      <footer className="pt-12 text-center space-y-4">
        <div className="p-6 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-2xl max-w-md mx-auto">
          <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-2">Privacy & Guardrails</p>
          <ul className="text-[9px] text-stone-500 uppercase tracking-widest space-y-2">
            <li>Notes stay on the device</li>
            <li>No global public chat</li>
            <li>No debate features</li>
            <li>Focus on reading, prayer, unity</li>
          </ul>
        </div>
      </footer>
    </div>
  );
};

export default StudyGroupsView;
