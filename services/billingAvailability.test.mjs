import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  describeBilling,
  giftLinkVisible,
  interpretBillingResponse,
  isProSubscriptionStatus,
  priceForInterval,
  publicBillingStatus,
  safeGiftUrl,
  sessionGrantsPlus,
  subscriptionIdFromInvoice,
} from './billingAvailability.mjs';

const hidden = {
  checkout: false,
  portal: false,
  intervals: { month: false, year: false },
  giftUrl: '',
};

test('a non-JSON or failed billing probe hides checkout and the portal', () => {
  assert.deepEqual(interpretBillingResponse(500, 'text/html', null), hidden);
  assert.deepEqual(interpretBillingResponse(200, 'text/html', '<html>'), hidden);
  assert.deepEqual(
    interpretBillingResponse(200, 'application/json', { checkout: false, portal: false }),
    hidden
  );
  assert.deepEqual(
    interpretBillingResponse(200, 'application/json; charset=utf-8', { checkout: true, portal: true }),
    { checkout: true, portal: true, intervals: { month: true, year: false }, giftUrl: '' }
  );
});

test('checkout stays disabled without Stripe secrets, and a legacy price is monthly', () => {
  const bare = describeBilling({ APP_URL: 'https://holybiblegpt.com' }, true);
  assert.equal(bare.checkout, false);
  assert.equal(bare.portal, false);
  assert.deepEqual(publicBillingStatus(bare), {
    checkout: false,
    portal: false,
    intervals: { month: false, year: false },
  });
  assert.equal(publicBillingStatus(bare).giftUrl, undefined);

  const secretOnly = describeBilling({
    APP_URL: 'https://holybiblegpt.com',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
  }, true);
  assert.equal(secretOnly.checkout, false);
  assert.equal(secretOnly.portal, true);

  const noStore = describeBilling({
    APP_URL: 'https://holybiblegpt.com',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_PRICE_ID: 'price_legacy',
  }, false);
  assert.equal(noStore.checkout, false);

  const legacy = describeBilling({
    APP_URL: 'https://holybiblegpt.com',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_PRICE_ID: 'price_legacy',
  }, true);
  assert.equal(legacy.checkout, true);
  assert.deepEqual(legacy.intervals, { month: true, year: false });
  assert.equal(legacy.monthly, 'price_legacy');
});

test('interval selects the Plus price, with STRIPE_PRICE_ID as the monthly fallback', () => {
  const env = {
    STRIPE_PRICE_ID: 'price_legacy',
    STRIPE_PRICE_ID_MONTHLY: 'price_month',
    STRIPE_PRICE_ID_YEARLY: 'price_year',
  };
  assert.deepEqual(priceForInterval(env, 'month'), { ok: true, interval: 'month', price: 'price_month' });
  assert.deepEqual(priceForInterval(env, 'year'), { ok: true, interval: 'year', price: 'price_year' });
  assert.deepEqual(priceForInterval(env, undefined), { ok: true, interval: 'month', price: 'price_month' });
  assert.equal(priceForInterval(env, 'week').ok, false);
  assert.equal(priceForInterval(env, 'week').reason, 'invalid');

  const fallback = { STRIPE_PRICE_ID: 'price_legacy' };
  assert.deepEqual(priceForInterval(fallback, 'month'), { ok: true, interval: 'month', price: 'price_legacy' });
  assert.deepEqual(priceForInterval(fallback, ''), { ok: true, interval: 'month', price: 'price_legacy' });
  assert.equal(priceForInterval(fallback, 'year').ok, false);
  assert.equal(priceForInterval(fallback, 'year').reason, 'missing');

  const yearlyOnly = { STRIPE_PRICE_ID_YEARLY: 'price_year' };
  assert.equal(priceForInterval(yearlyOnly, 'month').ok, false);
  assert.deepEqual(priceForInterval(yearlyOnly, 'year'), { ok: true, interval: 'year', price: 'price_year' });
});

