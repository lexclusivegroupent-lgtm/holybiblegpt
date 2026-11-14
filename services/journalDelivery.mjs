import { createHmac } from 'node:crypto';
import { secretsMatch } from '../api/_lib/secureCompare.mjs';
import { nonempty, publicOrigin } from './billingAvailability.mjs';
import { JOURNAL_SESSION_RE } from './journalOffer.mjs';

export const JOURNAL_PRODUCT = 'journal';
export const DOWNLOAD_TTL_SECONDS = 15 * 60;

// Private R2 object keys. Not public URLs. Checkout stays closed until
// the zip is present, or both PDFs are present.
export const JOURNAL_OBJECTS = {
  zip: {
    key: 'private/30-days-in-the-word.zip',
    filename: '30-Days-in-the-Word-KJV-Journal.zip',
    type: 'application/zip',
    label: 'Download the journal (US Letter and A4)',
  },
  letter: {
    key: 'private/30-days-in-the-word-us-letter.pdf',
    filename: '30-Days-in-the-Word-KJV-Journal-US-Letter.pdf',
    type: 'application/pdf',
    label: 'Download US Letter',
  },
  a4: {
    key: 'private/30-days-in-the-word-a4.pdf',
    filename: '30-Days-in-the-Word-KJV-Journal-A4.pdf',
    type: 'application/pdf',
    label: 'Download A4',
  },
};

const PRICE_RE = /^price_[A-Za-z0-9]+$/;
const FILE_IDS = ['zip', 'letter', 'a4'];

export function journalOfferEnabled(env) {
  const raw = nonempty(env?.JOURNAL_OFFER_ENABLED).toLowerCase();
  if (!raw) return true;
  return !['0', 'false', 'no', 'off'].includes(raw);
}

export function journalTaxEnabled(env) {
  const raw = nonempty(env?.STRIPE_JOURNAL_TAX_ENABLED).toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

export function journalPriceId(env) {
  const price = nonempty(env?.STRIPE_JOURNAL_PRICE_ID);
  if (!PRICE_RE.test(price)) return '';
  const plusPrices = [
    nonempty(env?.STRIPE_PRICE_ID),
    nonempty(env?.STRIPE_PRICE_ID_MONTHLY),
    nonempty(env?.STRIPE_PRICE_ID_YEARLY),
  ].filter(Boolean);
  if (plusPrices.includes(price)) return '';
  return price;
}

export function downloadSecret(env) {
  const secret = nonempty(env?.JOURNAL_DOWNLOAD_SECRET);
  return secret.length >= 32 ? secret : '';
}

export function appOrigin(env) {
  return publicOrigin(nonempty(env?.APP_URL) || nonempty(env?.VITE_APP_URL));
}

export function deliveryReady(ids) {
  const set = new Set(Array.isArray(ids) ? ids : []);
  return set.has('zip') || (set.has('letter') && set.has('a4'));
}

export function filesToOffer(ids) {
  if (!deliveryReady(ids)) return [];
  const set = new Set(ids);
  return FILE_IDS.filter((id) => set.has(id));
}

export function journalCheckoutReady(env, availableIds) {
  return Boolean(
    journalOfferEnabled(env) &&
    nonempty(env?.STRIPE_SECRET_KEY) &&
    journalPriceId(env) &&
    appOrigin(env) &&
    downloadSecret(env) &&
    deliveryReady(availableIds),
  );
}

export function checkoutFormEntries(env) {
  const price = journalPriceId(env);
  const origin = appOrigin(env);
  if (!price || !origin) return null;
  const entries = [
    ['mode', 'payment'],
    ['line_items[0][price]', price],
    ['line_items[0][quantity]', '1'],
    ['success_url', `${origin}/journal?session_id={CHECKOUT_SESSION_ID}`],
    ['cancel_url', `${origin}/journal`],
    ['metadata[product]', JOURNAL_PRODUCT],
    ['metadata[price]', price],
  ];
  if (journalTaxEnabled(env)) {
    entries.push(['automatic_tax[enabled]', 'true']);
    entries.push(['billing_address_collection', 'required']);
  }
  return entries;
}

export function encodeCheckoutBody(entries) {
  const params = new URLSearchParams();
  for (const [key, value] of entries) params.append(key, String(value));
  return params.toString().replace(
    'session_id%3D%7BCHECKOUT_SESSION_ID%7D',
    'session_id={CHECKOUT_SESSION_ID}',
  );
}

export function safeCheckoutUrl(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function lineItemPriceIds(session) {
  const items = session?.line_items?.data;
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const price = item?.price;
    if (typeof price === 'string') return price;
    return typeof price?.id === 'string' ? price.id : '';
  }).filter(Boolean);
}

export function sessionAllowsJournalDownload(session, priceId) {
  if (!session || typeof session !== 'object') return false;
  if (session.mode !== 'payment') return false;
  if (session.payment_status !== 'paid') return false;
  if (session.metadata?.product !== JOURNAL_PRODUCT) return false;
  if (session.metadata?.price !== priceId) return false;
  const prices = lineItemPriceIds(session);
  return prices.length === 1 && prices[0] === priceId;
}

export function sessionDownloadState(session, priceId) {
  if (!session || typeof session !== 'object') return 'unknown';
  if (session.mode !== 'payment' || session.metadata?.product !== JOURNAL_PRODUCT) return 'rejected';
  if (session.payment_status === 'paid') {
    return sessionAllowsJournalDownload(session, priceId) ? 'paid' : 'rejected';
  }
  if (session.status === 'complete' && session.payment_status === 'unpaid') return 'processing';
  return 'unpaid';
}

export function signDownloadToken(sessionId, secret, nowMs = Date.now()) {
  if (!JOURNAL_SESSION_RE.test(sessionId || '') || !secret) return '';
  const exp = Math.floor(nowMs / 1000) + DOWNLOAD_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ sid: sessionId, exp })).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyDownloadToken(token, secret, nowMs = Date.now()) {
  if (typeof token !== 'string' || token.length > 500 || !secret) return { ok: false };
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return { ok: false };
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  if (!secretsMatch(sig, expected)) return { ok: false };
  let body;
  try {
    body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { ok: false };
  }
  if (!body || typeof body.exp !== 'number' || !JOURNAL_SESSION_RE.test(body.sid || '')) return { ok: false };
  const now = Math.floor(nowMs / 1000);
  if (body.exp < now || body.exp > now + DOWNLOAD_TTL_SECONDS + 60) return { ok: false };
  return { ok: true, sid: body.sid };
}

export function fileIdFromQuery(value) {
  return FILE_IDS.includes(value) ? value : '';
}

export function looksLikeJournalFile(bytes, fileId) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 5) return false;
  if (fileId === 'zip') {
    return bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07);
  }
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}
