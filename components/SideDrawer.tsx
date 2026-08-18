
import React from 'react';
import { Translation, AppTab } from '../types';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  currentTranslation: Translation;
  onTranslationChange: (t: Translation) => void;
}

const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  currentTranslation,
  onTranslationChange
}) => {
  const mainLinks: { id: AppTab; label: string; icon: string }[] = [
    { id: 'home', label: 'My Walk', icon: '🏠' },
    { id: 'read', label: 'Reader', icon: '📖' },
    { id: 'prayer', label: 'Sanctuary', icon: '🙏' },
    { id: 'study', label: 'AI Bible Study', icon: '✨' },
    { id: 'library', label: 'My Library', icon: '📚' },
    { id: 'theology', label: 'Theology', icon: '🏛️' },
    { id: 'harmony', label: 'Gospels', icon: '🔄' },
    { id: 'learn', label: 'Timeline', icon: '📜' },
    { id: 'kids', label: 'Kids Mode', icon: '🎨' },
  ];

  const infoLinks: { id: AppTab; label: string; icon: string }[] = [
    { id: 'search', label: 'Search', icon: '🔍' },
    { id: 'faith', label: 'Statement', icon: '✝️' },
    { id: 'roadmap', label: 'Roadmap', icon: '🗺️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const renderLink = (link: { id: AppTab; label: string; icon: string }) => (
    <button
      key={link.id}
      onClick={() => onTabChange(link.id)}
      className={`w-full flex items-center gap-4 px-4 min-h-[48px] rounded-xl text-left transition-all group ${activeTab === link.id
          ? 'bg-[#D4AF37] text-black shadow-lg scale-[1.02]'
          : 'text-stone-400 hover:bg-white/5 hover:text-stone-100'
        }`}
    >
      <span className="text-lg shrink-0" aria-hidden="true">{link.icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em]">{link.label}</span>
    </button>
  );

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} aria-hidden="true" />
      <aside className={`fixed inset-y-0 left-0 w-[280px] sm:w-[320px] glass-dark border-r border-white/10 z-[70] shadow-2xl transition-transform duration-500 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Main Navigation" aria-hidden={!isOpen}>
        <div className="flex flex-col h-full">
          <header className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[#D4AF37] text-xl" aria-hidden="true">♰</span>
              <span className="accent-font text-sm font-bold gold-gradient-text uppercase tracking-widest">Navigation</span>
            </div>
            <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 hover:text-white transition-colors rounded-lg hover:bg-white/5" aria-label="Close Menu">✕</button>
          </header>

          <nav className="flex-1 overflow-y-auto py-4 px-2 no-scrollbar">
            <div className="space-y-1 mb-6">
              {mainLinks.map(renderLink)}
            </div>

            <div className="px-4 mb-2 text-[8px] font-bold text-stone-700 uppercase tracking-widest">Utility</div>
            <div className="space-y-1">
              {infoLinks.map(renderLink)}
            </div>
          </nav>

          <footer className="p-6 border-t border-white/5 bg-stone-900/40 space-y-6">
            <div className="space-y-2">
              <label htmlFor="drawer-translation" className="text-[10px] font-bold text-stone-600 uppercase tracking-widest block">Translation</label>
              <select id="drawer-translation" value={currentTranslation} onChange={(e) => onTranslationChange(e.target.value as Translation)} className="w-full bg-stone-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-[#D4AF37] appearance-none focus:outline-none">
                {Object.values(Translation).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="text-[9px] text-stone-700 font-bold uppercase tracking-[0.2em] text-center">Scripture First</div>
          </footer>
        </div>
      </aside>
    </>
  );
};

export default SideDrawer;
