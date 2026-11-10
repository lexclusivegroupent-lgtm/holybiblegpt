import { createHmac } from 'node:crypto';
import { secretsMatch } from '../../api/_lib/secureCompare.mjs';
import { USERNAME_RE, verifyPuterIdentity } from '../../api/_lib/puterIdentity.mjs';
import { isProSubscriptionStatus, subscriptionIdFromInvoice } from '../../services/billingAvailability.mjs';
import { createCheckoutHandler, createPortalHandler } from '../../api/_lib/userHandlers.mjs';
import { openStore } from './d1kv.mjs';
import { callHandler, json, readJson } from './responses.mjs';

const STRIPE_VERSION = '2025-12-15.clover';
const CUSTOMER_RE = /^cus_[A-Za-z0-9]+$/;
const SUBSCRIPTION_RE = /^sub_[A-Za-z0-9]+$/;
const EVENT_RE = /^evt_[A-Za-z0-9]+$/;
const SIGNATURE_TOLERANCE_SECONDS = 300;

function nonempty(value) {
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

// Checkout and the portal stay off until Stripe is configured AND storage
// can record the customer. A public APP_URL by itself does not enable them.
export function billingConfig(env, storeReady) {
  const secret = nonempty(env?.STRIPE_SECRET_KEY);
  const price = nonempty(env?.STRIPE_PRICE_ID);
  const webhookSecret = nonempty(env?.STRIPE_WEBHOOK_SECRET);
  const appUrl = publicOrigin(nonempty(env?.APP_URL) || nonempty(env?.VITE_APP_URL));
  const ready = storeReady === true;
  return {
    secret,
    price,
    webhookSecret,
    appUrl,
    checkout: Boolean(secret && price && appUrl && ready),
    portal: Boolean(secret && appUrl && ready),
  };
}

async function resolveStore(env, deps) {
  if (deps.kv !== undefined) return deps.kv;
  return openStore(env);
}

function formBody(entries) {
  const params = new URLSearchParams();
  for (const [key, value] of entries) params.append(key, String(value));
  return params.toString();
}

async function stripeRequest(env, path, { method, body, fetchImpl }) {
  const response = await fetchImpl(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Stripe-Version': STRIPE_VERSION,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(JSON.stringify({ message: 'stripe request failed', status: response.status }));
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function createCheckoutSession(env, config, userId, fetchImpl) {
  return stripeRequest(env, 'checkout/sessions', {
    method: 'POST',
    fetchImpl,
    body: formBody([
      ['mode', 'subscription'],
      ['payment_method_types[0]', 'card'],
      ['line_items[0][price]', config.price],
      ['line_items[0][quantity]', '1'],
      ['success_url', `${config.appUrl}/?billing_status=success`],
      ['cancel_url', `${config.appUrl}/?billing_status=cancel`],
      ['metadata[userId]', userId],
      ['allow_promotion_codes', 'true'],
    ]),
  });
}

async function createPortalSession(env, config, customerId, fetchImpl) {
  return stripeRequest(env, 'billing_portal/sessions', {
    method: 'POST',
    fetchImpl,
    body: formBody([
      ['customer', customerId],
      ['return_url', `${config.appUrl}/settings`],
    ]),
  });
}

export function stripeSignatureValid(rawBody, header, secret, nowMs = Date.now()) {
  if (!nonempty(secret) || typeof header !== 'string' || typeof rawBody !== 'string') return false;
  let timestamp = '';
  const signatures = [];
  for (const item of header.split(',')) {
    const eq = item.indexOf('=');
    if (eq === -1) continue;
    const key = item.slice(0, eq).trim();
    const value = item.slice(eq + 1).trim();
    if (key === 't') timestamp = value;
    if (key === 'v1' && value) signatures.push(value);
  }
  if (!/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  const age = Math.abs(nowMs / 1000 - Number(timestamp));
  if (age > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return signatures.some((signature) => secretsMatch(signature, expected));
}

function customerIdOf(value) {
  const id = typeof value === 'string' ? value : value?.id;
  return CUSTOMER_RE.test(id || '') ? id : '';
}

async function applySubscription(kv, subscription) {
  const customerId = customerIdOf(subscription?.customer);
  if (!customerId) return;
  const userId = await kv.get(`customer:${customerId}:user`);
  if (typeof userId !== 'string' || !USERNAME_RE.test(userId)) return;
  const next = isProSubscriptionStatus(subscription.status) ? 'pro' : 'free';
  await kv.set(`user:${userId}:status`, next);
}

async function applyEvent(kv, event, env, fetchImpl) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data?.object;
      const userId = session?.metadata?.userId;
      const customerId = customerIdOf(session?.customer);
      if (typeof userId === 'string' && USERNAME_RE.test(userId) && customerId) {
        await kv.set(`user:${userId}:status`, 'pro');
        await kv.set(`user:${userId}:customer`, customerId);
        await kv.set(`customer:${customerId}:user`, userId);
      }
      return;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await applySubscription(kv, event.data?.object);
      return;
    case 'invoice.payment_failed': {
      const subscriptionId = subscriptionIdFromInvoice(event.data?.object);
      if (!SUBSCRIPTION_RE.test(subscriptionId || '')) return;
      const subscription = await stripeRequest(env, `subscriptions/${subscriptionId}`, {
        method: 'GET',
        fetchImpl,
      });
      if (subscription) await applySubscription(kv, subscription);
      return;
    }
    default:
      return;
  }
}

async function authenticatedUser(request, body, deps) {
  const requested = typeof body?.userId === 'string' ? body.userId : '';
  const verify = deps.verify ?? verifyPuterIdentity;
  return verify(request.headers.get('authorization') ?? undefined, requested);
}

export async function handleBillingApi(request, env, deps = {}) {
  const url = new URL(request.url);
  if (url.pathname === '/api/stripe-webhook') return handleWebhook(request, env, deps);
  if (url.pathname !== '/api/create-checkout-session' && url.pathname !== '/api/create-portal-session') {
    return null;
  }

  const kv = await resolveStore(env, deps);
  const config = billingConfig(env, Boolean(kv));

  if (url.pathname === '/api/create-checkout-session' && request.method === 'GET') {
    return json({ checkout: config.checkout, portal: config.portal });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body = {};
  if (url.pathname === '/api/create-checkout-session' || url.pathname === '/api/create-portal-session') {
    body = await readJson(request, 8000);
    if (body?.tooLarge || body?.invalid) {
      const identity = await authenticatedUser(request, {}, deps);
      if (!identity.ok && identity.status === 401) return json({ error: identity.error }, 401);
      return json({ error: 'Invalid JSON.' }, 400);
    }
  }

  const identity = await authenticatedUser(request, body, deps);
  if (!identity.ok) return json({ error: identity.error }, identity.status);

  const enabled = url.pathname === '/api/create-checkout-session' ? config.checkout : config.portal;
  if (!enabled) return json({ error: 'Billing is not configured.' }, 503);

  const fetchImpl = deps.fetchImpl ?? fetch;
  const handler = url.pathname === '/api/create-checkout-session'
    ? createCheckoutHandler({
      verify: async () => identity,
      createSession: (userId) => createCheckoutSession(env, config, userId, fetchImpl),
    })
    : createPortalHandler({
      kv,
      verify: async () => identity,
      createPortalSession: (customerId) => createPortalSession(env, config, customerId, fetchImpl),
    });

  return callHandler(handler, {
    method: 'POST',
    authorization: request.headers.get('authorization') ?? undefined,
    body,
  });
}

async function handleWebhook(request, env, deps) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const config = billingConfig(env, true);
  if (!config.secret || !config.webhookSecret) {
    return json({ error: 'Billing is not configured.' }, 503);
  }

  const raw = await request.text();
  if (raw.length > 1_000_000) return json({ error: 'Invalid Stripe signature.' }, 400);
  if (!stripeSignatureValid(raw, request.headers.get('stripe-signature'), config.webhookSecret, deps.now)) {
    return json({ error: 'Invalid Stripe signature.' }, 400);
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid Stripe signature.' }, 400);
  }
  if (!event || typeof event !== 'object' || !EVENT_RE.test(event.id || '') || typeof event.type !== 'string') {
    return json({ error: 'Invalid Stripe signature.' }, 400);
  }

  const kv = await resolveStore(env, deps);
  if (!kv) return json({ error: 'Billing is not configured.' }, 503);

  const seenKey = `stripe:event:${event.id}`;
  let claimed = false;
  try {
    claimed = await kv.insertNew(seenKey, '1');
    if (!claimed) return json({ received: true, duplicate: true });
    await applyEvent(kv, event, env, deps.fetchImpl ?? fetch);
    return json({ received: true });
  } catch {
    if (claimed) {
      try { await kv.del(seenKey); } catch { /* retry should be able to claim it again */ }
    }
    console.error(JSON.stringify({ message: 'webhook handler failed' }));
    return json({ error: 'Webhook handler failed' }, 500);
  }
}
