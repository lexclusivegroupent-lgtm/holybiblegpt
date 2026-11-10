import assert from 'node:assert/strict';
import test from 'node:test';
import {
  interpretBillingResponse,
  isProSubscriptionStatus,
  subscriptionIdFromInvoice,
} from './billingAvailability.mjs';

test('a non-JSON or failed billing probe hides checkout and the portal', () => {
  assert.deepEqual(interpretBillingResponse(500, 'text/html', null), { checkout: false, portal: false });
  assert.deepEqual(interpretBillingResponse(200, 'text/html', '<html>'), { checkout: false, portal: false });
  assert.deepEqual(
    interpretBillingResponse(200, 'application/json', { checkout: false, portal: false }),
    { checkout: false, portal: false }
  );
  assert.deepEqual(
    interpretBillingResponse(200, 'application/json; charset=utf-8', { checkout: true, portal: true }),
    { checkout: true, portal: true }
  );
});

test('only an active or trialing subscription remains Pro', () => {
  assert.equal(isProSubscriptionStatus('active'), true);
  assert.equal(isProSubscriptionStatus('trialing'), true);
  for (const status of ['past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused']) {
    assert.equal(isProSubscriptionStatus(status), false, status);
  }
});

test('the subscription id is read from the current invoice shape and the older field', () => {
  assert.equal(subscriptionIdFromInvoice({
    parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_123' } },
  }), 'sub_123');
  assert.equal(subscriptionIdFromInvoice({ subscription: 'sub_legacy' }), 'sub_legacy');
  assert.equal(subscriptionIdFromInvoice({}), null);
});
