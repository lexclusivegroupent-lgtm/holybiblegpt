import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleApi } from '../src/api/router.mjs';
import { createD1Kv } from '../src/api/d1kv.mjs';

function stripJsonc(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function session(username) {
  return async (_authorization, requested) => (
    requested === username
      ? { ok: true, username }
      : { ok: false, status: 403, error: 'You can only access your own account.' }
  );
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

function request(pathname, { method = 'GET', token, body, search } = {}) {
  const url = new URL(pathname, 'https://holybiblegpt.com');
  if (search) {
    for (const [key, value] of Object.entries(search)) url.searchParams.set(key, value);
  }
  return new Request(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function read(response) {
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return {
    status: response.status,
    type: response.headers.get('content-type') || '',
    text,
    json,
  };
}

test('migration only creates tables and wrangler binds the provisioned D1 database', () => {
  const sql = readFileSync(new URL('../migrations/0001_app_storage.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS app_kv/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS kv_set_members/);
  assert.doesNotMatch(sql, /\bDROP\b/i);
  assert.doesNotMatch(sql, /\bDELETE\b/i);
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i);

  const raw = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const config = JSON.parse(stripJsonc(raw));
  assert.equal(config.d1_databases[0].binding, 'DB');
  assert.equal(config.d1_databases[0].database_name, 'holybiblegpt');
  assert.equal(config.d1_databases[0].database_id, '57f368b2-1ece-47f3-9838-896ddbd5eabe');
  assert.equal(config.d1_databases[0].migrations_dir, 'migrations');
  assert.doesNotMatch(raw, /REPLACE_WITH_DATABASE_ID/);
});

test('account routes reject a missing Puter token with JSON, not the SPA', async () => {
  for (const [pathname, method, body] of [
    ['/api/get-status', 'GET'],
    ['/api/check-status', 'GET'],
    ['/api/get-usage', 'GET'],
    ['/api/sync-pull', 'GET'],
    ['/api/increment-usage', 'POST', { userId: 'alice' }],
    ['/api/sync-push', 'POST', { userId: 'alice', data: { notes: {} } }],
  ]) {
    const response = await read(await handleApi(
      request(pathname, {
        method,
        body,
        search: method === 'GET' ? { userId: 'alice' } : undefined,
      }),
      {},
    ));
    assert.equal(response.status, 401, pathname);
    assert.match(response.type, /application\/json/);
    assert.equal(response.json.error, 'Authentication required.');
    assert.doesNotMatch(response.text, /<!doctype html>/i);
  }
});

test('a caller cannot read or write another account, and sync round-trips', async () => {
  const env = { DB: sqliteDb() };
  const alice = session('alice');

  const denied = await read(await handleApi(
    request('/api/sync-push', {
      method: 'POST',
      token: 'alice-token',
      body: { userId: 'bob', data: { prayers: ['overwrite'] } },
    }),
    env,
    { verify: alice },
  ));
  assert.equal(denied.status, 403);
  assert.equal(denied.json.error, 'You can only access your own account.');

  const notPro = await read(await handleApi(
    request('/api/sync-push', {
      method: 'POST',
      token: 'alice-token',
      body: { userId: 'alice', data: { prayers: ['mine'], notes: { a: 'secret' } } },
    }),
    env,
    { verify: alice },
  ));
  assert.equal(notPro.status, 403);

  const kv = createD1Kv(env.DB);
  await kv.set('user:alice:status', 'pro');

  const pushed = await read(await handleApi(
    request('/api/sync-push', {
      method: 'POST',
      token: 'alice-token',
      body: { userId: 'alice', data: { prayers: ['mine'], notes: { a: 'secret' }, chatHistory: [{ text: 'hi' }] } },
    }),
    env,
    { verify: alice },
  ));
  assert.equal(pushed.status, 200);
  assert.equal(pushed.json.ok, true);
  assert.equal(typeof pushed.json.syncedAt, 'number');

  const pulled = await read(await handleApi(
    request('/api/sync-pull', { token: 'alice-token', search: { userId: 'alice' } }),
    env,
    { verify: alice },
  ));
  assert.equal(pulled.status, 200);
  assert.deepEqual(pulled.json.data.prayers, ['mine']);
  assert.deepEqual(pulled.json.data.notes, { a: 'secret' });
  assert.deepEqual(pulled.json.data.chatHistory, [{ text: 'hi' }]);
  assert.equal(pulled.json.data.syncedAt, pushed.json.syncedAt);

  const bob = await read(await handleApi(
    request('/api/sync-pull', { token: 'bob-token', search: { userId: 'bob' } }),
    env,
    { verify: session('bob') },
  ));
  assert.equal(bob.status, 403);

  const status = await read(await handleApi(
    request('/api/get-status', { token: 'alice-token', search: { userId: 'alice' } }),
    env,
    { verify: alice },
  ));
  assert.equal(status.status, 200);
  assert.equal(status.json.status, 'pro');

  const check = await read(await handleApi(
    request('/api/check-status', { token: 'alice-token', search: { userId: 'alice' } }),
    env,
    { verify: alice },
  ));
  assert.equal(check.json.isPro, true);
});

test('usage counts past five questions and a storage error still allows study', async () => {
  const env = { DB: sqliteDb() };
  const alice = session('alice');

  const counts = [];
  for (let i = 0; i < 6; i += 1) {
    const response = await read(await handleApi(
      request('/api/increment-usage', { method: 'POST', token: 'alice-token', body: { userId: 'alice' } }),
      env,
      { verify: alice },
    ));
    assert.equal(response.status, 200);
    assert.equal(response.json.allowed, true);
    assert.equal(response.json.isPro, false);
    assert.equal(response.json.remaining, null);
    counts.push(response.json.count);
  }
  assert.deepEqual(counts, [1, 2, 3, 4, 5, 6]);

  const usage = await read(await handleApi(
    request('/api/get-usage', { token: 'alice-token', search: { userId: 'alice' } }),
    env,
    { verify: alice },
  ));
  assert.equal(usage.json.count, 6);
  assert.equal(usage.json.remaining, null);
  assert.equal(usage.json.limit, null);
  assert.equal(usage.json.isPro, false);

  await createD1Kv(env.DB).set('user:alice:status', 'pro');
  const pro = await read(await handleApi(
    request('/api/increment-usage', { method: 'POST', token: 'alice-token', body: { userId: 'alice' } }),
    env,
    { verify: alice },
  ));
  assert.equal(pro.json.allowed, true);
  assert.equal(pro.json.isPro, true);
  assert.equal(pro.json.remaining, null);

  const outage = await read(await handleApi(
    request('/api/increment-usage', { method: 'POST', token: 'alice-token', body: { userId: 'alice' } }),
    {},
    {
      verify: alice,
      kv: {
        async get() { throw new Error('d1 down'); },
        async incr() { throw new Error('d1 down'); },
      },
    },
  ));
  assert.equal(outage.status, 200);
  assert.equal(outage.json.allowed, true);
  assert.equal(outage.json.unavailable, true);
  assert.equal(outage.json.remaining, null);
  assert.equal(JSON.stringify(outage.json).includes('d1 down'), false);
});

test('without D1, usage stays unenforced and sync fails closed', async () => {
  const alice = session('alice');
  const usage = await read(await handleApi(
    request('/api/increment-usage', { method: 'POST', token: 'alice-token', body: { userId: 'alice' } }),
    {},
    { verify: alice },
  ));
  assert.equal(usage.status, 404);
  assert.match(usage.type, /application\/json/);
  assert.doesNotMatch(usage.text, /<!doctype html>/i);

  const sync = await read(await handleApi(
    request('/api/sync-pull', { token: 'alice-token', search: { userId: 'alice' } }),
    {},
    { verify: alice },
  ));
  assert.equal(sync.status, 503);
  assert.equal(sync.json.error, 'Storage is not configured.');
});
