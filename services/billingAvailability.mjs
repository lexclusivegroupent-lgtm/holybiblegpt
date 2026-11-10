// Decides whether the Plus buttons should be shown. A HTML response (the
// Cloudflare Worker serves the SPA for unknown /api routes) is not a
// working billing API.
//
// Plus is one plan with two billing intervals. Reading, search, and AI
// study do not depend on it. STRIPE_PRICE_ID remains the monthly fallback
// when STRIPE_PRICE_ID_MONTHLY is unset.

export const PLUS_MONTHLY_LABEL = '$4.99 per month';
export const PLUS_YEARLY_LABEL = '$39.99 per year';

export function nonempty(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

export function publicOrigin(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    if (url.username || url.password) return '';
    if (url.search || url.hash) return '';
    if (url.pathname !== '/' && url.pathname !== '') return '';
    return url.origin;
  } catch {
    return '';
  }
}

// Payment Links are hosted on buy.stripe.com. Donate links (submit_type=donate)
// use donate.stripe.com. Anything else stays hidden.
const GIFT_HOSTS = new Set(['buy.stripe.com', 'donate.stripe.com']);

export function safeGiftUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return '';
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return '';
    if (url.username || url.password) return '';
    if (!GIFT_HOSTS.has(url.hostname)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function giftLinkVisible(giftUrl) {
  return safeGiftUrl(giftUrl) !== '';
}

export function priceForInterval(env, interval) {
  const requested = interval === undefined || interval === null || interval === '' ? 'month' : interval;
  if (requested !== 'month' && requested !== 'year') {
    return { ok: false, reason: 'invalid', error: 'Choose month or year.' };
  }
  const monthly = nonempty(env?.STRIPE_PRICE_ID_MONTHLY) || nonempty(env?.STRIPE_PRICE_ID);
  const yearly = nonempty(env?.STRIPE_PRICE_ID_YEARLY);
  const price = requested === 'year' ? yearly : monthly;
  if (!price) {
    return { ok: false, reason: 'missing', error: 'That billing interval is not configured.' };
  }
  return { ok: true, interval: requested, price };
}

// Checkout stays off until a secret key, a public origin, storage, and at
// least one price exist. The legacy STRIPE_PRICE_ID counts as monthly.
export function describeBilling(env, storeReady) {
  const secret = nonempty(env?.STRIPE_SECRET_KEY);
  const monthly = nonempty(env?.STRIPE_PRICE_ID_MONTHLY) || nonempty(env?.STRIPE_PRICE_ID);
  const yearly = nonempty(env?.STRIPE_PRICE_ID_YEARLY);
  const webhookSecret = nonempty(env?.STRIPE_WEBHOOK_SECRET);
  const appUrl = publicOrigin(nonempty(env?.APP_URL) || nonempty(env?.VITE_APP_URL));
  const ready = storeReady === true;
  const giftUrl = safeGiftUrl(env?.GIFT_URL);
  return {
    secret,
    monthly,
    yearly,
    webhookSecret,
    appUrl,
    checkout: Boolean(secret && appUrl && ready && (monthly || yearly)),
    portal: Boolean(secret && appUrl && ready),
    intervals: { month: Boolean(monthly), year: Boolean(yearly) },
    giftUrl,
  };
}

export function publicBillingStatus(config) {
  const body = {
    checkout: config?.checkout === true,
    portal: config?.portal === true,
    intervals: {
      month: config?.intervals?.month === true,
      year: config?.intervals?.year === true,
    },
  };
  const giftUrl = safeGiftUrl(config?.giftUrl);
  if (giftUrl) body.giftUrl = giftUrl;
  return body;
}

export function interpretBillingResponse(status, contentType, body) {
  const hidden = {
    checkout: false,
    portal: false,
    intervals: { month: false, year: false },
    giftUrl: '',
  };
  if (status !== 200 || !String(contentType || '').includes('application/json') || !body || typeof body !== 'object') {
    return hidden;
  }
  const checkout = body.checkout === true;
  const month = body.intervals?.month === true;
  const year = body.intervals?.year === true;
  return {
    checkout,
    portal: body.portal === true,
    intervals: {
      month: month || (checkout && body.intervals == null),
      year,
    },
    giftUrl: safeGiftUrl(body.giftUrl),
  };
}

// One-time gifts use Checkout mode "payment" and must not grant Plus.
// A session with no mode is the older fixture shape and still grants.
export function sessionGrantsPlus(session) {
  if (!session || typeof session !== 'object') return false;
  if (session.mode && session.mode !== 'subscription') return false;
  return true;
}

// Stored account value. Existing rows use "pro". "plus" is accepted so a
// later write does not need a migration. API responses still say "pro".
export function hasPlusEntitlement(status) {
  return status === 'pro' || status === 'plus';
}

// Pro stays only while Stripe reports an active or trialing subscription.
// past_due, unpaid, canceled, incomplete, and incomplete_expired do not.
export function isProSubscriptionStatus(status) {
  return status === 'active' || status === 'trialing';
}

export function subscriptionIdFromInvoice(invoice) {
  const nested = invoice?.parent?.subscription_details?.subscription;
  if (typeof nested === 'string') return nested;
  if (nested && typeof nested.id === 'string') return nested.id;
  const legacy = invoice?.subscription;
  if (typeof legacy === 'string') return legacy;
  if (legacy && typeof legacy.id === 'string') return legacy.id;
  return null;
}
