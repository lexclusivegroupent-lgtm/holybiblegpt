
import React, { useState, useEffect, useRef } from 'react';
import { Role, Message, AppMode, Translation, PassageLink, AppTab } from '../types';
import { sendMessageStream } from '../services/aiService';
import { enrichWithVerseContext } from '../services/bibleService';
import MessageBubble from './MessageBubble';
import { MODE_LABELS } from '../constants';

interface ChatInterfaceProps {
  currentTranslation: Translation;
  onOpenReader: (link: PassageLink) => void;
  currentMode: AppMode;
  pendingQuery?: string | null;
  isVerseSpecific?: boolean;
  onQueryProcessed?: () => void;
  onClose?: () => void;
  onReport?: () => void;
  onTabChange?: (tab: AppTab) => void;
}

// Ordered list of modes shown in the tab bar
const CHAT_MODES: AppMode[] = [
  AppMode.CHAT,
  AppMode.DEEP_STUDY,
  AppMode.SIMPLIFY,
  AppMode.CROSS_REFERENCE,
  AppMode.WORD_STUDY,
  AppMode.APPLY,
  AppMode.CONTEXT,
  AppMode.THEOLOGIAN,
  AppMode.PRAYER_HELP,
  AppMode.DAILY_PLAN,
  AppMode.KIDS,
];

const WELCOME_TEXT =
  `Welcome. Ask any question about God's Word and I will answer from Scripture — King James Bible preferred.\n\nTry: "What does John 3:16 mean?" or "Explain the Sermon on the Mount" or "How do I pray?"`;

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  currentTranslation,
  onOpenReader,
  currentMode,
  pendingQuery,
  isVerseSpecific,
  onQueryProcessed,
  onClose,
  onReport,
  onTabChange,
}) => {
  const [localMode, setLocalMode] = useState<AppMode>(currentMode);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: Role.BOT, text: WELCOME_TEXT, timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync mode when parent changes it (e.g. from verse study action)
  useEffect(() => {
    setLocalMode(currentMode);
  }, [currentMode]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-send a pending query (triggered from BibleReader)
  useEffect(() => {
    if (pendingQuery && !isLoading) {
      handleSend(pendingQuery);
      if (onQueryProcessed) onQueryProcessed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuery]);

  const handleSend = async (text: string = input) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const kidsMode = localMode === AppMode.KIDS;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: trimmed,
      timestamp: Date.now(),
      mode: localMode,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const botId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      { id: botId, role: Role.BOT, text: '', timestamp: Date.now(), mode: localMode },
    ]);

    try {
      // Detect verse refs in the user message and inject the actual KJV text
      const enrichedText = await enrichWithVerseContext(trimmed);

      const history = messages
        .filter(m => m.id !== '0' && m.text.trim())
        .map(m => ({
          role: (m.role === Role.BOT ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.text,
        }));
      history.push({ role: 'user', content: enrichedText });

      await sendMessageStream(
        localMode,
        currentTranslation,
        kidsMode,
        history,
        chunk => {
          setMessages(prev =>
            prev.map(m => (m.id === botId ? { ...m, text: chunk } : m))
          );
        }
      );
    } catch (error: any) {
      const errText = error?.message ?? 'AI is unavailable. Please try again.';
      setMessages(prev =>
        prev.map(m => (m.id === botId ? { ...m, text: errText } : m))
      );
    } finally {
      setIsLoading(false);
      // Restore focus to the input after response
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([{ id: '0', role: Role.BOT, text: WELCOME_TEXT, timestamp: Date.now() }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full w-full bg-black">

      {/* ── Header ── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-stone-900/50 shrink-0">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37] accent-font">
            Bible Study AI
          </h2>
          <p className="text-[9px] text-stone-600 uppercase tracking-widest mt-0.5">
            Free · Powered by Puter.js · KJV Preferred
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            title="Clear conversation"
            className="text-[9px] uppercase tracking-widest text-stone-600 hover:text-stone-400 transition-colors px-2 py-1 rounded border border-stone-800 hover:border-stone-600"
          >
            Clear
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Mode Tabs ── */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-white/5 bg-black/20 shrink-0">
        {CHAT_MODES.map(mode => {
          const m = MODE_LABELS[mode];
          return (
            <button
              key={mode}
              onClick={() => setLocalMode(mode)}
              title={m.description}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all whitespace-nowrap ${
                localMode === mode
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-sm'
                  : 'border-stone-800 text-stone-500 hover:border-stone-600 hover:text-stone-300'
              }`}
            >
              <span aria-hidden="true">{m.icon}</span>
              {m.label}
            </button>
          );
        })}
      </div>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-5"
      >
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onOpenReader={onOpenReader}
            onReport={onReport}
            onUpgrade={() => onTabChange?.('settings')}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-1.5 pl-1">
            {[0, 150, 300].map(delay => (
              <div
                key={delay}
                className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
            <span className="text-[10px] uppercase tracking-widest text-stone-600 ml-2">
              Searching Scripture…
            </span>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="px-4 py-3 border-t border-white/5 bg-stone-900/20 shrink-0">
        <form
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className="flex gap-2 items-end"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about the Bible… (Enter to send)"
            disabled={isLoading}
            rows={1}
            className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-stone-200 bible-font text-base resize-none disabled:opacity-50 leading-relaxed"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
            className="w-11 h-11 mb-0.5 rounded-xl bg-[#D4AF37] text-black font-bold text-lg flex items-center justify-center shrink-0 disabled:bg-stone-800 disabled:text-stone-600 transition-colors"
          >
            ↑
          </button>
        </form>
        <p className="text-[9px] text-stone-700 uppercase tracking-widest text-center mt-2">
          Scripture is the final authority · AI can make mistakes · Always verify with your Bible
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
