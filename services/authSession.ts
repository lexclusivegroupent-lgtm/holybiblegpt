// Small helpers for the optional Puter account. Reading, search, and the
// study helper stay available without an account. These helpers only remember
// where a person was, and turn sign-in failures into plain sentences.

export const RETURN_PATH_KEY = 'hbgpt_auth_return';
export const AUTH_CHANGED_EVENT = 'hbgpt-auth-changed';

export const ACCOUNTS_ARE_FREE =
  'Accounts are free. This opens sign-in and sign-up. Reading, search, and AI stay open either way.';

export const SAVE_ACROSS_DEVICES =
  'Sign in to save this across your devices.';

export interface PathStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function isSafeReturnPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return false;
  if (path.includes('://')) return false;
  if (/[\u0000-\u001F]/.test(path)) return false;
  return true;
}

export function rememberReturnPath(path: string, store: PathStore): void {
  if (!isSafeReturnPath(path)) return;
  store.setItem(RETURN_PATH_KEY, path);
}

export function readReturnPath(store: PathStore): string | null {
  const value = store.getItem(RETURN_PATH_KEY);
  if (!value || !isSafeReturnPath(value)) return null;
  return value;
}

export function clearReturnPath(store: PathStore): void {
  store.removeItem(RETURN_PATH_KEY);
}

export function currentLocationPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

// Returns true when the saved path was applied.
export function restoreReturnPath(
  store: PathStore,
  apply: (path: string) => void,
  currentPath: string,
): boolean {
  const saved = readReturnPath(store);
  if (!saved) return false;
  clearReturnPath(store);
  if (saved === currentPath) return false;
  apply(saved);
  return true;
}

export function restoreAuthReturnPath(): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    restoreReturnPath(
      window.sessionStorage,
      (path) => { window.history.replaceState(null, '', path); },
      currentLocationPath(),
    );
  } catch {
    // Storage can be blocked. Staying on the current page is fine.
  }
}

export type SignInFailureKind = 'popup-blocked' | 'unavailable' | 'failed';

export function classifySignInError(error: unknown): { kind: SignInFailureKind; message: string } {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const msg = raw.toLowerCase();

  if (
    msg.includes('popup') ||
    msg.includes('pop-up') ||
    msg.includes('pop up') ||
    (msg.includes('blocked') && (msg.includes('window') || msg.includes('pop')))
  ) {
    return {
      kind: 'popup-blocked',
      message: 'The sign-in window was blocked. Allow pop-ups for this site, then try again.',
    };
  }

  if (
    msg.includes('could not load') ||
    msg.includes('too long to load') ||
    msg.includes('took too long') ||
    msg.includes('internet') ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('offline')
  ) {
    return {
      kind: 'unavailable',
      message: 'Sign-in could not open just now. Check your connection, then try again.',
    };
  }

  return {
    kind: 'failed',
    message: 'Sign-in did not finish. You can try again whenever you like.',
  };
}

export function notifyAuthChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
