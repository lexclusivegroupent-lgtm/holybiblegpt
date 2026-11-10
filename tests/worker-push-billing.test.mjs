import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, generateKeyPairSync, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleApi } from '../src/api/router.mjs';
import { VAPID_PUBLIC_KEY, deliverPush, runScheduledPush, verseRefFor } from '../src/api/push.mjs';
import { applicationServerKeysMatch, subscriptionNeedsRotation } from '../services/pushKey.mjs';
import { createD1Kv } from '../src/api/d1kv.mjs';

const PUBLIC_KEY = VAPID_PUBLIC_KEY;

function sqliteDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_app_storage.sql', import.meta.url), 'utf8'));
  return {
    prepare(sql) {
      return {
        bind(...params) {
          const stmt = db.prepare(sql);
          return {
            async first() {
              return stmt.get(...params) ?? null;
            },
            async run() {
              const info = stmt.run(...params);
              return { meta: { changes: info.changes } };
            },
            async all() {
              return { results: stmt.all(...params) };
            },
          };
        },
      };
    },
  };
}

function session(username) {
  return async (_authorization, requested) => (
    requested === username
      ? { ok: true, username }
      : { ok: false, status: 403, error: 'You can only access your own account.' }
  );
}

function request(pathname, { method = 'GET', token, body, headers = {} } = {}) {
  return new Request(new URL(pathname, 'https://holybiblegpt.com'), {
    method,
    headers: {
      ...(token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
}

async function read(response) {
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: response.status, type: response.headers.get('content-type') || '', text, json };
}

function sign(secret, raw, timestamp = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
  return `t=${timestamp},v1=${v1}`;
}

function browserKeys() {
  const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' });
  const p256dh = Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(jwk.x, 'base64url'),
    Buffer.from(jwk.y, 'base64url'),
  ]).toString('base64url');
  return { p256dh, auth: randomBytes(16).toString('base64url') };
}

test('a browser subscription for another VAPID key needs to be replaced', () => {
  const current = Uint8Array.from([4, 1, 2, 3]);
  const previous = Uint8Array.from([4, 9, 9, 9]);
  assert.equal(applicationServerKeysMatch(current, Uint8Array.from(current)), true);
  assert.equal(applicationServerKeysMatch(previous, current), false);
  assert.equal(applicationServerKeysMatch(new Uint8Array(current.buffer), current), true);
  assert.equal(subscriptionNeedsRotation(null, current), false);
  assert.equal(subscriptionNeedsRotation(previous, current), true);
  assert.equal(subscriptionNeedsRotation(current, current), false);
});

test('the Worker public key is the key the browser already uses', () => {
  const source = readFileSync(new URL('../components/NotificationOptIn.tsx', import.meta.url), 'utf8');
  assert.match(source, new RegExp(PUBLIC_KEY));
  const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, ''));
  assert.deepEqual(config.triggers.crons, ['0 13 * * *']);
  assert.equal(config.vars.APP_URL, 'https://holybiblegpt.com');
  assert.equal(config.d1_databases[0].database_id, '57f368b2-1ece-47f3-9838-896ddbd5eabe');
});

test('billing stays disabled without Stripe secrets and does not call Stripe', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw new Error('stripe should not be called'); };
  const env = { APP_URL: 'https://holybiblegpt.com', DB: sqliteDb() };

  const probe = await read(await handleApi(request('/api/create-checkout-session'), env, { fetchImpl }));
  assert.equal(probe.status, 200);
  assert.match(probe.type, /application\/json/);
  assert.deepEqual(probe.json, { checkout: false, portal: false, intervals: { month: false, year: false } });
  assert.equal(probe.json.giftUrl, undefined);
  assert.doesNotMatch(probe.text, /<!doctype html>/i);

  const post = await read(await handleApi(
    request('/api/create-checkout-session', { method: 'POST', token: 't', body: { userId: 'alice' } }),
    env,
    { fetchImpl, verify: session('alice') },
  ));
  assert.equal(post.status, 503);
  assert.equal(post.json.error, 'Billing is not configured.');

  const portal = await read(await handleApi(
    request('/api/create-portal-session', { method: 'POST', token: 't', body: { userId: 'alice' } }),
    env,
    { fetchImpl, verify: session('alice') },
  ));
  assert.equal(portal.status, 503);
  assert.equal(calls, 0);

  const webhook = await read(await handleApi(
    request('/api/stripe-webhook', { method: 'POST', body: '{}', headers: { 'stripe-signature': 't=1,v1=ab' } }),
    env,
  ));
  assert.equal(webhook.status, 503);
  assert.equal(webhook.json.error, 'Billing is not configured.');

  const unauthenticated = await read(await handleApi(
    request('/api/create-checkout-session', { method: 'POST', body: { userId: 'alice' } }),
    env,
    { fetchImpl },
  ));
  assert.equal(unauthenticated.status, 401);
  assert.equal(calls, 0);
});

