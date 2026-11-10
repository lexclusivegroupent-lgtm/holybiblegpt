import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeCron } from '../api/_lib/cronAuth.mjs';
import { PUTER_WHOAMI_URL, verifyPuterIdentity } from '../api/_lib/puterIdentity.mjs';
import {
  createCheckoutHandler,
  createGetUsageHandler,
  createIncrementUsageHandler,
  createPortalHandler,
  createSyncPullHandler,
  createSyncPushHandler,
} from '../api/_lib/userHandlers.mjs';

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function whoamiFetch(username, { status = 200, throwError = false, redirect = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (throwError) throw new Error('network down');
    if (redirect) return { status: 302, ok: false, json: async () => ({}) };
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => ({ username, email: 'hidden@example.com' }),
    };
  };
  return { fetchImpl, calls };
}

function memoryKv(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async incr(key) {
      const next = (store.get(key) || 0) + 1;
      store.set(key, next);
      return next;
    },
  };
}

// Stands in for verifyPuterIdentity after whoami: only the named account passes.
function session(username) {
  return async (_authorization, requested) => (
    requested === username
      ? { ok: true, username }
      : { ok: false, status: 403, error: 'You can only access your own account.' }
  );
}

const signedOut = async () => ({ ok: false, status: 401, error: 'Authentication required.' });

test('Puter whoami is required and fails closed', async () => {
  assert.equal((await verifyPuterIdentity(undefined, 'alice')).status, 401);
  assert.equal((await verifyPuterIdentity('Bearer token', 'not a user!')).status, 400);
  assert.equal((await verifyPuterIdentity('Bearer token', 'alice/../bob')).status, 400);

  const mismatch = whoamiFetch('bob');
  const mismatchResult = await verifyPuterIdentity('Bearer token-value', 'alice', mismatch.fetchImpl);
  assert.equal(mismatchResult.status, 403);
  assert.equal(mismatch.calls[0].url, PUTER_WHOAMI_URL);
  assert.equal(mismatch.calls[0].init.method, 'GET');
  assert.equal(mismatch.calls[0].init.redirect, 'manual');
  assert.equal(mismatch.calls[0].init.headers.Authorization, 'Bearer token-value');

  assert.equal((await verifyPuterIdentity('Bearer token', 'alice', whoamiFetch('alice', { status: 500 }).fetchImpl)).status, 503);
  assert.equal((await verifyPuterIdentity('Bearer token', 'alice', whoamiFetch('alice', { status: 401 }).fetchImpl)).status, 401);
  assert.equal((await verifyPuterIdentity('Bearer token', 'alice', whoamiFetch('alice', { throwError: true }).fetchImpl)).status, 503);
  assert.equal((await verifyPuterIdentity('Bearer token', 'alice', whoamiFetch('alice', { redirect: true }).fetchImpl)).status, 503);
  assert.equal((await verifyPuterIdentity('Bearer token', 'alice', async () => ({
    status: 200,
    ok: true,
    json: async () => ({ email: 'only@example.com' }),
  }))).status, 503);

  assert.deepEqual(
    await verifyPuterIdentity('Bearer token-value', 'alice', whoamiFetch('alice').fetchImpl),
    { ok: true, username: 'alice' },
  );
});

test('daily push cron fails closed unless CRON_SECRET matches', () => {
  assert.equal(authorizeCron(undefined, undefined).status, 503);
  assert.equal(authorizeCron('Bearer anything', '').status, 503);
  assert.equal(authorizeCron(undefined, 'secret').status, 401);
  assert.equal(authorizeCron('Bearer wrong', 'secret').status, 401);
  assert.equal(authorizeCron('Bearer secret-extra', 'secret').status, 401);
  assert.equal(authorizeCron('secret', 'secret').status, 401);
  const leaked = authorizeCron('Bearer no', 'super-secret-value');
  assert.equal(leaked.status, 401);
  assert.equal(JSON.stringify(leaked).includes('super-secret-value'), false);
  assert.deepEqual(authorizeCron('Bearer super-secret-value', 'super-secret-value'), { ok: true });
});

