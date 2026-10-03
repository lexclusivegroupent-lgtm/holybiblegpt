import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import webpush from 'web-push';

// Triggered once a day by Vercel Cron (see vercel.json "crons"). Picks a
// verse reference deterministically by day-of-year, fetches its exact text
// from bible-api.com at send-time (same source the live app already uses
// for on-demand chapter fetches — never hand-typed, so wording is always
// verifiably correct), and pushes it to every stored subscription.

// References only — curated for being well-known and genuinely
// encouraging as a daily notification. The actual verse TEXT is always
// fetched fresh from bible-api.com below, never hardcoded here, so there's
// no risk of a typo'd Scripture quotation shipping to every subscriber.
const VERSE_REFS = [
  'John 3:16', 'Psalm 23:1', 'Philippians 4:13', 'Jeremiah 29:11', 'Joshua 1:9',
  'Romans 8:28', 'Proverbs 3:5-6', 'Isaiah 41:10', 'Psalm 46:1', 'Matthew 11:28',
  '2 Corinthians 5:17', 'Psalm 118:24', 'Romans 12:2', 'Psalm 27:1', 'Isaiah 40:31',
  'Matthew 6:33', 'Ephesians 2:8-9', 'Psalm 34:18', 'Lamentations 3:22-23', 'Hebrews 11:1',
  '1 John 4:19', 'Deuteronomy 31:6', 'John 14:27', '2 Timothy 1:7', 'Psalm 139:14',
  'Proverbs 18:10', 'Psalm 55:22', 'Isaiah 43:2', 'John 16:33', 'Romans 5:8',
  '2 Corinthians 12:9', 'Philippians 4:6-7', '1 Peter 5:7', 'Galatians 5:22-23', 'Matthew 28:20',
  'Psalm 121:1-2', 'Colossians 3:23', '1 Thessalonians 5:16-18', 'Isaiah 26:3', 'Psalm 73:26',
  'Proverbs 16:3', 'Matthew 5:16', 'Galatians 2:20', 'James 1:2-3', 'Psalm 16:11',
  'Habakkuk 3:19', 'Zephaniah 3:17', 'Psalm 9:9-10', 'Romans 15:13', 'Hebrews 13:5',
  'James 4:8', '1 John 1:9', 'Revelation 21:4', 'Psalm 19:1', 'Micah 6:8',
  'Psalm 37:4', 'Psalm 100:4-5', 'Nahum 1:7', 'Ephesians 3:20', 'Psalm 30:5',
];

async function fetchVerse(ref: string): Promise<{ text: string; ref: string } | null> {
  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`);
    if (!res.ok) return null;
    const data = await res.json();
    const text = String(data.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    return { text, ref };
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Soft auth: if CRON_SECRET is configured, require it (Vercel Cron sends
  // it automatically as a Bearer token). If not configured, allow through —
  // so this doesn't hard-fail before that env var is set up.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return res.status(500).json({ error: 'VAPID keys not configured on the server' });
  }
  webpush.setVapidDetails('mailto:hi@holybiblegpt.com', vapidPublic, vapidPrivate);

  try {
    const dayIndex = Math.floor(Date.now() / 86_400_000) % VERSE_REFS.length;
    const ref = VERSE_REFS[dayIndex];
    const verse = await fetchVerse(ref);
    if (!verse) {
      return res.status(502).json({ error: `Could not fetch verse text for ${ref}` });
    }

    const payload = JSON.stringify({
      title: 'Verse of the Day',
      body: `"${verse.text}" — ${verse.ref}`,
      icon: '/icons/android-chrome-192x192.png',
      badge: '/icons/android-chrome-192x192.png',
      url: '/',
    });

    const keys: string[] = await kv.smembers('push:subscriptions');
    let sent = 0, failed = 0, removed = 0;

    await Promise.all(keys.map(async (key) => {
      const sub = await kv.get<any>(key);
      if (!sub) { await kv.srem('push:subscriptions', key); removed++; return; }
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err: any) {
        failed++;
        // 404/410 = subscription is gone (user uninstalled, cleared data, etc.) — clean it up.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await kv.del(key);
          await kv.srem('push:subscriptions', key);
          removed++;
        }
      }
    }));

    res.status(200).json({ ok: true, verse: verse.ref, totalSubscriptions: keys.length, sent, failed, removed });
  } catch (error: any) {
    console.error('Push send-daily error:', error);
    res.status(500).json({ error: error.message });
  }
}