test('checkout uses the verified account, and the webhook grants Pro once', async () => {
  const env = {
    APP_URL: 'https://holybiblegpt.com',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_PRICE_ID: 'price_placeholder',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_placeholder',
    DB: sqliteDb(),
  };
  const kv = createD1Kv(env.DB);
  let stripeCalls = [];
  const fetchImpl = async (url, init) => {
    stripeCalls.push({ url, init });
    if (String(url).includes('/subscriptions/')) {
      return new Response(JSON.stringify({ id: 'sub_123', customer: 'cus_alice', status: 'canceled' }), { status: 200 });
    }
    return new Response(JSON.stringify({ url: 'https://checkout.stripe.test/session' }), { status: 200 });
  };

  const hiddenWithoutStore = await read(await handleApi(
    request('/api/create-checkout-session'),
    { ...env, DB: undefined },
    { fetchImpl },
  ));
  assert.equal(hiddenWithoutStore.json.checkout, false);
  assert.equal(hiddenWithoutStore.json.portal, false);
  assert.deepEqual(hiddenWithoutStore.json.intervals, { month: true, year: false });
  assert.equal(hiddenWithoutStore.json.giftUrl, undefined);

  const ready = await read(await handleApi(request('/api/create-checkout-session'), env, { fetchImpl }));
  assert.deepEqual(ready.json, {
    checkout: true,
    portal: true,
    intervals: { month: true, year: false },
  });
  assert.equal(ready.json.giftUrl, undefined);

  const denied = await read(await handleApi(
    request('/api/create-checkout-session', { method: 'POST', token: 't', body: { userId: 'bob' } }),
    env,
    { fetchImpl, verify: session('alice') },
  ));
  assert.equal(denied.status, 403);
  assert.equal(stripeCalls.length, 0);

  const checkout = await read(await handleApi(
    request('/api/create-checkout-session', { method: 'POST', token: 't', body: { userId: 'alice' } }),
    env,
    { fetchImpl, verify: session('alice') },
  ));
  assert.equal(checkout.status, 200);
  assert.equal(checkout.json.url, 'https://checkout.stripe.test/session');
  assert.match(stripeCalls[0].init.body, /metadata%5BuserId%5D=alice/);
  assert.match(stripeCalls[0].init.body, /price_placeholder/);
  assert.match(stripeCalls[0].init.body, /metadata%5Binterval%5D=month/);
  assert.doesNotMatch(stripeCalls[0].init.body, /payment_method_types/);
  assert.equal(stripeCalls[0].init.headers.Authorization, 'Bearer sk_test_placeholder');

  const raw = JSON.stringify({
    id: 'evt_test123',
    type: 'checkout.session.completed',
    data: { object: { metadata: { userId: 'alice' }, customer: 'cus_alice' } },
  });
  const bad = await read(await handleApi(
    request('/api/stripe-webhook', {
      method: 'POST',
      body: raw,
      headers: { 'stripe-signature': sign('wrong', raw) },
    }),
    env,
  ));
  assert.equal(bad.status, 400);
  assert.equal(await kv.get('user:alice:status'), null);

  const stale = await read(await handleApi(
    request('/api/stripe-webhook', {
      method: 'POST',
      body: raw,
      headers: { 'stripe-signature': sign(env.STRIPE_WEBHOOK_SECRET, raw, 1) },
    }),
    env,
    { now: Date.now() },
  ));
  assert.equal(stale.status, 400);

  const ok = await read(await handleApi(
    request('/api/stripe-webhook', {
      method: 'POST',
      body: raw,
      headers: { 'stripe-signature': sign(env.STRIPE_WEBHOOK_SECRET, raw) },
    }),
    env,
  ));
  assert.equal(ok.status, 200);
  assert.equal(ok.json.received, true);
  assert.equal(await kv.get('user:alice:status'), 'pro');
  assert.equal(await kv.get('user:alice:customer'), 'cus_alice');
  assert.equal(await kv.get('customer:cus_alice:user'), 'alice');

  const duplicate = await read(await handleApi(
    request('/api/stripe-webhook', {
      method: 'POST',
      body: raw,
      headers: { 'stripe-signature': sign(env.STRIPE_WEBHOOK_SECRET, raw) },
    }),
    env,
  ));
  assert.equal(duplicate.json.duplicate, true);
  assert.equal(await kv.get('user:alice:status'), 'pro');

  const portal = await read(await handleApi(
    request('/api/create-portal-session', { method: 'POST', token: 't', body: { userId: 'alice' } }),
    env,
    { fetchImpl, verify: session('alice') },
  ));
  assert.equal(portal.status, 200);
  assert.match(stripeCalls.at(-1).init.body, /customer=cus_alice/);

  const failed = JSON.stringify({
    id: 'evt_failed123',
    type: 'invoice.payment_failed',
    data: { object: { parent: { subscription_details: { subscription: 'sub_123' } } } },
  });
  const downgraded = await read(await handleApi(
    request('/api/stripe-webhook', {
      method: 'POST',
      body: failed,
      headers: { 'stripe-signature': sign(env.STRIPE_WEBHOOK_SECRET, failed) },
    }),
    env,
    { fetchImpl },
  ));
  assert.equal(downgraded.status, 200);
  assert.equal(await kv.get('user:alice:status'), 'free');
});

