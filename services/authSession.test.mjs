import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RETURN_PATH_KEY,
  classifySignInError,
  isSafeReturnPath,
  readReturnPath,
  rememberReturnPath,
  restoreReturnPath,
} from './authSession.ts';

function memoryStore() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
  };
}

test('return path accepts in-app paths and rejects off-site values', () => {
  assert.equal(isSafeReturnPath('/bible/john/3'), true);
  assert.equal(isSafeReturnPath('/settings?billing_status=success'), true);
  assert.equal(isSafeReturnPath('/bible/psalm/23#verse'), true);
  assert.equal(isSafeReturnPath('https://example.com'), false);
  assert.equal(isSafeReturnPath('//evil.example'), false);
  assert.equal(isSafeReturnPath('/\\evil'), false);
  assert.equal(isSafeReturnPath('/ok\nset-cookie'), false);
});

test('restore sends the reader back to the page they left', () => {
  const store = memoryStore();
  rememberReturnPath('/bible/john/3', store);
  let applied = '';
  const changed = restoreReturnPath(store, (path) => { applied = path; }, '/');
  assert.equal(changed, true);
  assert.equal(applied, '/bible/john/3');
  assert.equal(readReturnPath(store), null);
  assert.equal(store.getItem(RETURN_PATH_KEY), null);
});

test('restore does nothing when they are already on that page', () => {
  const store = memoryStore();
  rememberReturnPath('/about', store);
  let calls = 0;
  const changed = restoreReturnPath(store, () => { calls += 1; }, '/about');
  assert.equal(changed, false);
  assert.equal(calls, 0);
  assert.equal(readReturnPath(store), null);
});

test('unsafe stored paths are ignored', () => {
  const store = memoryStore();
  store.setItem(RETURN_PATH_KEY, 'https://evil.example/phish');
  let calls = 0;
  const changed = restoreReturnPath(store, () => { calls += 1; }, '/');
  assert.equal(changed, false);
  assert.equal(calls, 0);
});

test('popup blocked, connection trouble, and other failures get a calm message', () => {
  const blocked = classifySignInError(new Error('Popup blocked by the browser'));
  assert.equal(blocked.kind, 'popup-blocked');
  assert.match(blocked.message, /blocked/i);
  assert.match(blocked.message, /try again/i);

  const down = classifySignInError(new Error('Failed to fetch'));
  assert.equal(down.kind, 'unavailable');
  assert.match(down.message, /connection/i);

  const other = classifySignInError(new Error('nope'));
  assert.equal(other.kind, 'failed');
  assert.match(other.message, /try again whenever you like/i);
});
