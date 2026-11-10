import test from 'node:test';
import assert from 'node:assert/strict';
import { chatUsageView, consumeFromHttp, consumeFromPayload, usageFromHttp, usageFromPayload } from '../services/usageGate.ts';

const SPA_HTML = '<!doctype html><html><title>Holy Bible GPT</title><div id="root"></div></html>';

test('a missing usage API lets the question through, and a real API error does not', () => {
  // holybiblegpt.com is the Worker. It has no /api/increment-usage, so the
  // asset fallback returns the SPA document. That must not block the chat.
  const shell = consumeFromHttp(200, SPA_HTML);
  assert.equal(shell.allowed, true);
  assert.equal(shell.unavailable, undefined);
  assert.equal(usageFromHttp(200, SPA_HTML).unavailable, undefined);
  assert.equal(chatUsageView(usageFromHttp(200, SPA_HTML)), 'hidden');

  const notFound = consumeFromHttp(404, 'Not found');
  assert.equal(notFound.allowed, true);
  assert.equal(notFound.unavailable, undefined);
  assert.equal(consumeFromHttp(404, SPA_HTML).allowed, true);
  assert.equal(usageFromHttp(404, SPA_HTML).unavailable, undefined);

  // Vercel serves the real handlers. A JSON 5xx stays closed, as does the
  // network-error result the client returns when fetch throws.
  const unavailable = consumeFromHttp(503, JSON.stringify({
    allowed: false,
    isPro: false,
    remaining: null,
    unavailable: true,
    error: 'Usage service unavailable.',
  }));
  assert.equal(unavailable.allowed, false);
  assert.equal(unavailable.unavailable, true);
  assert.equal(chatUsageView(usageFromHttp(503, JSON.stringify({
    error: 'Usage service unavailable.',
    unavailable: true,
  }))), 'unavailable');

  const crashed = consumeFromHttp(500, JSON.stringify({ error: 'Usage service unavailable.' }));
  assert.equal(crashed.allowed, false);
  assert.equal(crashed.unavailable, true);

  const network = consumeFromPayload(false, null);
  assert.equal(network.allowed, false);
  assert.equal(network.unavailable, true);

  // The real API's own allow and deny bodies are unchanged.
  const denied = consumeFromHttp(200, JSON.stringify({ allowed: false, isPro: false, remaining: 0 }));
  assert.equal(denied.allowed, false);
  assert.equal(denied.remaining, 0);
  const granted = consumeFromHttp(200, JSON.stringify({ allowed: true, isPro: false, remaining: 4 }));
  assert.equal(granted.allowed, true);
  assert.equal(granted.remaining, 4);
  const unauthorized = consumeFromHttp(401, JSON.stringify({ error: 'Authentication required.' }));
  assert.equal(unauthorized.allowed, false);
  assert.equal(unauthorized.unavailable, true);
});

test('client usage gate fails closed unless the server explicitly allows', () => {
  const outage = consumeFromPayload(false, null);
  assert.equal(outage.allowed, false);
  assert.equal(outage.unavailable, true);

  const serverDown = consumeFromPayload(false, { allowed: true, isPro: true, remaining: null });
  assert.equal(serverDown.allowed, false);

  const weird = consumeFromPayload(true, { allowed: 'true', isPro: 'true' });
  assert.equal(weird.allowed, false);
  assert.notEqual(weird.isPro, true);

  const paywall = consumeFromPayload(true, { allowed: false, isPro: false, remaining: 0 });
  assert.equal(paywall.allowed, false);
  assert.equal(paywall.remaining, 0);
  assert.equal(paywall.unavailable, undefined);

  const pro = consumeFromPayload(true, { allowed: true, isPro: true, remaining: null });
  assert.equal(pro.allowed, true);
  assert.equal(pro.isPro, true);

  const readOutage = usageFromPayload(false, { isPro: true, remaining: 5, count: 0, limit: 5 });
  assert.equal(readOutage.isPro, false);
  assert.equal(readOutage.unavailable, true);
  assert.equal(chatUsageView(readOutage), 'unavailable');
  assert.equal(chatUsageView({ isPro: false, count: 5, remaining: 0, limit: 5 }), 'paywall');
  assert.equal(chatUsageView({ isPro: true, count: 0, remaining: null, limit: 5 }), 'hidden');
  assert.equal(chatUsageView({ isPro: false, count: 1, remaining: 4, limit: 5 }), 'remaining');
});