test('month and year checkouts use their prices, and both webhooks grant Plus', async () => {
  const env = {
    APP_URL: 'https://holybiblegpt.com',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_PRICE_ID: 'price_legacy',
    STRIPE_PRICE_ID_MONTHLY: 'price_month',
    STRIPE_PRICE_ID_YEARLY: 'price_year',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_placeholder',
    GIFT_URL: 'https://buy.stripe.com/test_gift',
    DB: sqliteDb(),
  };
  const kv = createD1Kv(env.DB);
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(String(init?.body || ''));
    return new Response(JSON.stringify({ url: 'https://checkout.stripe.test/session' }), { status: 200 });
  };

  const probe = await read(await handleApi(request('/api/create-checkout-session'), env, { fetchImpl }));
  assert.equal(probe.json.checkout, true);
  assert.equal(probe.json.portal, true);
  assert.deepEqual(probe.json.intervals, { month: true, year: true });
  assert.equal(probe.json.giftUrl, 'https://buy.stripe.com/test_gift');
  assert.doesNotMatch(probe.text, /sk_test|whsec_|price_month|price_year|price_legacy/);

  const month = await read(await handleApi(
    request('/api/create-checkout-session', {
      method: 'POST',
      token: 't',
      body: { userId: 'alice', interval: 'month' },
    }),
    env,
    { fetchImpl, verify: session('alice') },
  ));
  assert.equal(month.status, 200);
  assert.match(calls[0], /price_month/);
  assert.doesNotMatch(calls[0], /price_legacy/);

  const year = await read(await handleApi(
    request('/api/create-checkout-session', {
      method: 'POST',
      token: 't',
      body: { userId: 'bob', interval: 'year' },
    }),
    env,
    { fetchImpl, verify: session('bob') },
  ));
  assert.equal(year.status, 200);
  assert.match(calls[1], /price_year/);

  const missing = await read(await handleApi(
    request('/api/create-checkout-session', {
      method: 'POST',
      token: 't',
      body: { userId: 'alice', interval: 'week' },
    }),
    env,
    { fetchImpl, verify: session('alice') },
  ));
  assert.equal(missing.status, 400);
  assert.equal(calls.length, 2);

  for (const [user, interval, eventId] of [
    ['alice', 'month', 'evt_month123'],
    ['bob', 'year', 'evt_year123'],
  ]) {
    const raw = JSON.stringify({
      id: eventId,
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'subscription',
          metadata: { userId: user, interval },
          customer: user === 'alice' ? 'cus_alice' : 'cus_bob',
        },
      },
    });
    const granted = await read(await handleApi(
      request('/api/stripe-webhook', {
        method: 'POST',
        body: raw,
        headers: { 'stripe-signature': sign(env.STRIPE_WEBHOOK_SECRET, raw) },
      }),
      env,
    ));
    assert.equal(granted.status, 200, user);
    assert.equal(await kv.get(`user:${user}:status`), 'pro');
  }

  const gift = JSON.stringify({
    id: 'evt_gift123',
    type: 'checkout.session.completed',
    data: {
      object: {
        mode: 'payment',
        metadata: { userId: 'cara' },
        customer: 'cus_cara',
      },
    },
  });
  const ignored = await read(await handleApi(
    request('/api/stripe-webhook', {
      method: 'POST',
      body: gift,
      headers: { 'stripe-signature': sign(env.STRIPE_WEBHOOK_SECRET, gift) },
    }),
    env,
  ));
  assert.equal(ignored.status, 200);
  assert.equal(await kv.get('user:cara:status'), null);

  const portal = await read(await handleApi(
    request('/api/create-portal-session', { method: 'POST', token: 't', body: { userId: 'bob' } }),
    env,
    { fetchImpl, verify: session('bob') },
  ));
  assert.equal(portal.status, 200);
  assert.match(calls.at(-1), /customer=cus_bob/);

  const yearlyOnly = {
    ...env,
    STRIPE_PRICE_ID: '',
    STRIPE_PRICE_ID_MONTHLY: '',
    DB: sqliteDb(),
  };
  let yearlyCalls = 0;
  const yearFetch = async () => {
    yearlyCalls += 1;
    return new Response(JSON.stringify({ url: 'https://checkout.stripe.test/year' }), { status: 200 });
  };
  const noMonth = await read(await handleApi(
    request('/api/create-checkout-session', {
      method: 'POST',
      token: 't',
      body: { userId: 'bob', interval: 'month' },
    }),
    yearlyOnly,
    { fetchImpl: yearFetch, verify: session('bob') },
  ));
  assert.equal(noMonth.status, 503);
  assert.equal(yearlyCalls, 0);
});

