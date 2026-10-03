
import React, { useState } from 'react';

interface ReferencedBook {
  title: string;
  shortDesc: string;
  mentionVerse: string;
  mentionRef: { book: string; chapter: string; verse: string };
  scholarlyExplanation: string;
  status: 'Lost' | 'Later Tradition' | 'Partially Preserved';
  laterTraditionNote?: string;
}

interface ReferencedViewProps {
  onOpenPassage: (book: string, chapter: string, verse?: string) => void;
}

const ReferencedView: React.FC<ReferencedViewProps> = ({ onOpenPassage }) => {
  const [selectedBook, setSelectedBook] = useState<ReferencedBook | null>(null);

  const referencedBooks: ReferencedBook[] = [
    {
      title: "Book of Jasher",
      shortDesc: "A non-canonical book mentioned as a source for heroic poetry and historical accounts.",
      mentionVerse: "And the sun stood still, and the moon stayed, until the people had avenged themselves upon their enemies. Is not this written in the book of Jasher?",
      mentionRef: { book: "Joshua", chapter: "10", verse: "13" },
      scholarlyExplanation: "Scholars believe this was a collection of poems or songs celebrating Israel's military victories. It is also mentioned in 2 Samuel 1:18 regarding the 'Song of the Bow.'",
      status: "Later Tradition",
      laterTraditionNote: "This is a later writing (often from the 18th century or medieval periods) that uses the same name. It is not the original book mentioned in Scripture."
    },
    {
      title: "Book of the Wars of the Lord",
      shortDesc: "An ancient collection of poems or records documenting the early battles of the Israelites.",
      mentionVerse: "Wherefore it is said in the book of the wars of the LORD, What he did in the Red sea, and in the brooks of Arnon...",
      mentionRef: { book: "Numbers", chapter: "21", verse: "14" },
      scholarlyExplanation: "A lost source that likely contained poetic accounts of Israel's journey through the wilderness and their conquest of Canaan.",
      status: "Lost"
    },
    {
      title: "Book of Samuel the Seer",
      shortDesc: "A historical record attributed to the prophet Samuel.",
      mentionVerse: "Now the acts of David the king, first and last, behold, they are written in the book of Samuel the seer...",
      mentionRef: { book: "1 Chronicles", chapter: "29", verse: "29" },
      scholarlyExplanation: "It is widely believed that much of the content of this 'book' was incorporated into the biblical books of 1 and 2 Samuel.",
      status: "Partially Preserved"
    },
    {
      title: "Book of Nathan the Prophet",
      shortDesc: "A prophetic and historical account covering the reigns of David and Solomon.",
      mentionVerse: "...and in the book of Nathan the prophet, and in the book of Gad the seer.",
      mentionRef: { book: "1 Chronicles", chapter: "29", verse: "29" },
      scholarlyExplanation: "Nathan was a close advisor to David and Solomon. His writings likely provided detailed court records and prophetic insights now lost or merged into 1 & 2 Samuel and 1 & 2 Kings.",
      status: "Lost"
    },
    {
      title: "Book of Gad the Seer",
      shortDesc: "A history of King David's reign written by the prophet Gad.",
      mentionVerse: "...behold, they are written in the book of Samuel the seer, and in the book of Nathan the prophet, and in the book of Gad the seer.",
      mentionRef: { book: "1 Chronicles", chapter: "29", verse: "29" },
      scholarlyExplanation: "Gad accompanied David during his time as a fugitive. His book would have provided a first-hand account of David's early struggles and his later establishment of the kingdom.",
      status: "Lost"
    },
    {
      title: "Acts of Solomon",
      shortDesc: "A detailed record of Solomon's wisdom and deeds.",
      mentionVerse: "And the rest of the acts of Solomon, and all that he did, and his wisdom, are they not written in the book of the acts of Solomon?",
      mentionRef: { book: "1 Kings", chapter: "11", verse: "41" },
      scholarlyExplanation: "Likely a court record or an early biography of Solomon used by the author of 1 Kings as a primary source.",
      status: "Lost"
    }
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-5xl mx-auto w-full space-y-12">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Referenced but not Included</h2>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mx-auto" />
      </header>

      <div className="glass-dark border border-white/10 p-6 rounded-2xl text-center space-y-3">
        <p className="text-stone-400 text-xs leading-relaxed italic">
          “These are books mentioned in the Bible but not preserved as part of the Holy Scriptures. Some are lost. Some exist only in later writings. They are not inspired Scripture. They are listed here to help you understand references in the Bible.”
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {referencedBooks.map((book, i) => (
          <button
            key={i}
            onClick={() => setSelectedBook(book)}
            className="text-left glass-dark border border-white/5 p-6 rounded-3xl space-y-4 hover:border-[#D4AF37]/40 transition-all group active:scale-95"
          >
            <div className="flex justify-between items-start">
              <span className={`text-[9px] font-bold uppercase tracking-widest ${
                book.status === 'Lost' ? 'text-stone-600' : 'text-[#D4AF37]'
              }`}>
                {book.status}
              </span>
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-stone-500 group-hover:text-[#D4AF37] transition-colors">
                📜
              </div>
            </div>
            <h3 className="text-lg font-bold text-stone-100 group-hover:text-[#D4AF37] transition-colors">{book.title}</h3>
            <p className="text-stone-500 text-xs leading-relaxed line-clamp-2">{book.shortDesc}</p>
            <div className="text-[9px] font-bold text-stone-700 uppercase tracking-widest">
              Learn Context →
            </div>
          </button>
        ))}
      </div>

      {selectedBook && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <div className="relative w-full max-w-2xl glass-dark border border-white/10 rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setSelectedBook(null)}
              className="absolute top-6 right-8 text-stone-600 hover:text-white transition-colors"
            >
              ✕
            </button>

            <header className="space-y-2">
              <div className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.4em]">Historical Reference</div>
              <h2 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">{selectedBook.title}</h2>
              <span className={`text-[10px] font-bold uppercase tracking-widest block ${
                selectedBook.status === 'Lost' ? 'text-stone-600' : 'text-emerald-500'
              }`}>
                Current Status: {selectedBook.status}
              </span>
            </header>

            <section className="space-y-6">
              <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/10 p-6 rounded-2xl italic bible-font text-lg text-stone-300">
                "{selectedBook.mentionVerse}"
                <button 
                  onClick={() => onOpenPassage(selectedBook.mentionRef.book, selectedBook.mentionRef.chapter, selectedBook.mentionRef.verse)}
                  className="block mt-4 text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest hover:underline"
                >
                  — {selectedBook.mentionRef.book} {selectedBook.mentionRef.chapter}:{selectedBook.mentionRef.verse}
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">Scholar's View</h4>
                <p className="text-stone-400 text-sm leading-relaxed">{selectedBook.scholarlyExplanation}</p>
              </div>

              {selectedBook.laterTraditionNote && (
                <div className="p-4 bg-red-900/10 border border-red-900/20 rounded-xl">
                  <p className="text-xs text-red-400/80 italic leading-relaxed">
                    “{selectedBook.laterTraditionNote}”
                  </p>
                </div>
              )}
            </section>

            <footer className="pt-4 flex justify-center">
              <button 
                onClick={() => setSelectedBook(null)}
                className="px-12 py-4 bg-stone-900 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white hover:border-white/20 transition-all"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferencedView;
