import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { handleApi } from '../src/api/router.mjs';
import { createD1Kv } from '../src/api/d1kv.mjs';
import { JOURNAL_OBJECTS, DOWNLOAD_TTL_SECONDS, signDownloadToken } from '../services/journalDelivery.mjs';

const PRICE = 'price_journaltest';
const SECRET_KEY = 'sk_test_placeholder';
const DOWNLOAD = 'journal-download-secret-at-least-32-chars';
const LIVE_PRICE = 'price_1UbpGHIh46pSg55QCUP263LR';

function pdfBytes() {
  return Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
}

function zipBytes() {
  return Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
}

function bucket(ids, custom) {
  const map = new Map();
  for (const id of ids) {
    const bytes = custom?.get(id) ?? (id === 'zip' ? zipBytes() : pdfBytes());
    map.set(JOURNAL_OBJECTS[id].key, bytes);
  }
  return {
    async head(key) {
      return map.has(key) ? { key } : null;
    },
    async get(key) {
      const bytes = map.get(key);
      return bytes ? { bytes } : null;
    },
  };
}

function env(overrides = {}) {
  return {
    APP_URL: 'https://holybiblegpt.com',
    STRIPE_SECRET_KEY: SECRET_KEY,
    STRIPE_JOURNAL_PRICE_ID: PRICE,
    JOURNAL_DOWNLOAD_SECRET: DOWNLOAD,
    JOURNAL_FILES: bucket(['zip', 'letter', 'a4']),
    ...overrides,
  };
}

function request(pathname, { method = 'GET', body, headers = {} } = {}) {
  return new Request(new URL(pathname, 'https://holybiblegpt.com'), {
    method,
    headers: {
      origin: 'https://holybiblegpt.com',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body,
  });
}

async function read(response) {
  const buf = new Uint8Array(await response.arrayBuffer());
  const text = new TextDecoder().decode(buf);
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: response.status, type: response.headers.get('content-type') || '', text, json, buf };
}

function paidSession(price = PRICE, extra = {}) {
  return {
    id: 'cs_test_paidjournal1',
    object: 'checkout.session',
    mode: 'payment',
    payment_status: 'paid',
    metadata: { product: 'journal', price },
    line_items: { data: [{ price: { id: price } }] },
    url: 'https://checkout.stripe.com/c/pay/cs_test_paidjournal1',
    ...extra,
  };
}

function stripeFetch(sessions) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    if (init?.method === 'POST') {
      return new Response(JSON.stringify({ id: 'cs_test_newjournal1', url: 'https://checkout.stripe.com/c/pay/cs_test_newjournal1' }), { status: 200 });
    }
    const id = String(url).split('/').pop().split('?')[0];
    const session = sessions[id];
    if (!session) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify(session), { status: 200 });
  };
  return { fetchImpl, calls };
}

function sign(secret, raw, timestamp = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
  return `t=${timestamp},v1=${v1}`;
}

function sqliteDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_app_storage.sql', import.meta.url), 'utf8'));
  return {
    prepare(sql) {
      return {
        bind(...params) {
          const stmt = db.prepare(sql);
          return {
            async first() { return stmt.get(...params) ?? null; },
            async run() {
              const info = stmt.run(...params);
              return { meta: { changes: info.changes } };
            },
            async all() { return { results: stmt.all(...params) }; },
          };
        },
      };
    },
  };
}

test('the live journal price is documented and not hardcoded in the app', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const docs = readFileSync(join(root, 'docs/journal.md'), 'utf8');
  assert.match(docs, new RegExp(LIVE_PRICE));
  assert.match(docs, /prod_Vd5RBppwT38pc5/);
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      const path = join(dir, name);
      if (path.endsWith(`${join('docs', 'journal.md')}`)) continue;
      if (path.endsWith(`${join('tests', 'journal-delivery.test.mjs')}`)) continue;
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(mjs|ts|tsx|js|md|json|jsonc|html)$/.test(name)) {
        assert.doesNotMatch(readFileSync(path, 'utf8'), new RegExp(LIVE_PRICE), path);
      }
    }
  }
  walk(root);
});

