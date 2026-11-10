import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('daily push fails closed without CRON_SECRET', () => {
  const route = readFileSync(new URL('../api/push-send-daily.ts', import.meta.url), 'utf8');
  const auth = readFileSync(new URL('../api/_lib/cronAuth.mjs', import.meta.url), 'utf8');
  assert.match(route, /authorizeCron\(/);
  assert.doesNotMatch(route, /If not configured, allow through/);
  assert.match(auth, /CRON_SECRET is not configured/);
});

test('the service worker does not precache a missing stylesheet', () => {
  const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /index\.css/);
  assert.match(source, /cache\.add\(url\)\.catch/);
});