test('the gift link stays hidden when GIFT_URL is unset or not a Stripe Payment Link', () => {
  assert.equal(giftLinkVisible(''), false);
  assert.equal(giftLinkVisible(undefined), false);
  assert.equal(giftLinkVisible('https://buymeacoffee.com/holybiblegpt'), false);
  assert.equal(giftLinkVisible('http://buy.stripe.com/test'), false);
  assert.equal(giftLinkVisible('http://donate.stripe.com/test'), false);
  assert.equal(giftLinkVisible('https://donate.stripe.com.evil.example/test'), false);
  const unset = describeBilling({ APP_URL: 'https://holybiblegpt.com' }, true);
  assert.equal(unset.giftUrl, '');
  assert.equal(giftLinkVisible(unset.giftUrl), false);
  assert.equal(publicBillingStatus(unset).giftUrl, undefined);

  const set = describeBilling({
    GIFT_URL: 'https://buy.stripe.com/test_gift',
  }, false);
  assert.equal(set.giftUrl, 'https://buy.stripe.com/test_gift');
  assert.equal(giftLinkVisible(set.giftUrl), true);
  assert.equal(set.checkout, false);
  assert.equal(publicBillingStatus(set).giftUrl, 'https://buy.stripe.com/test_gift');

  const donate = 'https://donate.stripe.com/3cIcN57qad0l3bA6gAcEw00';
  assert.equal(safeGiftUrl(donate), donate);
  assert.equal(giftLinkVisible(donate), true);
  const wrangler = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  assert.match(wrangler, new RegExp(donate.replace(/[.]/g, '\\.')));

  const support = readFileSync(new URL('../components/MissionGift.tsx', import.meta.url), 'utf8');
  assert.match(support, /Giving is optional and unlocks nothing/);
  assert.match(support, /not a registered charity/);
  assert.match(support, /not tax-deductible/);
  assert.match(support, /\$5, \$10, and \$25/);
  assert.match(support, /if \(!giftLinkVisible\(giftUrl\)\) return null/);
  assert.doesNotMatch(support, /buy\.stripe\.com\/[A-Za-z0-9]/);
});

test('monthly and yearly subscription checkouts grant Plus, and a gift payment does not', () => {
  assert.equal(sessionGrantsPlus({ mode: 'subscription', metadata: { interval: 'month' } }), true);
  assert.equal(sessionGrantsPlus({ mode: 'subscription', metadata: { interval: 'year' } }), true);
  assert.equal(sessionGrantsPlus({ metadata: { userId: 'alice' } }), true);
  assert.equal(sessionGrantsPlus({ mode: 'payment', metadata: { userId: 'alice' } }), false);
  assert.equal(sessionGrantsPlus(null), false);
});

test('Plus pricing copy names both prices and keeps study free', () => {
  const plan = readFileSync(new URL('../components/PlusPlan.tsx', import.meta.url), 'utf8');
  const prices = readFileSync(new URL('./billingAvailability.mjs', import.meta.url), 'utf8');
  assert.match(prices, /\$4\.99 per month/);
  assert.match(prices, /\$39\.99 per year/);
  assert.match(plan, /PLUS_MONTHLY_LABEL/);
  assert.match(plan, /PLUS_YEARLY_LABEL/);
  assert.match(plan, /\$4\.99/);
  assert.match(plan, /\$39\.99/);
  assert.match(plan, /free forever/);
  assert.match(plan, /no question limit/);
  assert.doesNotMatch(plan, /unlock God/i);
  assert.doesNotMatch(plan, /limited time|only today|hurry|don't miss/i);
  const chat = readFileSync(new URL('../components/ChatInterface.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(chat, /paywall|free questions|Upgrade to Pro|FREE_LIMIT|You've used your/);
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  assert.match(app, /gift'\) === 'thanks'/);
  assert.match(app, /Thank you for the gift/);
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
