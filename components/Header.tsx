import React, { useEffect, useId, useRef, useState } from 'react';
import { ACCOUNTS_ARE_FREE } from '../services/authSession';
import { useAuth } from './AuthProvider';

interface HeaderProps {
  onMenuToggle: () => void;
  onShowSearch: () => void;
}

const controlClass =
  'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all';

const Header: React.FC<HeaderProps> = ({ onMenuToggle, onShowSearch }) => {
  const auth = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [panelOpen, setPanelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = auth.status === 'signed-in' && auth.user;

  useEffect(() => {
    if (!panelOpen && !menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPanelOpen(false);
        setMenuOpen(false);
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPanelOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [panelOpen, menuOpen]);

  useEffect(() => {
    if (panelOpen && auth.error) retryRef.current?.focus();
    else if (panelOpen) panelRef.current?.focus();
  }, [panelOpen, auth.error]);

  const openSignIn = () => {
    setMenuOpen(false);
    if (auth.signingIn) return;
    if (panelOpen) {
      setPanelOpen(false);
      return;
    }
    setPanelOpen(true);
    auth.signIn().then((ok) => {
      if (ok) setPanelOpen(false);
    });
  };

  const initial = signedIn
    ? (auth.user.username.trim().charAt(0) || '•').toUpperCase()
    : '';

  return (
    <header className="glass-dark border-b border-white/5 sticky top-0 z-50 py-2 px-3 sm:px-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className={`${controlClass} shrink-0 bg-white/5 text-stone-500 hover:text-[#D4AF37]`}
          aria-label="Toggle Menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src="/icons/android-chrome-192x192.png"
            alt="Holy Bible GPT logo — The Christian's Deck"
            width={32}
            height={32}
            className="w-8 h-8 shrink-0"
          />
          <a href="/" className="truncate text-[11px] sm:text-lg font-bold accent-font tracking-tight sm:tracking-[0.1em] gold-gradient-text leading-tight uppercase">
            Holy Bible GPT
          </a>
        </div>

        <div className="relative shrink-0" ref={rootRef}>
          {signedIn ? (
            <button
              type="button"
              onClick={() => { setPanelOpen(false); setMenuOpen((open) => !open); }}
              className={`${controlClass} bg-[#D4AF37] text-black text-sm font-bold`}
              aria-label={`Account menu, ${auth.user.username}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span aria-hidden="true">{initial}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openSignIn}
              className={`${controlClass} px-3 bg-[#D4AF37] text-black text-xs font-bold tracking-wide hover:opacity-90`}
              aria-label="Sign in. Accounts are free."
              aria-haspopup="dialog"
              aria-expanded={panelOpen}
              aria-busy={auth.signingIn}
            >
              Sign in
            </button>
          )}

          {signedIn && menuOpen && (
            <div
              role="menu"
              aria-label="Account"
              className="absolute right-0 top-[calc(100%+8px)] z-[80] w-56 rounded-2xl border border-white/10 bg-stone-950 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
            >
              <p className="px-3 py-2 text-xs text-stone-400 truncate">Signed in as {auth.user.username}</p>
              {auth.error && (
                <p role="alert" className="px-3 pb-2 text-xs text-red-300">{auth.error}</p>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => { auth.signOut(); setMenuOpen(false); }}
                className="w-full min-h-[44px] rounded-xl px-3 text-left text-sm font-bold text-stone-100 hover:bg-white/5"
              >
                Sign out
              </button>
            </div>
          )}

          {!signedIn && panelOpen && (
            <div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-labelledby={titleId}
              className="absolute right-0 top-[calc(100%+8px)] z-[80] w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-[#D4AF37]/30 bg-stone-950 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.55)] space-y-3 outline-none"
            >
              <p id={titleId} className="text-sm font-bold text-[#D4AF37]">Sign in</p>
              <p className="text-sm text-stone-200 leading-relaxed">{ACCOUNTS_ARE_FREE}</p>
              {auth.signingIn && (
                <p role="status" className="text-xs text-stone-400">Opening sign-in…</p>
              )}
              {auth.error && (
                <p role="alert" className="text-sm text-red-300 leading-relaxed">{auth.error}</p>
              )}
              {auth.error && (
                <button
                  ref={retryRef}
                  type="button"
                  onClick={() => { auth.signIn(); }}
                  className="w-full min-h-[44px] rounded-xl bg-[#D4AF37] text-black text-xs font-bold tracking-wide"
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onShowSearch}
          className={`${controlClass} shrink-0 bg-white/5 text-stone-500 hover:text-[#D4AF37] text-lg`}
          aria-label="Search Scripture"
        >
          🔍
        </button>
      </div>
    </header>
  );
};

export default Header;
