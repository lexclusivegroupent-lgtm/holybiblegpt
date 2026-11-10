import React from 'react';
import { BIBLE_BOOKS } from '../services/bibleService';
import { bookPath } from '../services/routes.mjs';

interface BibleBookLinksProps {
  onOpenBook: (book: string) => void;
}

const BibleBookLinks: React.FC<BibleBookLinksProps> = ({ onOpenBook }) => {
  return (
    <nav aria-label="Books of the Bible" className="glass-dark border border-white/5 rounded-[2rem] p-6 space-y-4">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">Books of the Bible</h2>
      <div className="flex flex-wrap gap-2">
        {BIBLE_BOOKS.map((book) => (
          <a
            key={book.name}
            href={bookPath(book.name)}
            onClick={(event) => {
              event.preventDefault();
              onOpenBook(book.name);
            }}
            className="text-[10px] font-bold uppercase tracking-wider text-stone-300 border border-white/10 rounded-lg px-3 py-2 hover:text-[#D4AF37] hover:border-[#D4AF37]/40"
          >
            {book.name}
          </a>
        ))}
      </div>
    </nav>
  );
};

export default BibleBookLinks;
