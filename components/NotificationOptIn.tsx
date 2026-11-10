import React, { useEffect, useState } from 'react';
import { subscriptionNeedsRotation } from '../services/pushKey.mjs';

// Public VAPID key — safe to ship client-side (it's the public half of the
// keypair; only VAPID_PRIVATE_KEY on the server is secret). Must match the
// VAPID_PUBLIC_KEY configured in the server's env vars or push sends will fail.
const VAPID_PUBLIC_KEY = 'BHs3h3Uf6SZS0-lWBqR8N4exZYiTg9wO_omqKyVt7zApL9uW0qJy4K6itjh2O0b7-HlO2TJwuk6ealDFKJkq9rU';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type Status = 'unsupported' | 'checking' | 'off' | 'on' | 'busy' | 'denied';

function applicationServerKey(): Uint8Array {
  return urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
}

async function forgetSubscription(sub: PushSubscription): Promise<void> {
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await fetch('/api/push-unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  }).catch(() => undefined);
}

// subscribe() throws InvalidStateError when this browser already has a
// subscription for a different VAPID key. Drop that one and subscribe again.
async function subscribeCurrentKey(reg: ServiceWorkerRegistration): Promise<PushSubscription> {
  const key = applicationServerKey();
  const existing = await reg.pushManager.getSubscription();
  if (existing && subscriptionNeedsRotation(existing.options?.applicationServerKey, key)) {
    await forgetSubscription(existing);
  }
  try {
    return await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  } catch (err) {
    if ((err as { name?: string })?.name !== 'InvalidStateError') throw err;
    const stuck = await reg.pushManager.getSubscription();
    if (!stuck) throw err;
    await forgetSubscription(stuck);
    return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  }
}

async function saveSubscription(sub: PushSubscription): Promise<boolean> {
  const res = await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  });
  if (res.ok) return true;
  await sub.unsubscribe().catch(() => undefined);
  return false;
}

const NotificationOptIn: React.FC = () => {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported) { setStatus('unsupported'); return; }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    let cancelled = false;

    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return 'off' as const;
        if (!subscriptionNeedsRotation(sub.options?.applicationServerKey, applicationServerKey())) return 'on' as const;
        const next = await subscribeCurrentKey(reg);
        return (await saveSubscription(next)) ? 'on' as const : 'off' as const;
      })
      .then((next) => { if (!cancelled) setStatus(next); })
      .catch(() => { if (!cancelled) setStatus('off'); });

    return () => { cancelled = true; };
  }, []);

  const enable = async () => {
    setStatus('busy');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await subscribeCurrentKey(reg);
      setStatus((await saveSubscription(sub)) ? 'on' : 'off');
    } catch (err) {
      console.error('Notification opt-in failed:', err);
      setStatus('off');
    }
  };

  const disable = async () => {
    setStatus('busy');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push-unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('off');
    } catch (err) {
      console.error('Notification disable failed:', err);
      setStatus('off');
    }
  };

  if (status === 'unsupported') return null;

  const isOn = status === 'on';
  const busy = status === 'checking' || status === 'busy';

  return (
    <div className="glass-dark border border-white/5 p-8 rounded-[2rem] space-y-6">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500">Daily Verse</h3>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-sm text-stone-300 block">Verse of the Day Notifications</span>
          <span className="text-[9px] text-stone-600 uppercase tracking-widest">
            {status === 'denied' ? 'Blocked in browser settings' : 'One scripture, once a day'}
          </span>
        </div>
        <button
          onClick={isOn ? disable : enable}
          disabled={busy || status === 'denied'}
          className={`w-14 h-7 rounded-full relative transition-colors disabled:opacity-40 ${isOn ? 'bg-[#D4AF37]' : 'bg-stone-900'}`}
          aria-label="Toggle Daily Verse Notifications"
        >
          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${isOn ? 'right-1' : 'left-1'}`} />
        </button>
      </div>
      {status === 'denied' && (
        <p className="text-[9px] text-stone-600 leading-snug">
          Notifications are blocked for this site in your browser. Enable them in your browser's site settings to turn this on.
        </p>
      )}
    </div>
  );
};

export default NotificationOptIn;
