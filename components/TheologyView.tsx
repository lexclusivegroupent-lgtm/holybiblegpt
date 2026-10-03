
import React from 'react';

const TheologyView: React.FC = () => {
  const topics = [
    { title: "Bibliology", focus: "The Word", content: "The Bible is the inspired, inerrant Word of God — the sole and final authority over all doctrine. It is sufficient on its own to make the believer complete, thoroughly equipped for every good work. Nothing stands above it, beside it, or gets added to it: not tradition, not human teaching, not personal revelation.", verses: ["2 Timothy 3:16-17", "Revelation 22:18-19"] },
    { title: "Theology Proper", focus: "God", content: "God is the eternal, sovereign Creator who exists in three persons: Father, Son, and Holy Spirit.", verses: ["Genesis 1:1", "Matthew 28:19"] },
    { title: "Christology", focus: "Jesus", content: "Jesus Christ is fully God and fully man, the promised Messiah who died for our sins and rose for our justification.", verses: ["John 1:1", "Colossians 2:9"] },
    { title: "Soteriology", focus: "Salvation", content: "Salvation is a gift of God's grace, received through faith alone in Christ alone, apart from any works.", verses: ["Ephesians 2:8-9", "John 14:6"] },
    { title: "Pneumatology", focus: "The Spirit", content: "The Holy Spirit indwells every believer, empowering them for service, comfort, and leading them into all truth.", verses: ["John 16:13", "Acts 1:8"] },
    { title: "Relationship vs. Religion", focus: "Knowing Him", content: "Jesus confronted empty religious performance throughout His ministry — people who honored God with their lips while their hearts stayed far from Him, trading His commands for human tradition. Scripture never asks for ritual without relationship. It calls believers to abide in Christ Himself, not a system about Him.", verses: ["Mark 7:6-8", "John 15:4-5"] }
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-4xl mx-auto w-full space-y-12 pb-32">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Foundations</h2>
        <p className="text-[10px] text-stone-600 uppercase tracking-[0.4em]">Essential Doctrines of the Faith</p>
      </header>

      <div className="grid gap-8">
        {topics.map(t => (
          <div key={t.title} className="glass-dark border border-white/5 p-10 rounded-[2.5rem] space-y-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-6xl accent-font opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">{t.title[0]}</div>
            <header className="flex items-center gap-4">
               <div className="w-10 h-10 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl flex items-center justify-center text-xl">📖</div>
               <div className="space-y-0.5">
                  <h3 className="text-xl font-bold text-stone-100 uppercase tracking-widest">{t.title}</h3>
                  <p className="text-[9px] text-stone-600 font-bold uppercase tracking-[0.3em]">{t.focus}</p>
               </div>
            </header>
            <p className="bible-font text-xl text-stone-300 leading-relaxed font-light italic">"{t.content}"</p>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
               {t.verses.map(v => (
                 <span key={v} className="px-4 py-2 bg-white/5 rounded-lg text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">{v}</span>
               ))}
            </div>
          </div>
        ))}
      </div>
      
      <footer className="pt-12 text-center">
        <p className="text-[9px] text-stone-700 uppercase tracking-widest italic">All definitions derived from historic orthodox confessions.</p>
      </footer>
    </div>
  );
};

export default TheologyView;