test('sync does not read or write another user, and stores under the verified username', async () => {
  const kv = memoryKv({
    'user:alice:status': 'pro',
    'user:alice:data': { prayers: ['private'], notes: { a: 'secret' }, chatHistory: [{ text: 'hi' }] },
  });

  const unauthenticated = mockRes();
  await createSyncPullHandler({ kv, verify: signedOut })(
    { method: 'GET', query: { userId: 'alice' }, headers: {} },
    unauthenticated,
  );
  assert.equal(unauthenticated.statusCode, 401);

  const push = createSyncPushHandler({ kv, verify: session('alice') });
  const denied = mockRes();
  await push({
    method: 'POST',
    headers: { authorization: 'Bearer x' },
    body: { userId: 'bob', data: { prayers: ['overwrite'] } },
  }, denied);
  assert.equal(denied.statusCode, 403);
  assert.deepEqual(kv.store.get('user:alice:data').prayers, ['private']);
  assert.equal(kv.store.has('user:bob:data'), false);

  const allowedPull = mockRes();
  await createSyncPullHandler({ kv, verify: session('alice') })(
    { method: 'GET', query: { userId: 'alice' }, headers: { authorization: 'Bearer x' } },
    allowedPull,
  );
  assert.equal(allowedPull.statusCode, 200);
  assert.deepEqual(allowedPull.body.data.chatHistory, [{ text: 'hi' }]);

  const allowedPush = mockRes();
  await push({
    method: 'POST',
    headers: { authorization: 'Bearer x' },
    body: { userId: 'alice', data: { prayers: ['mine'] } },
  }, allowedPush);
  assert.equal(allowedPush.statusCode, 200);
  assert.deepEqual(kv.store.get('user:alice:data').prayers, ['mine']);
});

test('usage, checkout, and the billing portal fail closed', async () => {
  const kv = memoryKv({
    'user:alice:status': 'pro',
    'user:alice:customer': 'cus_alice',
  });

  const usageRes = mockRes();
  await createGetUsageHandler({ kv, verify: signedOut })(
    { method: 'GET', query: { userId: 'alice' }, headers: {} },
    usageRes,
  );
  assert.equal(usageRes.statusCode, 401);
  assert.notEqual(usageRes.body?.isPro, true);

  const outage = mockRes();
  await createIncrementUsageHandler({
    kv: {
      async get() { throw new Error('kv down'); },
      async incr() { throw new Error('kv down'); },
    },
    verify: session('alice'),
  })({ method: 'POST', headers: { authorization: 'Bearer x' }, body: { userId: 'alice' } }, outage);
  assert.equal(outage.statusCode, 503);
  assert.equal(outage.body.allowed, false);
  assert.equal(outage.body.isPro, false);
  assert.equal(outage.body.unavailable, true);
  assert.equal(JSON.stringify(outage.body).includes('kv down'), false);

  const freeKv = memoryKv();
  const free = mockRes();
  await createIncrementUsageHandler({ kv: freeKv, verify: session('alice') })(
    { method: 'POST', headers: { authorization: 'Bearer x' }, body: { userId: 'alice' } },
    free,
  );
  assert.equal(free.body.allowed, true);
  assert.equal(free.body.isPro, false);
  assert.equal(freeKv.store.get('usage:alice:count'), 1);

  let sessions = 0;
  const deniedCheckout = mockRes();
  await createCheckoutHandler({
    verify: session('alice'),
    createSession: async () => { sessions += 1; return { url: 'https://stripe.example/pay' }; },
  })({ method: 'POST', headers: { authorization: 'Bearer x' }, body: { userId: 'bob' } }, deniedCheckout);
  assert.equal(deniedCheckout.statusCode, 403);
  assert.equal(sessions, 0);

  let billedUser = '';
  const checkout = mockRes();
  await createCheckoutHandler({
    verify: session('alice'),
    createSession: async (userId) => { billedUser = userId; sessions += 1; return { url: 'https://stripe.example/pay' }; },
  })({ method: 'POST', headers: { authorization: 'Bearer x' }, body: { userId: 'alice' } }, checkout);
  assert.equal(checkout.statusCode, 200);
  assert.equal(billedUser, 'alice');
  assert.equal(sessions, 1);

  let portals = 0;
  const deniedPortal = mockRes();
  await createPortalHandler({
    kv,
    verify: signedOut,
    createPortalSession: async () => { portals += 1; return { url: 'https://billing.example' }; },
  })({ method: 'POST', headers: {}, body: { userId: 'alice' } }, deniedPortal);
  assert.equal(deniedPortal.statusCode, 401);
  assert.equal(portals, 0);

  let portalCustomer = '';
  const portal = mockRes();
  await createPortalHandler({
    kv,
    verify: session('alice'),
    createPortalSession: async (customerId) => { portalCustomer = customerId; return { url: 'https://billing.example' }; },
  })({ method: 'POST', headers: { authorization: 'Bearer x' }, body: { userId: 'alice' } }, portal);
  assert.equal(portal.statusCode, 200);
  assert.equal(portalCustomer, 'cus_alice');
});
