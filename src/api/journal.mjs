import { json } from './responses.mjs';
import { JOURNAL_SESSION_RE } from '../../services/journalOffer.mjs';
import {
  JOURNAL_OBJECTS,
  appOrigin,
  checkoutFormEntries,
  downloadSecret,
  encodeCheckoutBody,
  fileIdFromQuery,
  filesToOffer,
  journalCheckoutReady,
  journalOfferEnabled,
  journalPriceId,
  looksLikeJournalFile,
  safeCheckoutUrl,
  sessionDownloadState,
  signDownloadToken,
  verifyDownloadToken,
} from '../../services/journalDelivery.mjs';

const STRIPE_VERSION = '2025-12-15.clover';

function stripeHeaders(env, body) {
  return {
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    'Stripe-Version': STRIPE_VERSION,
    ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
  };
}

async function stripeRequest(env, path, { method, body, fetchImpl }) {
  const response = await fetchImpl(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: stripeHeaders(env, body),
    body,
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(JSON.stringify({ message: 'journal stripe request failed', status: response.status }));
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function availableFileIds(env, deps) {
  if (Array.isArray(deps.availableIds)) return deps.availableIds;
  // JOURNAL_FILES is a private Workers KV namespace. R2 is not enabled on
  // this Cloudflare account. One list call finds which files are uploaded.
  const store = env?.JOURNAL_FILES;
  if (!store || typeof store.list !== 'function') return [];
  try {
    const listed = await store.list({ prefix: 'private/' });
    const names = new Set((listed?.keys || []).map((k) => k?.name).filter(Boolean));
    return Object.keys(JOURNAL_OBJECTS).filter((id) => names.has(JOURNAL_OBJECTS[id].key));
  } catch {
    // A failed lookup is not an outage. Checkout stays closed.
    return [];
  }
}

async function readObjectBytes(env, deps, fileId) {
  const spec = JOURNAL_OBJECTS[fileId];
  if (!spec) return null;
  if (typeof deps.readObject === 'function') return deps.readObject(spec.key);
  const store = env?.JOURNAL_FILES;
  if (!store || typeof store.get !== 'function') return null;
  try {
    const value = await store.get(spec.key, { type: 'arrayBuffer' });
    if (!value) return null;
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return null;
  } catch {
    return null;
  }
}

function offerBody(env, ids) {
  const enabled = journalOfferEnabled(env);
  return {
    enabled,
    checkout: enabled && journalCheckoutReady(env, ids),
  };
}

function originAllowed(request, env) {
  return request.headers.get('origin') === appOrigin(env);
}

async function retrieveSession(env, sessionId, fetchImpl) {
  if (!JOURNAL_SESSION_RE.test(sessionId)) return null;
  return stripeRequest(env, `checkout/sessions/${sessionId}?expand[]=line_items`, {
    method: 'GET',
    fetchImpl,
  });
}

function fileResponse(bytes, spec) {
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': spec.type,
      'Content-Disposition': `attachment; filename="${spec.filename}"`,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function handleJournalApi(request, env, deps = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/journal')) return null;

  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = typeof deps.now === 'function' ? deps.now() : Date.now();

  if (url.pathname === '/api/journal/offer' && request.method === 'GET') {
    const ids = await availableFileIds(env, deps);
    return json(offerBody(env, ids));
  }

  if (url.pathname === '/api/journal/checkout' && request.method === 'POST') {
    const ids = await availableFileIds(env, deps);
    if (!originAllowed(request, env) || !journalCheckoutReady(env, ids)) {
      return json({ error: 'Checkout is not open yet.' }, 503);
    }
    const entries = checkoutFormEntries(env);
    const session = await stripeRequest(env, 'checkout/sessions', {
      method: 'POST',
      fetchImpl,
      body: encodeCheckoutBody(entries),
    });
    const checkoutUrl = safeCheckoutUrl(session?.url);
    if (!checkoutUrl) return json({ error: 'Checkout is not open yet.' }, 502);
    return json({ url: checkoutUrl });
  }

  if (url.pathname === '/api/journal/session' && request.method === 'GET') {
    const price = journalPriceId(env);
    const secret = downloadSecret(env);
    const sessionId = url.searchParams.get('session_id') || '';
    if (!nonemptySecret(env) || !price || !secret || !JOURNAL_SESSION_RE.test(sessionId)) {
      return json({ paid: false, state: 'unknown' }, 404);
    }
    const session = await retrieveSession(env, sessionId, fetchImpl);
    const state = sessionDownloadState(session, price);
    if (state !== 'paid') return json({ paid: false, state });
    const ids = filesToOffer(await availableFileIds(env, deps));
    const token = signDownloadToken(sessionId, secret, now);
    if (!token || ids.length === 0) {
      return json({ paid: true, state: 'paid', downloads: [] });
    }
    return json({
      paid: true,
      state: 'paid',
      downloads: ids.map((id) => ({
        file: id,
        label: JOURNAL_OBJECTS[id].label,
        path: `/api/journal/file?file=${id}&token=${encodeURIComponent(token)}`,
      })),
    });
  }

  if (url.pathname === '/api/journal/file' && request.method === 'GET') {
    const price = journalPriceId(env);
    const secret = downloadSecret(env);
    const fileId = fileIdFromQuery(url.searchParams.get('file'));
    const token = verifyDownloadToken(url.searchParams.get('token') || '', secret, now);
    if (!nonemptySecret(env) || !price || !secret || !fileId || !token.ok) {
      return json({ error: 'This download link is not valid.' }, 401);
    }
    const session = await retrieveSession(env, token.sid, fetchImpl);
    if (sessionDownloadState(session, price) !== 'paid') {
      return json({ error: 'This download link is not valid.' }, 403);
    }
    const bytes = await readObjectBytes(env, deps, fileId);
    if (!looksLikeJournalFile(bytes, fileId)) {
      return json({ error: 'The file is not ready yet.' }, 503);
    }
    return fileResponse(bytes, JOURNAL_OBJECTS[fileId]);
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }
  return json({ error: 'Not found.' }, 404);
}

function nonemptySecret(env) {
  return typeof env?.STRIPE_SECRET_KEY === 'string' && env.STRIPE_SECRET_KEY.trim().length > 0;
}
