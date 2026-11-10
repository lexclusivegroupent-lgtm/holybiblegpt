import { authorizeCron } from '../../api/_lib/cronAuth.mjs';
import { openStore } from './d1kv.mjs';
import { json, readJson } from './responses.mjs';

// Must match components/NotificationOptIn.tsx. The public key is not a secret.
// A different public key on the Worker would accept subscriptions this app
// cannot send to, so push stays off until the pair matches.
export const VAPID_PUBLIC_KEY = 'BExXQ5p2sahc35RIVvLBCI0j79gHbg1anEPfZLGHMBwygoPW_c0OPTLcy07gkl7u8x09cLkTATBOkOQS-TLxbEY';
const VAPID_SUBJECT = 'mailto:hi@holybiblegpt.com';

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

export function verseRefFor(now) {
  return VERSE_REFS[Math.floor(now / 86_400_000) % VERSE_REFS.length];
}

export function utcDay(now) {
  return new Date(now).toISOString().slice(0, 10);
}

function nonempty(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

export function vapidConfigured(env) {
  const publicKey = nonempty(env?.VAPID_PUBLIC_KEY);
  const privateKey = nonempty(env?.VAPID_PRIVATE_KEY);
  if (!publicKey || !privateKey || publicKey !== VAPID_PUBLIC_KEY) return null;
  return { publicKey, privateKey };
}

function pushEndpoint(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2000) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return '';
  } catch {
    return '';
  }
  // Keep the browser's endpoint bytes. URL.toString() can rewrite them.
  return value;
}

function subscriptionKey(endpoint) {
  return `push:${Buffer.from(endpoint).toString('base64url')}`;
}

function normalizeSubscription(body) {
  const endpoint = pushEndpoint(body?.endpoint);
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!endpoint) return null;
  if (typeof p256dh !== 'string' || typeof auth !== 'string') return null;
  if (p256dh.length < 16 || p256dh.length > 200 || auth.length < 8 || auth.length > 200) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(p256dh) || !/^[A-Za-z0-9_-]+$/.test(auth)) return null;
  return { endpoint, keys: { p256dh, auth } };
}

async function resolveStore(env, deps) {
  if (deps.kv !== undefined) return deps.kv;
  return openStore(env);
}

async function mapPool(items, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await fn(items[index]);
    }
  });
  await Promise.all(workers);
}