test('push degrades without keys, and the daily route rejects a bad cron token', async () => {
  const env = { DB: sqliteDb() };
  let fetches = 0;
  const fetchImpl = async () => { fetches += 1; throw new Error('no outbound call'); };

  const missing = await read(await handleApi(request('/api/push-send-daily'), env, { fetchImpl }));
  assert.equal(missing.status, 503);
  assert.equal(missing.json.error, 'CRON_SECRET is not configured.');

  const wrong = await read(await handleApi(
    request('/api/push-send-daily', { token: 'Bearer wrong' }),
    { ...env, CRON_SECRET: 'cron-secret' },
    { fetchImpl },
  ));
  assert.equal(wrong.status, 401);

  const noKeys = await read(await handleApi(
    request('/api/push-send-daily', { token: 'Bearer cron-secret' }),
    { ...env, CRON_SECRET: 'cron-secret' },
    { fetchImpl },
  ));
  assert.equal(noKeys.status, 503);
  assert.equal(noKeys.json.error, 'Push is not configured.');
  assert.equal(fetches, 0);

  const mismatch = await read(await handleApi(
    request('/api/push-send-daily', { token: 'Bearer cron-secret' }),
    {
      ...env,
      CRON_SECRET: 'cron-secret',
      VAPID_PUBLIC_KEY: 'not-the-browser-key',
      VAPID_PRIVATE_KEY: 'private',
    },
    { fetchImpl },
  ));
  assert.equal(mismatch.status, 503);
  assert.equal(fetches, 0);

  const scheduled = await runScheduledPush(env, { fetchImpl });
  assert.equal(scheduled.ok, false);
  assert.equal(fetches, 0);

  const subscribe = await read(await handleApi(
    request('/api/push-subscribe', {
      method: 'POST',
      body: { endpoint: 'https://push.example/1', keys: { p256dh: 'a'.repeat(20), auth: 'b'.repeat(16) } },
    }),
    {},
  ));
  assert.equal(subscribe.status, 503);
  assert.match(subscribe.type, /application\/json/);
});

