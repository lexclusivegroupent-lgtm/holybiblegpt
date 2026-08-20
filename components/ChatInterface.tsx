
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Role, Message, AppMode, Translation, PassageLink, AppTab } from '../types';
import { sendMessageStream, getPuterAuthState, signIntoPuter, isAuthError, PuterStatus } from '../services/aiService';
import { enrichWithVerseContext } from '../services/bibleService';
import { storage } from '../services/storageService';
import MessageBubble from './MessageBubble';
import { MODE_LABELS } from '../constants';

interface ChatInterfaceProps {
  currentTranslation: Translation;
  onTranslationChange?: (t: Translation) => void;
  onOpenReader: (link: PassageLink) => void;
  currentMode: AppMode;
  pendingQuery?: string | null;
  onQueryProcessed?: () => void;
  onClose?: () => void;
  onReport?: () => void;
  onTabChange?: (tab: AppTab) => void;
  readingContext?: string;
}

const CHAT_MODES: AppMode[] = [
  AppMode.CHAT, AppMode.DEEP_STUDY, AppMode.SIMPLIFY, AppMode.CROSS_REFERENCE,
  AppMode.WORD_STUDY, AppMode.APPLY, AppMode.CONTEXT, AppMode.THEOLOGIAN,
  AppMode.PRAYER_HELP, AppMode.DAILY_PLAN, AppMode.KIDS,
];