test('a missing price or a missing file keeps checkout closed and does not call Stripe', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw new Error('stripe should not be called'); };
  const noPrice = await read(await handleApi(request('/api/journal/offer'), env({ STRIPE_JOURNAL_PRICE_ID: '' }), { fetchImpl }));
  assert.equal(noPrice.status, 200);
  assert.deepEqual(noPrice.json, { enabled: true, checkout: false });

  const noFiles = await read(await handleApi(
    request('/api/journal/offer'),
    env({ JOURNAL_FILES: bucket([]) }),
    { fetchImpl },
  ));
  assert.equal(noFiles.json.checkout, false);

  const letterOnly = await read(await handleApi(
    request('/api/journal/offer'),
    env({ JOURNAL_FILES: bucket(['letter']) }),
    { fetchImpl },
  ));
  assert.equal(letterOnly.json.checkout, false);

  const post = await read(await handleApi(
    request('/api/journal/checkout', { method: 'POST', body: '{}' }),
    env({ STRIPE_JOURNAL_PRICE_ID: undefined, JOURNAL_FILES: undefined }),
    { fetchImpl },
  ));
  assert.equal(post.status, 503);
  assert.equal(post.json.error, 'Checkout is not open yet.');
  assert.equal(calls, 0);
  assert.doesNotMatch(post.text, /sk_test/);
});

test('the offer defaults on, and an explicit flag or a Plus price turns it off', async () => {
  const fetchImpl = async () => { throw new Error('no stripe'); };
  const on = await read(await handleApi(request('/api/journal/offer'), env(), { fetchImpl }));
  assert.equal(on.json.checkout, true);
  assert.equal(on.json.enabled, true);

  const bothPdfs = await read(await handleApi(
    request('/api/journal/offer'),
    env({ JOURNAL_FILES: bucket(['letter', 'a4']) }),
    { fetchImpl },
  ));
  assert.equal(bothPdfs.json.checkout, true);

  const zipOnly = await read(await handleApi(
    request('/api/journal/offer'),
    env({ JOURNAL_FILES: bucket(['zip']) }),
    { fetchImpl },
  ));
  assert.equal(zipOnly.json.checkout, true);

  const killed = await read(await handleApi(
    request('/api/journal/offer'),
    env({ JOURNAL_OFFER_ENABLED: 'false' }),
    { fetchImpl },
  ));
  assert.deepEqual(killed.json, { enabled: false, checkout: false });

  const plusPrice = await read(await handleApi(
    request('/api/journal/offer'),
    env({ STRIPE_PRICE_ID: PRICE }),
    { fetchImpl },
  ));
  assert.equal(plusPrice.json.checkout, false);
});

