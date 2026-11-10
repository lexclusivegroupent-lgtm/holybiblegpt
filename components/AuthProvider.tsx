import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_CHANGED_EVENT, notifyAuthChanged } from '../services/authSession';
import { getPuterAuthState, signIntoPuter, waitForPuter } from '../services/aiService';
import { getUserId } from '../services/syncService';

export interface AuthUser {
  username: string;
}

interface AuthContextValue {
  status: 'checking' | 'signed-out' | 'signed-in';
  user: AuthUser | null;
  signingIn: boolean;
  error: string | null;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthContextValue['status']>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await getPuterAuthState();
    if (next !== 'ready') {
      setUser(null);
      setStatus('signed-out');
      return;
    }
    const id = await getUserId();
    setUser({ username: id || 'Account' });
    setStatus('signed-in');
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh().catch(() => {
      if (!cancelled) setStatus('signed-out');
    });
    const onChange = () => { refresh(); };
    window.addEventListener(AUTH_CHANGED_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_CHANGED_EVENT, onChange);
    };
  }, [refresh]);

  const signIn = useCallback(async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signIntoPuter();
      await refresh();
      const ready = (await getPuterAuthState()) === 'ready';
      if (!ready) {
        setError('Sign-in did not finish. You can try again whenever you like.');
        return false;
      }
      setError(null);
      return true;
    } catch (e: unknown) {
      const message = e instanceof Error && e.message
        ? e.message
        : 'Sign-in did not finish. You can try again whenever you like.';
      setError(message);
      return false;
    } finally {
      setSigningIn(false);
    }
  }, [refresh]);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      const puter = await waitForPuter();
      await puter.auth.signOut();
    } catch {
      setError('Sign-out did not finish. You can try again.');
      return;
    }
    setUser(null);
    setStatus('signed-out');
    notifyAuthChanged();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    signingIn,
    error,
    signIn,
    signOut,
    clearError,
  }), [status, user, signingIn, error, signIn, signOut, clearError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