async function fetchVerse(ref, fetchImpl) {
  try {
    const response = await fetchImpl(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`);
    if (!response.ok) return null;
    const data = await response.json();
    const text = String(data?.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    return { text, ref };
  } catch {
    return null;
  }
}

export async function deliverPush(subscription, payload, vapid, fetchImpl) {
  const imported = await import('web-push');
  const lib = typeof imported.generateRequestDetails === 'function' ? imported : imported.default;
  const details = lib.generateRequestDetails(subscription, payload, {
    vapidDetails: {
      subject: VAPID_SUBJECT,
      publicKey: vapid.publicKey,
      privateKey: vapid.privateKey,
    },
  });
  const headers = new Headers();
  for (const [key, value] of Object.entries(details.headers || {})) {
    if (key.toLowerCase() === 'content-length') continue;
    headers.set(key, String(value));
  }
  const body = details.body && details.body.length ? new Uint8Array(details.body) : undefined;
  const response = await fetchImpl(details.endpoint, { method: 'POST', headers, body });
  await response.body?.cancel?.();
  if (response.status === 404 || response.status === 410) {
    const error = new Error('subscription gone');
    error.statusCode = response.status;
    throw error;
  }
  if (!response.ok) {
    const error = new Error('push rejected');
    error.statusCode = response.status;
    throw error;
  }
}

export async function sendDaily(env, deps = {}) {
  const now = deps.now ?? Date.now();
  const vapid = vapidConfigured(env);
  const kv = await resolveStore(env, deps);
  if (!vapid || !kv) return { ok: false, status: 503, error: 'Push is not configured.' };

  const fetchImpl = deps.fetchImpl ?? fetch;
  const ref = verseRefFor(now);
  const verse = await fetchVerse(ref, fetchImpl);
  if (!verse) return { ok: false, status: 502, error: 'Could not fetch the verse.' };

  const claimed = await kv.insertNew(`push:sent:${utcDay(now)}`, { ref: verse.ref });
  if (!claimed) return { ok: true, status: 200, skipped: true, verse: verse.ref };

  const payload = JSON.stringify({
    title: 'Verse of the Day',
    body: `"${verse.text}" — ${verse.ref}`,
    icon: '/icons/android-chrome-192x192.png',
    badge: '/icons/android-chrome-192x192.png',
    url: '/',
  });
  const keys = await kv.smembers('push:subscriptions');
  let sent = 0;
  let failed = 0;
  let removed = 0;
  const sendOne = deps.sendOne ?? ((subscription, body) => deliverPush(subscription, body, vapid, fetchImpl));

  await mapPool(keys, 4, async (key) => {
    const subscription = await kv.get(key);
    if (!subscription) {
      await kv.srem('push:subscriptions', key);
      removed += 1;
      return;
    }
    try {
      await sendOne(subscription, payload);
      sent += 1;
    } catch (error) {
      failed += 1;
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await kv.del(key);
        await kv.srem('push:subscriptions', key);
        removed += 1;
      }
    }
  });

  return {
    ok: true,
    status: 200,
    verse: verse.ref,
    totalSubscriptions: keys.length,
    sent,
    failed,
    removed,
  };
}

export async function runScheduledPush(env, deps) {
  const result = await sendDaily(env, deps);
  console.log(JSON.stringify({
    message: result.ok ? 'daily push' : 'daily push skipped',
    sent: result.sent ?? 0,
    failed: result.failed ?? 0,
    removed: result.removed ?? 0,
    skipped: result.skipped === true,
  }));
  return result;
}

export async function handlePushApi(request, env, deps = {}) {
  const url = new URL(request.url);
  if (url.pathname === '/api/push-subscribe') return subscribe(request, env, deps);
  if (url.pathname === '/api/push-unsubscribe') return unsubscribe(request, env, deps);
  if (url.pathname === '/api/push-send-daily') return sendHttp(request, env, deps);
  return null;
}

async function subscribe(request, env, deps) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await readJson(request, 8000);
  const subscription = body?.tooLarge || body?.invalid ? null : normalizeSubscription(body);
  if (!subscription) return json({ error: 'Invalid push subscription' }, 400);
  const kv = await resolveStore(env, deps);
  if (!kv) return json({ error: 'Push is not configured.' }, 503);
  const key = subscriptionKey(subscription.endpoint);
  await kv.set(key, subscription);
  await kv.sadd('push:subscriptions', key);
  return json({ ok: true });
}

async function unsubscribe(request, env, deps) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await readJson(request, 8000);
  const endpoint = body?.tooLarge || body?.invalid ? '' : pushEndpoint(body?.endpoint);
  if (!endpoint) return json({ error: 'Missing endpoint' }, 400);
  const kv = await resolveStore(env, deps);
  if (!kv) return json({ error: 'Push is not configured.' }, 503);
  const key = subscriptionKey(endpoint);
  await kv.del(key);
  await kv.srem('push:subscriptions', key);
  return json({ ok: true });
}

async function sendHttp(request, env, deps) {
  if (request.method !== 'POST' && request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }
  const cron = authorizeCron(request.headers.get('authorization') ?? undefined, env?.CRON_SECRET);
  if (!cron.ok) return json({ error: cron.error }, cron.status);
  const result = await sendDaily(env, deps);
  if (!result.ok) return json({ error: result.error }, result.status);
  const { status, ...body } = result;
  return json(body, status);
}
