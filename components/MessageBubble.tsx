
import React, { useState } from 'react';
import { Message, Role, PassageLink, AppMode } from '../types';

interface MessageBubbleProps {
  message: Message;
  onOpenReader: (link: PassageLink) => void;
  onPray?: (messageText: string) => void;
  onSavePrayer?: (text: string) => void;
}

// Detect lines that are ALL-CAPS section labels, e.g. "SCRIPTURE", "WHAT IS CLEAR"
const isSectionLabel = (line: string): boolean =>
  /^[A-Z][A-Z\s]{2,35}$/.test(line.trim());

// Convert ALL-CAPS label to Sentence case for display
const toSentenceCase = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

// Render a text string with clickable inline Bible references
// Matches: "Romans 8:2", "1 Corinthians 13:4", "Song of Solomon 1:1", "Psalm 119:105"
const renderWithRefs = (
  text: string,
  onOpen: (l: PassageLink) => void
): React.ReactNode => {
  const re = /\b((?:[123]\s+)?(?:Song of )?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(\d+):(\d+(?:-\d+)?)\b/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const [full, book, chapter, verses] = m;
    parts.push(
      <button
        key={m.index}
        onClick={() => onOpen({ book, chapter, verses })}
        className="text-[#D4AF37] underline decoration-dotted underline-offset-2 hover:opacity-75 transition-opacity"
      >
        {full}
      </button>
    );
    last = m.index + full.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
};

const renderBotText = (
  text: string,
  isPrayer: boolean,
  onOpen: (l: PassageLink) => void
) => {
  if (isPrayer) {
    return (
      <p className="bible-font text-xl font-light italic text-stone-300 leading-[1.8] whitespace-pre-wrap">
        {text}
      </p>
    );
  }

  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Empty line → spacing
    if (!trimmed) {
      out.push(<div key={`g${i}`} className="h-2" />);
      i++;
      continue;
    }

    // ALL-CAPS section label
    if (isSectionLabel(trimmed)) {
      out.push(
        <p key={`sl${i}`} className={`text-sm font-bold text-stone-200 mb-1 ${out.length > 0 ? 'mt-5' : 'mt-0'}`}>
          {toSentenceCase(trimmed)}
        </p>
      );
      i++;
      continue;
    }

    // "Key Scriptures" label — skip if nothing follows
    if (/^key scriptures\s*:?$/i.test(trimmed)) {
      const hasContent = lines.slice(i + 1).some(l => l.trim() !== '');
      if (!hasContent) { i++; continue; }
      out.push(
        <p key={`ks${i}`} className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mt-5 mb-1">
          Key Scriptures
        </p>
      );
      i++;
      continue;
    }

    // Scripture verse quote: starts with " or "
    if (/^[""]/.test(trimmed) && trimmed.length > 10) {
      out.push(
        <p key={`vq${i}`} className="bible-font text-xl italic text-stone-100 leading-[1.7] my-2">
          {renderWithRefs(trimmed, onOpen)}
        </p>
      );
      i++;
      continue;
    }

    // Attribution: starts with — and contains a verse reference
    if (/^[—–]/.test(trimmed)) {
      out.push(
        <p key={`at${i}`} className="text-[10px] font-bold text-[#D4AF37] tracking-wide mt-[-4px] mb-2">
          {trimmed}
        </p>
      );
      i++;
      continue;
    }

    // Numbered list: collect consecutive "1. text", "2. text" lines
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      out.push(
        <ol key={`ol${i}`} className="space-y-2 my-2">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5">
              <span className="text-stone-500 text-[11px] font-bold shrink-0 mt-[3px] w-4 text-right leading-tight">{j + 1}.</span>
              <span className="bible-font text-base text-stone-300 leading-relaxed flex-1">
                {renderWithRefs(item, onOpen)}
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular paragraph
    out.push(
      <p key={`p${i}`} className="bible-font text-base text-stone-300 leading-relaxed">
        {renderWithRefs(trimmed, onOpen)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{out}</div>;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onOpenReader, onPray, onSavePrayer }) => {
  const isBot = message.role === Role.BOT;
  const isPrayer = message.mode === AppMode.PRAYER_HELP;
  const isError = message.isError === true;
  const [prayerSaved, setPrayerSaved] = useState(false);

  const parseContent = (text: string) => {
    const links: PassageLink[] = [];
    const regex = /\[link_to_passage\s+book="([^"]+)"\s+chapter="([^"]+)"\s+verses="([^"]+)"\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      links.push({ book: match[1], chapter: match[2], verses: match[3] });
    }
    const cleanText = text.replace(regex, '').trim();
    return { cleanText, links };
  };

  const { cleanText, links } = parseContent(message.text);

  const handleSavePrayer = () => {
    onSavePrayer?.(cleanText);
    setPrayerSaved(true);
  };

  const isWelcome = message.id === '0';

  return (
    <div className={`flex w-full mb-8 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[95%] sm:max-w-[88%] px-5 py-5 rounded-[1.75rem] relative transition-all ${
        isError
          ? 'bg-red-950/30 border border-red-900/40 text-stone-300'
          : isPrayer
            ? 'bg-[#D4AF37]/5 border border-[#D4AF37]/25 shadow-[0_8px_30px_rgba(212,175,55,0.08)] text-stone-200'
            : isBot
              ? 'glass-dark border border-white/5 shadow-xl text-stone-200'
              : 'bg-stone-900 border border-white/10 text-stone-100 font-medium shadow-lg'
      }`}>

        {/* Bot header */}
        {isBot && (
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/5">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center border shadow-inner ${
              isError
                ? 'bg-red-950/50 border-red-900/50'
                : isPrayer
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30'
                  : 'bg-stone-950 border-white/10'
            }`}>
              <span className="text-xs">{isError ? '⚠️' : isPrayer ? '🙏' : <span className="text-[#D4AF37]">♰</span>}</span>
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-[0.3em] ${isError ? 'text-red-400/70' : 'text-stone-600'}`}>
              {isError ? 'Notice' : isPrayer ? 'Scripture Prayer' : 'Study Companion'}
            </span>
          </div>
        )}

        {/* Message body */}
        {isBot && !isError
          ? renderBotText(cleanText, isPrayer, onOpenReader)
          : (
            <div className={`whitespace-pre-wrap leading-relaxed ${
              isBot ? 'bible-font text-lg font-light text-stone-300' : 'text-sm font-medium'
            }`}>
              {cleanText}
            </div>
          )
        }

        {/* Bot footer */}
        {isBot && !isError && (
          <div className="mt-6 pt-4 border-t border-white/5 space-y-4">

            {/* Passage links from [link_to_passage] tags */}
            {links.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {links.map((link, idx) => (
                  <button
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-2 bg-stone-950 border border-[#D4AF37]/20 rounded-xl text-[9px] font-bold text-[#D4AF37] hover:border-[#D4AF37]/50 hover:bg-stone-900 transition-all shadow-md min-h-[36px]"
                    onClick={() => onOpenReader(link)}
                  >
                    📖 Read {link.book} {link.chapter}
                  </button>
                ))}
              </div>
            )}

            {/* Pray about this */}
            {!isWelcome && !isPrayer && cleanText.trim().length > 30 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onPray?.(cleanText)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-bold text-stone-500 border border-white/5 hover:text-[#D4AF37] hover:border-[#D4AF37]/20 transition-all min-h-[34px]"
                >
                  🙏 Pray about this
                </button>
              </div>
            )}

            {/* Save prayer */}
            {isPrayer && (
              <button
                onClick={handleSavePrayer}
                disabled={prayerSaved}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all min-h-[36px] ${
                  prayerSaved
                    ? 'text-emerald-500 border border-emerald-500/30 bg-emerald-500/5'
                    : 'text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/10'
                }`}
              >
                {prayerSaved ? '✓ Saved to Journal' : '🙏 Save to Prayer Journal'}
              </button>
            )}

            {/* Trust line */}
            <div className={`flex items-start gap-2 py-2 px-3 rounded-xl ${
              isPrayer ? 'bg-[#D4AF37]/5 border border-[#D4AF37]/10' : 'bg-stone-900/50 border border-white/5'
            }`}>
              <span className="text-[10px] shrink-0 mt-0.5">✝️</span>
              <p className="text-[9px] text-stone-500 leading-snug">
                {isPrayer
                  ? 'This prayer is inspired by Scripture. Speak to God in your own words. The Holy Spirit intercedes for you.'
                  : 'Scripture is the final authority. This AI is a study aid — always verify with your Bible, pray, and seek your church community.'
                }
              </p>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className={`mt-3 text-[8px] ${isBot ? 'text-stone-800' : 'text-stone-600'} uppercase font-bold tracking-widest`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
