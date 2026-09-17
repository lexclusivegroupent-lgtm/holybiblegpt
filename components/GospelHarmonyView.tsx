
import React from 'react';
import { AppTab } from '../types';

interface GospelHarmonyViewProps {
  onOpenPassage: (book: string, chapter: string, verse?: string) => void;
  onTabChange?: (tab: AppTab) => void;
}

const events = [
  { name: "Baptism of Jesus",   matt: "3:13-17",  mark: "1:9-11",   luke: "3:21-22",  john: "1:29-34"  },
  { name: "The Temptation",     matt: "4:1-11",   mark: "1:12-13",  luke: "4:1-13",   john: "-"        },
  { name: "Calling Disciples",  matt: "4:18-22",  mark: "1:16-20",  luke: "5:1-11",   john: "1:35-51"  },
  { name: "Sermon on the Mount",matt: "5:1-7:29", mark: "-",        luke: "6:17-49",  john: "-"        },
  { name: "Calming the Storm",  matt: "8:23-27",  mark: "4:35-41",  luke: "8:22-25",  john: "-"        },
  { name: "Feeding the 5000",   matt: "14:13-21", mark: "6:30-44",  luke: "9:10-17",  john: "6:1-14"   },
  { name: "Transfiguration",    matt: "17:1-8",   mark: "9:2-8",    luke: "9:28-36",  john: "-"        },
  { name: "Triumphal Entry",    matt: "21:1-11",  mark: "11:1-10",  luke: "19:28-40", john: "12:12-19" },
  { name: "Peter's Confession", matt: "16:13-20", mark: "8:27-30",  luke: "9:18-21",  john: "6:66-71"  },
  { name: "The Last Supper",    matt: "26:26-29", mark: "14:22-25", luke: "22:17-20", john: "13:1-30"  },
  { name: "Gethsemane",         matt: "26:36-46", mark: "14:32-42", luke: "22:39-46", john: "18:1"     },
  { name: "Crucifixion",        matt: "27:32-56", mark: "15:21-41", luke: "23:26-49", john: "19:17-37" },
  { name: "Resurrection",       matt: "28:1-10",  mark: "16:1-8",   luke: "24:1-12",  john: "20:1-10"  },
  { name: "Great Commission",   matt: "28:16-20", mark: "16:15-18", luke: "24:44-49", john: "20:21-23" },
];

const GOSPEL_BOOKS: Record<'matt' | 'mark' | 'luke' | 'john', string> = {
  matt: 'Matthew',
  mark: 'Mark',
  luke: 'Luke',
  john: 'John',
};

// "3:13-17" → { chapter: "3", verse: "13" }; "-" → null
const parseRef = (ref: string): { chapter: string; verse: string } | null => {
  if (ref === '-') return null;
  const match = ref.match(/^(\d+):(\d+)/);
  if (!match) return null;
  return { chapter: match[1], verse: match[2] };
};

const GospelHarmonyView: React.FC<GospelHarmonyViewProps> = ({ onOpenPassage }) => {
  const renderCell = (ref: string, book: string) => {
    const parsed = parseRef(ref);
    if (!parsed) {
      return <span className="text-stone-700 select-none">—</span>;
    }
    return (
      <button
        onClick={() => onOpenPassage(book, parsed.chapter, parsed.verse)}
        className="bible-font text-sm text-[#D4AF37]/80 hover:text-[#D4AF37] underline-offset-2 hover:underline transition-colors text-left min-h-[36px] leading-snug"
        title={`Open ${book} ${ref}`}
      >
        {ref}
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-12 max-w-5xl mx-auto w-full space-y-12 pb-32">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Gospel Harmony</h2>
        <p className="text-[10px] text-stone-600 uppercase tracking-[0.4em]">One Life · Four Witnesses</p>
        <p className="text-[9px] text-stone-700 uppercase tracking-widest">Tap any reference to read the passage</p>
      </header>

      <div className="overflow-x-auto glass-dark border border-white/5 rounded-[2rem] shadow-2xl">
        <table className="w-full text-left border-collapse min-w-[480px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-5 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Event</th>
              <th className="p-5 text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Matthew</th>
              <th className="p-5 text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Mark</th>
              <th className="p-5 text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Luke</th>
              <th className="p-5 text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">John</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {events.map((e, idx) => (
              <tr key={idx} className="hover:bg-white/[0.025] transition-colors">
                <td className="p-5 font-bold text-stone-200 text-[11px] uppercase tracking-wider leading-snug">
                  {e.name}
                </td>
                <td className="p-5">{renderCell(e.matt, 'Matthew')}</td>
                <td className="p-5">{renderCell(e.mark, 'Mark')}</td>
                <td className="p-5">{renderCell(e.luke, 'Luke')}</td>
                <td className="p-5">{renderCell(e.john, 'John')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-10 glass-dark border border-[#D4AF37]/20 rounded-[2.5rem] space-y-6 text-center">
        <p className="text-stone-300 text-sm leading-relaxed italic">
          "The variation in details between Gospels demonstrates the authenticity of eyewitness testimony — different perspectives on the same historical Truth."
        </p>
      </div>
    </div>
  );
};

export default GospelHarmonyView;