test('checkout is a one-time payment and tax is off unless the flag is set', async () => {
  const { fetchImpl, calls } = stripeFetch({});
  const created = await read(await handleApi(
    request('/api/journal/checkout', { method: 'POST', body: '{}' }),
    env(),
    { fetchImpl },
  ));
  assert.equal(created.status, 200);
  assert.equal(created.json.url, 'https://checkout.stripe.com/c/pay/cs_test_newjournal1');
  const body = calls[0].init.body;
  assert.match(body, /(^|&)mode=payment(&|$)/);
  assert.doesNotMatch(body, /mode=subscription/);
  assert.match(body, /session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.doesNotMatch(body, /%7BCHECKOUT_SESSION_ID%7D/);
  assert.doesNotMatch(body, /automatic_tax/);
  assert.doesNotMatch(body, /billing_address_collection/);
  assert.doesNotMatch(body, /tax_behavior/);
  assert.doesNotMatch(body, /payment_method_types/);
  assert.match(body, new RegExp(PRICE));
  assert.equal(calls[0].init.headers['Stripe-Version'], '2025-12-15.clover');
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${SECRET_KEY}`);
  assert.doesNotMatch(created.text, new RegExp(SECRET_KEY));

  const taxed = stripeFetch({});
  await handleApi(
    request('/api/journal/checkout', { method: 'POST', body: '{}' }),
    env({ STRIPE_JOURNAL_TAX_ENABLED: 'true' }),
    { fetchImpl: taxed.fetchImpl },
  );
  assert.match(taxed.calls[0].init.body, /automatic_tax%5Benabled%5D=true/);
  assert.match(taxed.calls[0].init.body, /billing_address_collection=required/);
  assert.doesNotMatch(taxed.calls[0].init.body, /tax_behavior/);

  const foreign = await read(await handleApi(
    request('/api/journal/checkout', { method: 'POST', body: '{}', headers: { origin: 'https://evil.example' } }),
    env(),
    { fetchImpl },
  ));
  assert.equal(foreign.status, 503);
  assert.equal(calls.length, 1);
});

test('a paid journal session can download the zip and both PDFs, and nothing else can', async () => {
  const sessions = { cs_test_paidjournal1: paidSession() };
  const { fetchImpl } = stripeFetch(sessions);
  const confirmed = await read(await handleApi(
    request('/api/journal/session?session_id=cs_test_paidjournal1'),
    env(),
    { fetchImpl },
  ));
  assert.equal(confirmed.json.paid, true);
  assert.equal(confirmed.json.downloads.length, 3);
  assert.deepEqual(confirmed.json.downloads.map((item) => item.file), ['zip', 'letter', 'a4']);
  for (const item of confirmed.json.downloads) {
    const file = await handleApi(request(item.path), env(), { fetchImpl });
    assert.equal(file.status, 200);
    assert.match(file.headers.get('content-type'), item.file === 'zip' ? /application\/zip/ : /application\/pdf/);
    assert.match(file.headers.get('content-disposition'), /attachment/);
  }

  const zip = confirmed.json.downloads[0];
  const zipRes = await handleApi(request(zip.path), env(), { fetchImpl });
  assert.match(zipRes.headers.get('content-disposition'), /30-Days-in-the-Word-KJV-Journal\.zip/);
  assert.equal(zipRes.headers.get('cache-control'), 'private, no-store');

  const unpaid = stripeFetch({
    cs_test_unpaidjournal: { ...paidSession(), id: 'cs_test_unpaidjournal', payment_status: 'unpaid', status: 'open' },
  });
  const waiting = await read(await handleApi(
    request('/api/journal/session?session_id=cs_test_unpaidjournal'),
    env(),
    { fetchImpl: unpaid.fetchImpl },
  ));
  assert.equal(waiting.json.paid, false);
  assert.equal(waiting.json.downloads, undefined);
  assert.doesNotMatch(waiting.text, /\/api\/journal\/file/);

  const processing = stripeFetch({
    cs_test_processingj1: { ...paidSession(), id: 'cs_test_processingj1', payment_status: 'unpaid', status: 'complete' },
  });
  const pending = await read(await handleApi(
    request('/api/journal/session?session_id=cs_test_processingj1'),
    env(),
    { fetchImpl: processing.fetchImpl },
  ));
  assert.equal(pending.json.state, 'processing');
  assert.doesNotMatch(pending.text, /token=/);

  const other = stripeFetch({
    cs_test_otherproduct1: {
      ...paidSession(),
      id: 'cs_test_otherproduct1',
      metadata: { product: 'gift', price: PRICE },
    },
  });
  const rejected = await read(await handleApi(
    request('/api/journal/session?session_id=cs_test_otherproduct1'),
    env(),
    { fetchImpl: other.fetchImpl },
  ));
  assert.equal(rejected.json.state, 'rejected');

  const missingItems = stripeFetch({
    cs_test_nolineitems1: { ...paidSession(), id: 'cs_test_nolineitems1', line_items: {} },
  });
  const noLines = await read(await handleApi(
    request('/api/journal/session?session_id=cs_test_nolineitems1'),
    env(),
    { fetchImpl: missingItems.fetchImpl },
  ));
  assert.equal(noLines.json.paid, false);

  const bare = await read(await handleApi(request('/api/journal/file'), env(), { fetchImpl }));
  assert.equal(bare.status, 401);

  const now = Date.now();
  const expired = signDownloadToken('cs_test_paidjournal1', DOWNLOAD, now - (DOWNLOAD_TTL_SECONDS + 120) * 1000);
  const stale = await read(await handleApi(
    request(`/api/journal/file?file=zip&token=${encodeURIComponent(expired)}`),
    env(),
    { fetchImpl, now: () => now },
  ));
  assert.equal(stale.status, 401);

  const token = signDownloadToken('cs_test_paidjournal1', DOWNLOAD, now);
  const tampered = `${token.slice(0, -4)}${token.endsWith('aaaa') ? 'bbbb' : 'aaaa'}`;
  const badSig = await read(await handleApi(
    request(`/api/journal/file?file=zip&token=${encodeURIComponent(tampered)}`),
    env(),
    { fetchImpl, now: () => now },
  ));
  assert.equal(badSig.status, 401);

  const revoked = stripeFetch({
    cs_test_paidjournal1: { ...paidSession(), payment_status: 'unpaid', status: 'complete' },
  });
  const blocked = await read(await handleApi(
    request(`/api/journal/file?file=zip&token=${encodeURIComponent(token)}`),
    env(),
    { fetchImpl: revoked.fetchImpl, now: () => now },
  ));
  assert.equal(blocked.status, 403);
  assert.doesNotMatch(blocked.text, /PK/);

  const empty = await read(await handleApi(
    request(`/api/journal/file?file=zip&token=${encodeURIComponent(token)}`),
    env({ JOURNAL_FILES: bucket([]) }),
    { fetchImpl, now: () => now },
  ));
  assert.equal(empty.status, 503);

  const junk = new Map([['zip', Uint8Array.from([1, 2, 3, 4, 5])]]);
  const wrong = await read(await handleApi(
    request(`/api/journal/file?file=zip&token=${encodeURIComponent(token)}`),
    env({ JOURNAL_FILES: bucket(['zip'], junk) }),
    { fetchImpl, now: () => now },
  ));
  assert.equal(wrong.status, 503);
  assert.equal(wrong.json.error, 'The file is not ready yet.');

  const guess = await handleApi(request('/private/30-days-in-the-word.zip'), env(), { fetchImpl });
  assert.equal(guess, null);
  const apiGuess = await read(await handleApi(request('/api/journal/private/30-days-in-the-word.pdf'), env(), { fetchImpl }));
  assert.equal(apiGuess.status, 404);
  assert.doesNotMatch(apiGuess.text, /%PDF/);
});

test('a journal payment does not grant Plus', async () => {
  const store = sqliteDb();
  const kv = createD1Kv(store);
  const raw = JSON.stringify({
    id: 'evt_journalpay1',
    type: 'checkout.session.completed',
    data: {
      object: {
        mode: 'payment',
        payment_status: 'paid',
        metadata: { product: 'journal', userId: 'alice', price: PRICE },
        customer: 'cus_alice',
      },
    },
  });
  const response = await read(await handleApi(
    request('/api/stripe-webhook', {
      method: 'POST',
      body: raw,
      headers: { 'stripe-signature': sign('whsec_test_placeholder', raw) },
    }),
    {
      APP_URL: 'https://holybiblegpt.com',
      STRIPE_SECRET_KEY: SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: 'whsec_test_placeholder',
      DB: store,
    },
  ));
  assert.equal(response.status, 200);
  assert.equal(response.json.received, true);
  assert.equal(await kv.get('user:alice:status'), null);
});

test('the service worker does not cache journal downloads', () => {
  const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(source, /pathname\.startsWith\('\/api\/'\)/);
  const billing = readFileSync(new URL('../src/api/billing.mjs', import.meta.url), 'utf8');
  const journal = readFileSync(new URL('../src/api/journal.mjs', import.meta.url), 'utf8');
  const version = billing.match(/STRIPE_VERSION = '([^']+)'/)[1];
  assert.match(journal, new RegExp(version));
});

test('public assets do not contain the paid journal files', () => {
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else assert.doesNotMatch(name, /30-days-in-the-word/i, path);
    }
  }
  walk(new URL('../public', import.meta.url).pathname);
});
