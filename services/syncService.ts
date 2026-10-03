
import { waitForPuter } from './aiService';
import { storage } from './storageService';

export type ProStatus = 'free' | 'pro';

// Puter's username is a stable id per Puter account — used as our userId
// for Stripe metadata and KV keys. No separate account system needed.
export const getUserId = async (): Promise<string | null> => {
  try {
    const puter = await waitForPuter();
    if (!puter.auth.isSignedIn()) return null;
    const user = await puter.auth.getUser();
    return user.username;
  } catch {
    return null;
  }
};

export const checkProStatus = async (userId: string): Promise<ProStatus> => {
  try {
    const res = await fetch(`/api/get-status?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return 'free';
    const json = await res.json();
    return json.status === 'pro' ? 'pro' : 'free';
  } catch {
    return 'free';
  }
};

export const startCheckout = async (userId: string): Promise<void> => {
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const json = await res.json();
  if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout.');
  window.location.href = json.url;
};

export const openBillingPortal = async (userId: string): Promise<void> => {
  const res = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const json = await res.json();
  if (!res.ok || !json.url) throw new Error(json.error || 'Could not open billing portal.');
  window.location.href = json.url;
};

// Bundles everything storageService keeps in localStorage into one object for sync.
const collectLocalData = () => ({
  bookmarks: storage.getBookmarks(),
  highlights: storage.getHighlights(),
  history: storage.getHistory(),
  notes: storage.getNotes(),
  prayers: storage.getPrayers(),
  settings: storage.getSettings(),
});

// Overwrites local storage with a previously-synced bundle. Used on pull.
const applyRemoteData = (data: ReturnType<typeof collectLocalData>) => {
  localStorage.setItem('hbgpt_bookmarks', JSON.stringify(data.bookmarks ?? []));
  localStorage.setItem('hbgpt_highlights', JSON.stringify(data.highlights ?? []));
  localStorage.setItem('hbgpt_history', JSON.stringify(data.history ?? []));
  localStorage.setItem('hbgpt_notes', JSON.stringify(data.notes ?? {}));
  localStorage.setItem('hbgpt_prayers', JSON.stringify(data.prayers ?? []));
  localStorage.setItem('hbgpt_settings', JSON.stringify(data.settings ?? {}));
};

export const pushSyncData = async (userId: string): Promise<void> => {
  const data = collectLocalData();
  const res = await fetch('/api/sync-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, data }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || 'Sync failed.');
  }
};

// Returns true if remote data existed and was applied, false if there was nothing to pull yet.
export const pullSyncData = async (userId: string): Promise<boolean> => {
  const res = await fetch(`/api/sync-pull?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || 'Sync failed.');
  }
  const json = await res.json();
  if (!json.data) return false;
  applyRemoteData(json.data);
  return true;
};
