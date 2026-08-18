
import React, { useState, useEffect } from 'react';
import { Translation } from '../types';
import { getVerse } from '../services/bibleService';
import { getCrossRefs, parseRefString } from '../services/crossReferenceService';

interface CrossReferencePanelProps {
  book: string;
  chapter: string;
  verse: number;
  translation: Translation;
  onOpenVerse: (book: string, chapter: string, verse?: string) => void;
}

interface RefWithText {
  ref: string;
  book: string;
  chapter: string;
  verse: string;
  text: string | null;
  loading: boolean;
}

const CrossReferencePanel: React.FC<CrossReferencePanelProps> = ({
  book,
  chapter,
  verse,
  translation,
  onOpenVerse,
}) => {
  const [items, setItems] = useState<RefWithText[]>([]);
  const [expanded, setExpanded] = useState(true);

  const refs = getCrossRefs(book, chapter, verse);

  useEffect(() => {
    if (refs.length === 0) return;

    const parsed: RefWithText[] = refs
      .map(r => {
        const p = parseRefString(r);
        if (!p) return null;
        return { ref: r, ...p, text: null, loading: true };
      })
      .filter((x): x is RefWithText => x !== null);

    setItems(parsed);

    // Fetch verse texts in parallel
    parsed.forEach(({ ref, book: b, chapter: c, verse: v }, idx) => {
      const verseNum = parseInt(v.split('-')[0], 10);
      getVerse(b, c, verseNum, translation).then(text => {
        setItems(prev =>
          prev.map((item, i) => (i === idx ? { ...item, text, loading: false } : item))
        );
      }).catch(() => {
        setItems(prev =>
          prev.map((item, i) => (i === idx ? { ...item, loading: false } : item))
        );
      });
    });
  }, [book, chapter, verse, translation]);

  if (refs.length === 0) return null;

  return (
    <div className="border-t border-white/5 pt-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between text-left mb-3 group"
      >
        <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
          <span className="text-[#D4AF37]">✦</span> Cross References ({refs.length})
        </span>
        <span className={`text-stone-600 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
          {items.map(item => (
            <button
              key={item.ref}
              onClick={() => onOpenVerse(item.book, item.chapter, item.verse.split('-')[0])}
              className="w-full text-left flex gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group/ref min-h-[44px]"
            >
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider shrink-0 mt-0.5 w-28 leading-snug">
                {item.ref}
              </span>
              <span className="text-xs text-stone-400 leading-snug italic line-clamp-2 group-hover/ref:text-stone-200 transition-colors flex-1">
                {item.loading
                  ? <span className="inline-block w-24 h-3 bg-stone-800 rounded animate-pulse" />
                  : item.text
                    ? item.text.replace(/"/g, '').replace(/ — .+$/, '').slice(0, 120)
                    : item.ref}
              </span>
              <span className="text-stone-700 group-hover/ref:text-stone-400 text-xs shrink-0 self-center">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CrossReferencePanel;
