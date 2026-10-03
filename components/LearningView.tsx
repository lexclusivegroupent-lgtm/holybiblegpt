
import React, { useState } from 'react';

interface TimelineItem {
  period: string;
  date: string;
  event: string;
  book: string;
  chapter: string;
  icon: string;
  summary: string;
  keyVerses: { ref: string; book: string; chapter: string; verse: string }[];
  highlight?: boolean;
  fullDetail: {
    what: string;
    who: string;
    why: string;
  };
}

interface LearningViewProps {
  onOpenPassage: (book: string, chapter: string, verse?: string) => void;
  onStudyEvent: (eventTitle: string, book: string, chapter: string) => void;
}

const LearningView: React.FC<LearningViewProps> = ({ onOpenPassage, onStudyEvent }) => {
  const [toast, setToast] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineItem | null>(null);
  const [viewingFullDetails, setViewingFullDetails] = useState(false);

  const topics = [
    { name: "Faith", icon: "⚓", ref: "Hebrews 11", desc: "Understanding the assurance of things hoped for." },
    { name: "Forgiveness", icon: "🕊️", ref: "Matthew 18:21-35", desc: "The path to reconciliation and mercy." },
    { name: "Hope", icon: "🌅", ref: "Romans 5:5", desc: "Hope that does not put us to shame." },
    { name: "Salvation", icon: "⚖️", ref: "Ephesians 2:8", desc: "The gift of grace through faith." }
  ];

  const timeline: TimelineItem[] = [
    { 
      period: "Creation", 
      date: "~4000 BC", 
      event: "God created the heavens and the earth.", 
      book: "Genesis", 
      chapter: "1",
      icon: "✨",
      summary: "The beginning of all existence. God spoke the universe into being and formed mankind in His own image.",
      keyVerses: [{ ref: "Genesis 1:1", book: "Genesis", chapter: "1", verse: "1" }, { ref: "Genesis 1:27", book: "Genesis", chapter: "1", verse: "27" }],
      fullDetail: {
        what: "The creation of the physical world and mankind through divine command.",
        who: "The Triune God (Father, Son, and Spirit).",
        why: "To display God's glory and share His goodness with a created being capable of relationship with Him."
      }
    },
    { 
      period: "Exodus", 
      date: "~1446 BC", 
      event: "God delivers Israel from Egypt.", 
      book: "Exodus", 
      chapter: "12",
      icon: "🌊",
      summary: "The central act of redemption in the Old Testament. God heard His people's cry and broke their chains of slavery.",
      keyVerses: [{ ref: "Exodus 12:31", book: "Exodus", chapter: "12", verse: "31" }, { ref: "Exodus 20:2", book: "Exodus", chapter: "20", verse: "2" }],
      fullDetail: {
        what: "The miraculous release of the Israelites from Egyptian bondage.",
        who: "God, Moses, Aaron, and Pharaoh.",
        why: "To fulfill the promise to Abraham and establish Israel as a holy nation dedicated to God."
      }
    },
    { 
      period: "Monarchy", 
      date: "~1010 BC", 
      event: "Reign of King David.", 
      book: "1 Samuel", 
      chapter: "16",
      icon: "👑",
      summary: "The establishment of the Davidic dynasty and the promise of a future King who would reign forever.",
      keyVerses: [{ ref: "1 Samuel 16:13", book: "1 Samuel", chapter: "16", verse: "13" }, { ref: "2 Samuel 7:16", book: "2 Samuel", chapter: "7", verse: "16" }],
      fullDetail: {
        what: "The transition of Israel from judges to a unified kingdom under a man after God's own heart.",
        who: "Samuel, Saul, David, and Jonathan.",
        why: "To prepare a lineage for the Messiah and show the necessity of a godly leader."
      }
    },
    { 
      period: "Prophets", 
      date: "~700 BC", 
      event: "Warnings and comfort to Israel.", 
      book: "Isaiah", 
      chapter: "1",
      icon: "📜",
      summary: "God spoke through chosen messengers to call His people back to faithfulness and point toward a coming Savior.",
      keyVerses: [{ ref: "Isaiah 1:18", book: "Isaiah", chapter: "1", verse: "18" }, { ref: "Isaiah 53:5", book: "Isaiah", chapter: "53", verse: "5" }],
      fullDetail: {
        what: "Divine messages regarding judgment for sin and the promise of future restoration.",
        who: "Isaiah, Jeremiah, Ezekiel, and the twelve minor prophets.",
        why: "To maintain God's covenant and reveal His plan for universal redemption through a Suffering Servant."
      }
    },
    { 
      period: "Gospels", 
      date: "4 BC - 33 AD", 
      event: "Life and Resurrection of Jesus.", 
      highlight: true, 
      book: "Matthew", 
      chapter: "1",
      icon: "✝️",
      summary: "The incarnation of God. Jesus Christ lived a perfect life, died for our sins, and rose again to conquer death.",
      keyVerses: [{ ref: "John 3:16", book: "John", chapter: "3", verse: "16" }, { ref: "Matthew 28:6", book: "Matthew", chapter: "28", verse: "6" }],
      fullDetail: {
        what: "The life, miracles, teaching, sacrifice, and victory of the Son of God.",
        who: "Jesus Christ, the Disciples, Mary, and the religious leaders.",
        why: "To accomplish salvation for all who believe and to reconcile the world to God."
      }
    },
    { 
      period: "Epistles", 
      date: "45-95 AD", 
      event: "The Early Church.", 
      book: "Acts", 
      chapter: "2",
      icon: "⛪",
      summary: "The Holy Spirit empowers the apostles to spread the Gospel 'to the ends of the earth' and build the body of Christ.",
      keyVerses: [{ ref: "Acts 1:8", book: "Acts", chapter: "1", verse: "8" }, { ref: "Romans 1:16", book: "Romans", chapter: "1", verse: "16" }],
      fullDetail: {
        what: "The growth and theological foundation of the Christian church.",
        who: "Peter, Paul, James, John, and the first believers.",
        why: "To establish local congregations and explain the practical implications of life in Christ."
      }
    }
  ];

  const handleTimelineClick = (item: TimelineItem) => {
    try {
      onOpenPassage(item.book, item.chapter);
      setSelectedEvent(item);
      setToast("Jumped to this event in Scripture.");
    } catch (e) {
      setToast("Could not load this chapter. Try again in a moment.");
    } finally {
      setTimeout(() => setToast(null), 3000);
    }
  };

  const closeDrawer = () => {
    setSelectedEvent(null);
    setViewingFullDetails(false);
  };

  if (viewingFullDetails && selectedEvent) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-3xl mx-auto w-full space-y-12 animate-in fade-in slide-in-from-right-8 duration-300">
        <button onClick={() => setViewingFullDetails(false)} className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:translate-x-[-4px] transition-transform">
          ← Back to Timeline
        </button>
        
        <header className="text-center space-y-4">
          <div className="text-4xl mx-auto mb-4 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">{selectedEvent.icon}</div>
          <h2 className="accent-font text-4xl font-bold gold-gradient-text uppercase tracking-widest">{selectedEvent.period}</h2>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mx-auto" />
          <p className="text-stone-500 text-[10px] uppercase tracking-[0.4em]">{selectedEvent.date}</p>
        </header>

        <section className="glass-dark border border-white/5 rounded-[2rem] p-10 space-y-10 shadow-2xl">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">What Happened</h3>
            <p className="bible-font text-xl text-stone-200 leading-relaxed font-light">{selectedEvent.fullDetail.what}</p>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">Who was Involved</h3>
            <p className="bible-font text-xl text-stone-200 leading-relaxed font-light">{selectedEvent.fullDetail.who}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">Why it Matters</h3>
            <p className="bible-font text-xl text-stone-200 leading-relaxed font-light">{selectedEvent.fullDetail.why}</p>
          </div>

          <div className="pt-8 border-t border-white/5 space-y-6">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Read it in the Bible</h3>
            <div className="flex flex-wrap gap-3">
              {selectedEvent.keyVerses.map((v, i) => (
                <button 
                  key={i} 
                  onClick={() => onOpenPassage(v.book, v.chapter, v.verse)}
                  className="px-5 py-3 bg-stone-900 border border-white/5 rounded-xl text-xs font-bold text-stone-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all"
                >
                  📖 {v.ref}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="flex gap-4">
          <button 
            onClick={() => onStudyEvent(selectedEvent.period, selectedEvent.book, selectedEvent.chapter)}
            className="flex-1 bg-[#D4AF37] text-black font-bold py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] transition-all active:scale-95"
          >
            Study this with AI
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-5xl mx-auto w-full space-y-24 relative">
      {/* Topics */}
      <section className="space-y-12">
        <div className="text-center">
          <h2 className="accent-font text-2xl font-bold gold-gradient-text uppercase tracking-widest">Scripture Topics</h2>
          <p className="text-[10px] text-stone-600 uppercase tracking-[0.4em] mt-2">Foundations of the faith</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {topics.map(t => (
            <div key={t.name} className="glass-dark border border-white/5 p-8 rounded-3xl space-y-4 hover:border-[#D4AF37]/30 transition-all group active:scale-[0.98]">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-inner">{t.icon}</div>
              <h3 className="text-lg font-bold text-stone-100 group-hover:text-[#D4AF37] transition-colors">{t.name}</h3>
              <p className="text-stone-500 text-xs leading-relaxed">{t.desc}</p>
              <button 
                onClick={() => {
                  const parts = t.ref.split(' ');
                  const book = parts.slice(0, -1).join(' ');
                  const chapter = parts[parts.length - 1];
                  onOpenPassage(book, chapter);
                }}
                className="text-[10px] font-bold text-[#996515] uppercase tracking-widest hover:text-[#D4AF37] transition-all pt-2"
              >
                Study {t.ref} →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="space-y-12 pb-32">
        <div className="text-center">
          <h2 className="accent-font text-2xl font-bold gold-gradient-text uppercase tracking-widest">Bible Timeline</h2>
          <p className="text-[10px] text-stone-600 uppercase tracking-[0.4em] mt-2">God's unfolding plan</p>
        </div>
        <div className="relative group">
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -translate-y-1/2 hidden lg:block" />
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-8 overflow-x-auto pb-10 px-4 no-scrollbar scroll-smooth">
            {timeline.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => handleTimelineClick(item)}
                className={`
                  relative lg:w-72 shrink-0 glass-dark border p-8 rounded-[2rem] space-y-4
                  cursor-pointer transition-all duration-300 transform
                  hover:scale-[1.03] hover:border-[#D4AF37]/50 active:scale-95
                  group
                  ${item.highlight ? 'border-[#D4AF37]/40 shadow-[0_0_40px_rgba(212,175,55,0.08)]' : 'border-white/5 shadow-2xl'}
                `}
              >
                {/* Glow layer */}
                <div className="absolute inset-0 bg-[#D4AF37]/0 group-hover:bg-[#D4AF37]/[0.02] rounded-[2rem] transition-all duration-500 shadow-[0_0_20px_rgba(212,175,55,0)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.05)] pointer-events-none" />
                
                <div className="absolute top-6 left-6 text-xl opacity-60 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]">
                  {item.icon}
                </div>
                
                <div className="flex justify-between items-center relative z-10 pt-8">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.3em] ${item.highlight ? 'text-[#D4AF37]' : 'text-stone-500 group-hover:text-[#D4AF37]'}`}>{item.period}</span>
                  <span className="text-[9px] text-stone-700 font-bold">{item.date}</span>
                </div>
                <p className="text-stone-300 text-sm leading-relaxed relative z-10 font-medium">{item.event}</p>
                <div className="pt-4 flex items-center justify-between">
                   <div className="text-[8px] font-bold text-stone-700 uppercase tracking-widest group-hover:text-[#D4AF37] transition-colors relative z-10">
                     Read {item.book} {item.chapter} →
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Event Drawer Overlay / Side Panel */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex flex-col justify-end lg:flex-row lg:justify-end overflow-hidden">
          <div 
            className="fixed inset-0" 
            onClick={closeDrawer} 
          />
          <div className="relative w-full lg:max-w-md h-[85vh] lg:h-full glass-dark border-t lg:border-t-0 lg:border-l border-white/10 rounded-t-[2.5rem] lg:rounded-none p-10 space-y-8 animate-in slide-in-from-bottom-full lg:slide-in-from-right-full duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-y-auto">
            <button onClick={closeDrawer} className="absolute top-6 right-8 text-stone-600 hover:text-white transition-colors p-2 bg-white/5 rounded-full">✕</button>
            
            <header className="space-y-6 pt-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]">{selectedEvent.icon}</span>
                <div>
                  <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest leading-none">{selectedEvent.period}</h2>
                  <p className="text-[9px] text-stone-600 uppercase tracking-[0.4em] mt-2 font-bold">{selectedEvent.date}</p>
                </div>
              </div>
              <div className="h-px w-full bg-white/5" />
              <p className="text-stone-400 text-base italic leading-relaxed font-light">{selectedEvent.summary}</p>
            </header>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">Key Verses</h3>
              <div className="grid gap-2">
                {selectedEvent.keyVerses.map((v, i) => (
                  <button 
                    key={i} 
                    onClick={() => onOpenPassage(v.book, v.chapter, v.verse)}
                    className="flex items-center justify-between px-4 py-3 bg-stone-900 border border-white/5 rounded-xl text-[10px] font-bold text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all active:scale-95"
                  >
                    <span>📖 {v.ref}</span>
                    <span className="text-stone-700">→</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <button 
                onClick={() => setViewingFullDetails(true)}
                className="w-full bg-stone-900 border border-white/10 text-stone-300 font-bold py-5 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-stone-800 transition-all active:scale-95 shadow-xl"
              >
                Learn more about this event
              </button>
              <button 
                onClick={() => onStudyEvent(selectedEvent.period, selectedEvent.book, selectedEvent.chapter)}
                className="w-full bg-[#D4AF37] text-black font-bold py-5 rounded-2xl uppercase tracking-widest text-[10px] shadow-[0_10px_30px_rgba(212,175,55,0.2)] hover:scale-[1.02] transition-all active:scale-95"
              >
                Study this passage with AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 glass-dark border border-[#D4AF37]/40 px-6 py-3 rounded-full text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 z-[100]">
          {toast}
        </div>
      )}
    </div>
  );
};

export default LearningView;
