import React from 'react';
import { BIBLE_BOOKS } from '../services/bibleService';
import { bookPath, chapterPath } from '../services/routes.mjs';

interface BookIndexViewProps {
  book: string;
  onOpenChapter: (chapter: string) => void;
  onOpenBook: (book: string) => void;
  onHome: () => void;
}

const BookIndexView: React.FC<BookIndexViewProps> = ({ book, onOpenChapter, onOpenBook, onHome }) => {
  const current = BIBLE_BOOKS.find((item) => item.name === book);
  const index = BIBLE_BOOKS.findIndex((item) => item.name === book);
  const previous = index > 0 ? BIBLE_BOOKS[index - 1] : null;
  const next = index >= 0 && index < BIBLE_BOOKS.length - 1 ? BIBLE_BOOKS[index + 1] : null;
  if (!current) {
    return <p className="p-8 text-stone-400">That book is not in the King James Version on this site.</p>;
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-10 max-w-3xl mx-auto w-full space-y-8">
      <nav aria-label="Breadcrumb" className="text-[10px] uppercase tracking-widest text-stone-400">
        <a href="/" onClick={(event) => { event.preventDefault(); onHome(); }} className="hover:text-[#D4AF37]">Home</a>
        <span> / </span>
        <span>{book}</span>
      </nav>
      <header className="space-y-2">
        <h1 className="accent-font text-4xl font-bold gold-gradient-text uppercase tracking-widest">{book}</h1>
        <p className="text-xs text-stone-500">King James Version, public domain. {current.chapters} chapters.</p>
      </header>
      <nav aria-label="Chapters" className="flex flex-wrap gap-2">
        {Array.from({ length: current.chapters }, (_, i) => String(i + 1)).map((chapter) => (
          <a
            key={chapter}
            href={chapterPath(book, chapter)}
            onClick={(event) => {
              event.preventDefault();
              onOpenChapter(chapter);
            }}
            className="min-w-12 text-center text-xs font-bold text-stone-200 border border-white/10 rounded-lg px-3 py-2 hover:text-[#D4AF37]"
          >
            {chapter}
          </a>
        ))}
      </nav>
      <nav className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest">
        {previous && <a href={bookPath(previous.name)} onClick={(event) => { event.preventDefault(); onOpenBook(previous.name); }} className="text-stone-400 hover:text-[#D4AF37]">{previous.name}</a>}
        {next && <a href={bookPath(next.name)} onClick={(event) => { event.preventDefault(); onOpenBook(next.name); }} className="text-stone-400 hover:text-[#D4AF37]">{next.name}</a>}
      </nav>
    </div>
  );
};

export default BookIndexView;