const WELCOME =
  `Welcome. Ask any question about God's Word.\n\nExamples:\n• "What does John 3:16 mean?"\n• "Explain the Sermon on the Mount"\n• "How do I deal with fear according to the Bible?"`;

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  currentTranslation,
  onTranslationChange,
  onOpenReader,
  currentMode,
  pendingQuery,
  onQueryProcessed,
  onClose,
  onReport,
  onTabChange,
  readingContext,
}) => {
  const [localMode, setLocalMode] = useState<AppMode>(currentMode);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: Role.BOT, text: WELCOME, timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [puterStatus, setPuterStatus] = useState<PuterStatus>('checking');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingProcessed = useRef(false);

  // Check Puter auth state on mount
  useEffect(() => {
    getPuterAuthState().then(status => setPuterStatus(status));
  }, []);

  useEffect(() => { setLocalMode(currentMode); }, [currentMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (pendingQuery && !isLoading && !pendingProcessed.current) {
      pendingProcessed.current = true;
      handleSend(pendingQuery).then(() => {
        pendingProcessed.current = false;
        onQueryProcessed?.();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuery]);

  const handlePuterSignIn = async () => {
    setIsSigningIn(true);
    setSignInError(null);
    try {
      await signIntoPuter();
      // Confirm sign-in actually succeeded
      const status = await getPuterAuthState();
      setPuterStatus(status);
      if (status !== 'ready') {
        setSignInError('Sign-in was not completed. Please try again.');
      }
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.toLowerCase().includes('popup') || msg.toLowerCase().includes('blocked')) {
        setSignInError(
          'Pop-up was blocked by your browser. Allow pop-ups for this site in browser settings, then try again.'
        );
      } else {
        setSignInError(msg || 'Sign-in failed. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSend = useCallback(async (text: string = input, modeOverride?: AppMode) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const activeMode = modeOverride ?? localMode;
    const kidsMode = activeMode === AppMode.KIDS;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: trimmed,
      timestamp: Date.now(),
      mode: activeMode,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const botId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      { id: botId, role: Role.BOT, text: '', timestamp: Date.now(), mode: activeMode },
    ]);

    try {
      const enriched = await enrichWithVerseContext(trimmed, currentTranslation);

      const history = messages
        .filter(m => m.id !== '0' && m.text.trim())
        .map(m => ({
          role: (m.role === Role.BOT ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.text,
        }));
      history.push({ role: 'user', content: enriched });

      await sendMessageStream(activeMode, currentTranslation, kidsMode, history, chunk => {
        setMessages(prev =>
          prev.map(m => (m.id === botId ? { ...m, text: chunk } : m))
        );
      });
    } catch (err: any) {
      const errText = err?.message ?? 'AI is temporarily unavailable. Please try again in a moment.';
      // If the error signals an auth problem, surface the sign-in banner again
      if (isAuthError(errText)) {
        setPuterStatus('needs-signin');
      }
      setMessages(prev =>
        prev.map(m =>
          m.id === botId
            ? { ...m, text: errText, isError: true }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, isLoading, localMode, currentTranslation, messages]);

  const handlePray = useCallback((messageText: string) => {
    const prompt = `Based on this Scripture teaching, write a short prayer:\n\n"${messageText.slice(0, 400)}"`;
    handleSend(prompt, AppMode.PRAYER_HELP);
  }, [handleSend]);

  const handleSavePrayer = useCallback((text: string) => {
    storage.savePrayer({
      id: crypto.randomUUID(),
      title: `Prayer — ${new Date().toLocaleDateString()}`,
      text,
      category: 'Growth',
      timestamp: Date.now(),
      isAnswered: false,
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([{ id: '0', role: Role.BOT, text: WELCOME, timestamp: Date.now() }]);
    setInput('');
  };

  const needsSignIn = puterStatus === 'needs-signin';
  const loadFailed = puterStatus === 'load-failed';
  const isReady = puterStatus === 'ready';
  const inputDisabled = isLoading || needsSignIn || loadFailed;

  return (
    <div className="flex flex-col h-full w-full bg-black">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-stone-900/50 shrink-0">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37] accent-font">
            Bible Study AI
          </h2>
          {readingContext ? (
            <p className="text-[9px] text-stone-600 uppercase tracking-widest mt-0.5">
              Studying {readingContext}
            </p>
          ) : (
            <p className="text-[9px] text-stone-600 uppercase tracking-widest mt-0.5">
              {isReady ? 'Free · Scripture First' : puterStatus === 'checking' ? 'Connecting…' : 'Sign in to continue'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onTranslationChange && (
            <div className="flex rounded-lg border border-stone-800 overflow-hidden text-[10px] font-bold uppercase tracking-wider">
              {(['KJV', 'ESV'] as const).map((t, i) => (
                <button
                  key={t}
                  onClick={() => onTranslationChange(t as Translation)}
                  className={`px-2.5 py-1 transition-colors ${i > 0 ? 'border-l border-stone-800' : ''} ${
                    currentTranslation === t
                      ? 'bg-[#D4AF37] text-black'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleClear}
            title="Clear conversation"
            className="text-[9px] uppercase tracking-widest text-stone-600 hover:text-stone-400 transition-colors px-2 py-1 rounded border border-stone-800 hover:border-stone-600 min-h-[32px]"
          >
            Clear
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Mode Tabs ───────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-white/5 bg-black/20 shrink-0 no-scrollbar">
        {CHAT_MODES.map(mode => {
          const m = MODE_LABELS[mode];
          return (
            <button
              key={mode}
              onClick={() => setLocalMode(mode)}
              title={m.description}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all whitespace-nowrap ${
                localMode === mode
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                  : 'border-stone-800 text-stone-500 hover:border-stone-600 hover:text-stone-300'
              }`}
            >
              <span aria-hidden="true">{m.icon}</span>
              {m.label}
            </button>
          );
        })}
      </div>

      {/* ── Puter Sign-in Banner ─────────────────────────────────────────── */}
      {(needsSignIn || loadFailed) && (
        <div className="mx-4 mt-4 p-4 rounded-2xl border shrink-0 space-y-3
          bg-[#D4AF37]/5 border-[#D4AF37]/20">

          {needsSignIn ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔑</span>
                <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                  Free Sign-In Required
                </p>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Holy Bible GPT uses <strong className="text-stone-300">Puter</strong> for free, unlimited AI — no subscription needed. Create a free Puter account to unlock the full study experience.
              </p>
              <p className="text-[10px] text-stone-600 leading-snug">
                ⚠️ When prompted, <strong className="text-stone-500">allow pop-ups</strong> for this site so the sign-in window can open.
              </p>
              {signInError && (
                <p className="text-[10px] text-red-400/80 leading-snug border border-red-900/30 bg-red-950/20 rounded-xl px-3 py-2">
                  {signInError}
                </p>
              )}
              <button
                onClick={handlePuterSignIn}
                disabled={isSigningIn}
                className="w-full min-h-[44px] bg-[#D4AF37] text-black text-[10px] font-bold uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSigningIn ? (
                  <>
                    <span className="w-3 h-3 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                    Opening sign-in…
                  </>
                ) : (
                  '🔑 Sign In to Puter (Free)'
                )}
              </button>
              <p className="text-[9px] text-stone-700 text-center">
                puter.com · free forever · no credit card
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <p className="text-xs font-bold text-red-400/80 uppercase tracking-wider">
                  AI Service Unavailable
                </p>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                The AI service failed to load. Please check your internet connection and refresh the page.
              </p>
              <button
                onClick={() => { setPuterStatus('checking'); getPuterAuthState().then(s => setPuterStatus(s)); }}
                className="w-full min-h-[44px] border border-white/10 text-stone-500 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:text-white hover:border-white/20 transition-colors"
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Messages ────────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onOpenReader={onOpenReader}
            onPray={handlePray}
            onSavePrayer={handleSavePrayer}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-1.5 pl-1 py-2">
            {[0, 150, 300].map(d => (
              <div
                key={d}
                className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
            <span className="text-[10px] uppercase tracking-widest text-stone-600 ml-2">
              Searching Scripture…
            </span>
          </div>
        )}
      </div>

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-white/5 bg-stone-900/20 shrink-0">
        <form
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className="flex gap-2 items-end"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              needsSignIn
                ? 'Sign in above to ask questions…'
                : loadFailed
                  ? 'AI service unavailable — please refresh'
                  : puterStatus === 'checking'
                    ? 'Connecting to AI…'
                    : 'Ask anything about the Bible… (Enter to send)'
            }
            disabled={inputDisabled}
            rows={1}
            className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-stone-200 bible-font text-base resize-none disabled:opacity-40 leading-relaxed"
            style={{ minHeight: '48px', maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            type="submit"
            disabled={inputDisabled || !input.trim()}
            aria-label="Send"
            className="w-11 h-11 mb-0.5 rounded-xl bg-[#D4AF37] text-black font-bold text-lg flex items-center justify-center shrink-0 disabled:bg-stone-800 disabled:text-stone-600 transition-colors"
          >
            ↑
          </button>
        </form>
        <p className="text-[9px] text-stone-700 uppercase tracking-widest text-center mt-2">
          Scripture is the final authority · AI can make mistakes · Verify with your Bible
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
