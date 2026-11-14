// Client-safe journal offer settings. The Worker decides whether checkout
// is actually open. This file has no secrets and no price id.

export const JOURNAL_PATH = '/journal';

export const JOURNAL_DISMISS_KEY = 'hbgpt_journal_promo_dismissed';

/** Same address as the contact page. Refunds are email, not an in-app form. */
export const JOURNAL_CONTACT_EMAIL = 'thechristiansdeck@gmail.com';

export const JOURNAL_SESSION_RE = /^cs_(?:test|live)_[A-Za-z0-9]+$/;

/**
 * Public preview images. The paid PDFs and zip are not in this site tree.
 * Paths stay here so a missing file can be omitted instead of showing a broken image.
 */
export const JOURNAL_IMAGES = {
  cover: '/journal/cover.webp',
  square: '/journal/square.webp',
  day: '/journal/day-1.webp',
  plan: '/journal/reading-plan.webp',
};

export function journalPromoVisible(checkout, dismissed) {
  return checkout === true && dismissed !== true;
}

export function safeStripeCheckoutUrl(value) {
  if (typeof value !== 'string' || value.length > 2000) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function safeDownloadPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/api/journal/file?') || value.length > 800) return '';
  try {
    const url = new URL(value, 'https://holybiblegpt.com');
    if (url.pathname !== '/api/journal/file') return '';
    const file = url.searchParams.get('file');
    const token = url.searchParams.get('token') || '';
    if (file !== 'zip' && file !== 'letter' && file !== 'a4') return '';
    if (!token || token.length > 500 || /[\s<>]/.test(token)) return '';
    return `/api/journal/file?file=${file}&token=${encodeURIComponent(token)}`;
  } catch {
    return '';
  }
}
