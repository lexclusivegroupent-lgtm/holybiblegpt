
import React, { useState } from 'react';
import { Message, Role, PassageLink, AppMode } from '../types';

interface MessageBubbleProps {
  message: Message;
  onOpenReader: (link: PassageLink) => void;
  onPray?: (messageText: string) => void;
  onSavePrayer?: (text: string) => void;
}

// Detect lines that are Scripture quotations so they can be styled prominently
const isScriptureLine = (line: string): boolean => {
  const t = line.trim();
  return (t.startsWith('"') || t.startsWith('“')) && t.length > 10;
};

const isRefLine = (line: string): boolean => {
  const t = line.trim();
  return /^[—–-]\s/.test(t) && /\d+:\d+/.test(t);
};

const renderText = (text: string, isPrayer: boolean) => {
  if (isPrayer) {
    return (
      <p className="bible-font text-xl font-light italic text-stone-300 leading-[1.8] whitespace-pre-wrap">
        {text}
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        if (isScriptureLine(line)) {
          return (
            <div key={i} className="my-4 pl-4 border-l-2 border-[#D4AF37]/50 bg-[#D4AF37]/4 rounded-r-lg py-1">
              <p className="bible-font text-xl italic text-stone-100 leading-[1.7]">{line}</p>
            </div>
          );
        }

        if (isRefLine(line)) {
          return (
            <p key={i} className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider mt-[-6px] mb-3 pl-4">
              {line}
            </p>
          );
        }

        if (/^key scriptures:/i.test(line.trim())) {
          return (
            <p key={i} className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mt-5 mb-1">
              {line}
            </p>
          );
        }

        return (
          <p key={i} className="bible-font text-base text-stone-300 leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
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
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
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
          </div>
        )}

        {/* Message text — Scripture-first visual hierarchy */}
        {isBot && !isError
          ? renderText(cleanText, isPrayer)
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

            {/* Passage links — one-tap "Read full chapter" */}
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

            {/* Next steps row */}
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

            {/* Prayer actions */}
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

            {/* Permanent trust line — always visible */}
            <div className={`flex items-start gap-2 py-2 px-3 rounded-xl ${
              isPrayer
                ? 'bg-[#D4AF37]/5 border border-[#D4AF37]/10'
                : 'bg-stone-900/50 border border-white/5'
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
