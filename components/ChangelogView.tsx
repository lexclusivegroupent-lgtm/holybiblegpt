
import React from 'react';

const ChangelogView: React.FC = () => {
  const updates = [
    { date: "Oct 2025", items: ["Added Search Tools", "Offline KJV support", "Prayer Journal features"] },
    { date: "Sep 2025", items: ["Initial Beta Launch", "AI Bible Study Modes", "Interactive Timeline"] }
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-12">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-2xl font-bold gold-gradient-text uppercase tracking-widest">What's New</h2>
        <p className="text-[10px] text-stone-600 uppercase tracking-widest">Changelog</p>
      </header>

      <div className="space-y-12">
        {updates.map((u, i) => (
          <section key={i} className="space-y-6">
            <div className="flex items-center gap-4">
               <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.4em]">{u.date}</span>
               <div className="h-px flex-1 bg-white/5" />
            </div>
            <ul className="space-y-4">
              {u.items.map((item, j) => (
                <li key={j} className="flex gap-4">
                  <span className="text-[#D4AF37]">•</span>
                  <span className="text-stone-400 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export default ChangelogView;
