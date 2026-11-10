import test from 'node:test';
import assert from 'node:assert/strict';
import { chatUsageView, consumeFromPayload, usageFromPayload } from '../services/usageGate.ts';

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
