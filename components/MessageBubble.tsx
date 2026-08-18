
import React, { useState } from 'react';
import { Message, Role, PassageLink, AppMode } from '../types';

interface MessageBubbleProps {
  message: Message;
  onOpenReader: (link: PassageLink) => void;
  onPray?: (messageText: string) => void;
  onSavePrayer?: (text: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onOpenReader, onPray, onSavePrayer }) => {
  const isBot = message.role === Role.BOT;
  const isPrayer = message.mode === AppMode.PRAYER_HELP;
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

  return (
    <div className={`flex w-full mb-8 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[95%] sm:max-w-[85%] px-5 py-5 rounded-[1.75rem] relative transition-all ${
        isPrayer
          ? 'bg-[#D4AF37]/5 border border-[#D4AF37]/25 shadow-[0_8px_30px_rgba(212,175,55,0.08)] text-stone-200'
          : isBot
            ? 'glass-dark border border-white/5 shadow-xl text-stone-200'
            : 'bg-stone-900 border border-white/10 text-stone-100 font-medium shadow-lg'
      }`}>

        {/* Bot / Prayer header */}
        {isBot && (
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center border shadow-inner ${
                isPrayer
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30'
                  : 'bg-stone-950 border-white/10'
              }`}>
                <span className="text-[#D4AF37] text-xs">{isPrayer ? '🙏' : '♰'}</span>
              </div>
              <span className="text-[9px] font-bold text-stone-600 uppercase tracking-[0.3em]">
                {isPrayer ? 'Scripture Prayer' : 'Holy Bible GPT'}
              </span>
            </div>
          </div>
        )}

        {/* Message text */}
        <div className={`whitespace-pre-wrap leading-relaxed ${
          isPrayer
            ? 'bible-font text-lg font-light italic text-stone-300'
            : isBot
              ? 'bible-font text-lg font-light'
              : 'text-sm font-medium'
        }`}>
          {cleanText}
        </div>

        {/* Bot footer */}
        {isBot && (
          <div className="mt-6 pt-4 border-t border-white/5 space-y-4">

            {/* Passage links */}
            {links.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {links.map((link, idx) => (
                  <button
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-2 bg-stone-950 border border-white/5 rounded-xl text-[9px] font-bold text-[#D4AF37] hover:border-[#D4AF37]/40 hover:bg-stone-900 transition-all shadow-md min-h-[36px]"
                    onClick={() => onOpenReader(link)}
                  >
                    📖 {link.book} {link.chapter}
                  </button>
                ))}
              </div>
            )}

            {/* Prayer actions */}
            {isPrayer ? (
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
            ) : (
              /* Pray button for regular responses */
              message.id !== '0' && message.text.trim().length > 20 && (
                <button
                  onClick={() => onPray?.(cleanText)}
                  className="flex items-center gap-1.5 text-[9px] font-bold text-stone-600 uppercase tracking-widest hover:text-[#D4AF37] transition-colors"
                >
                  <span>🙏</span> Pray about this
                </button>
              )
            )}

            {/* Disclaimer */}
            <p className="text-[9px] text-stone-700 italic">
              {isPrayer ? 'Prayer inspired by Scripture · Saved to Prayer Journal' : 'Check everything with Scripture · AI makes mistakes'}
            </p>
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
