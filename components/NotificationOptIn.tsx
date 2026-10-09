import React, { useEffect, useState } from 'react';

// Public VAPID key — safe to ship client-side (it's the public half of the
// keypair; only VAPID_PRIVATE_KEY on the server is secret). Must match the
// VAPID_PUBLIC_KEY configured in the server's env vars or push sends will fail.
const VAPID_PUBLIC_KEY = 'BExXQ5p2sahc35RIVvLBCI0j79gHbg1anEPfZLGHMBwygoPW_c0OPTLcy07gkl7u8x09cLkTATBOkOQS-TLxbEY';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type Status = 'unsupported' | 'checking' | 'off' | 'on' | 'busy' | 'denied';

const NotificationOptIn: React.FC = () => {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported) { setStatus('unsupported'); return; }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }

    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setStatus(sub ? 'on' : 'off'))
      .catch(() => setStatus('off'));
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
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      setStatus('on');
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