test('a daily send reaches stored subscriptions once, and a gone endpoint is removed', async () => {
  const now = Date.UTC(2026, 0, 15, 13, 0, 0);
  const env = {
    DB: sqliteDb(),
    CRON_SECRET: 'cron-secret',
    VAPID_PUBLIC_KEY: PUBLIC_KEY,
    VAPID_PRIVATE_KEY: 'test-private-key',
  };
  const keys = browserKeys();
  const endpoint = 'https://push.example/device';
  const saved = await read(await handleApi(
    request('/api/push-subscribe', {
      method: 'POST',
      body: { endpoint, keys, extra: 'ignored' },
    }),
    env,
  ));
  assert.equal(saved.status, 200);

  const sentTo = [];
  const fetchImpl = async (url) => {
    assert.match(String(url), /bible-api\.com/);
    return new Response(JSON.stringify({ text: 'For God so loved the world.' }), { status: 200 });
  };
  const sendOne = async (subscription, payload) => {
    sentTo.push({ endpoint: subscription.endpoint, payload });
  };

  const first = await read(await handleApi(
    request('/api/push-send-daily', { token: 'Bearer cron-secret' }),
    env,
    { fetchImpl, sendOne, now },
  ));
  assert.equal(first.status, 200);
  assert.equal(first.json.ok, true);
  assert.equal(first.json.sent, 1);
  assert.equal(first.json.verse, verseRefFor(now));
  assert.equal(sentTo.length, 1);
  assert.equal(sentTo[0].endpoint, endpoint);
  assert.match(sentTo[0].payload, /For God so loved the world\./);
  assert.equal(JSON.parse(sentTo[0].payload).title, 'Verse of the Day');

  const second = await read(await handleApi(
    request('/api/push-send-daily', { token: 'Bearer cron-secret' }),
    env,
    { fetchImpl, sendOne, now },
  ));
  assert.equal(second.json.skipped, true);
  assert.equal(sentTo.length, 1);

  const otherDay = now + 86_400_000;
  const gone = await read(await handleApi(
    request('/api/push-send-daily', { token: 'Bearer cron-secret' }),
    env,
    {
      fetchImpl,
      now: otherDay,
      sendOne: async () => {
        const error = new Error('gone');
        error.statusCode = 410;
        throw error;
      },
    },
  ));
  assert.equal(gone.json.removed, 1);
  assert.equal(gone.json.sent, 0);

  const members = await createD1Kv(env.DB).smembers('push:subscriptions');
  assert.deepEqual(members, []);
});

test('web push delivery uses the endpoint and does not use Node https', async () => {
  const webpush = (await import('web-push')).default;
  const vapid = webpush.generateVAPIDKeys();
  const keys = browserKeys();
  let seen = null;
  await deliverPush(
    { endpoint: 'https://push.example/s', keys },
    JSON.stringify({ title: 'Verse of the Day', body: 'Hello' }),
    vapid,
    async (url, init) => {
      seen = { url, authorization: init.headers.get('authorization'), bytes: init.body?.byteLength ?? 0 };
      return new Response(null, { status: 201 });
    },
  );
  assert.equal(seen.url, 'https://push.example/s');
  assert.match(seen.authorization, /^vapid /i);
  assert.ok(seen.bytes > 0);
});
