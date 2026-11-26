import * as Sentry from "@sentry/cloudflare";
import { runScheduledPush } from "./api/push.mjs";
import { handleApi } from "./api/router.mjs";
import { resolveDocumentRequest } from "../services/routes.mjs";
import { notFoundDocument } from "./notFoundPage.mjs";
import { cloudflareSentryOptions, sentryDsnFrom } from "./sentryConfig";

/**
 * Cloudflare Worker — HolyBibleGPT
 *
 * Handles:
 *   GET /api/esv?book=John&chapter=3
 *     → Proxies to api.esv.org, keeping ESV_API_KEY server-side.
 *     → Set ESV_API_KEY as a Cloudflare Secret:
 *         wrangler secret put ESV_API_KEY
 *     → Falls back with 503 when the key is not configured.
 *   /api/sync-pull, /api/sync-push, /api/get-status, /api/check-status,
 *   /api/get-usage, /api/increment-usage
 *     → Puter-verified account routes. Storage is D1 (binding DB).
 *       Until that binding exists, these routes still return JSON.
 *   /api/create-checkout-session, /api/create-portal-session, /api/stripe-webhook
 *     → Plus billing. Disabled until the Stripe secrets below are set.
 *   /api/journal/offer, /api/journal/checkout, /api/journal/session, /api/journal/file
 *     → Optional journal. Closed until STRIPE_JOURNAL_PRICE_ID, a download
 *       secret, and the private journal files are set. See docs/journal.md.
 *   /api/push-subscribe, /api/push-unsubscribe, /api/push-send-daily
 *     → Daily verse push. Disabled until VAPID keys are set.
 *       A cron trigger also calls the daily send. It does not use CRON_SECRET.
 *       The HTTP route does.
 *
 * All other requests fall through to static assets via env.ASSETS.
 * Unknown document URLs return 404 (noindex). A trailing slash on a document
 * URL redirects permanently to the slashless path. Known app and Bible routes
 * still use the prerendered file or the SPA shell.
 */

interface Env {
  ESV_API_KEY?: string;
  // Set with `npx wrangler secret put SENTRY_DSN`. Empty disables Sentry.
  SENTRY_DSN?: string;
  // Present only after wrangler.jsonc binds D1. Missing is safe.
  DB?: D1Like;
  // Public origin. Set in wrangler.jsonc vars, not a secret.
  APP_URL?: string;
  // wrangler secret put STRIPE_SECRET_KEY
  STRIPE_SECRET_KEY?: string;
  // Monthly Plus price. STRIPE_PRICE_ID is the fallback when this is unset.
  // wrangler secret put STRIPE_PRICE_ID_MONTHLY
  STRIPE_PRICE_ID_MONTHLY?: string;
  // wrangler secret put STRIPE_PRICE_ID_YEARLY
  STRIPE_PRICE_ID_YEARLY?: string;
  // wrangler secret put STRIPE_PRICE_ID
  STRIPE_PRICE_ID?: string;
  // wrangler secret put STRIPE_WEBHOOK_SECRET
  STRIPE_WEBHOOK_SECRET?: string;
  // wrangler secret put STRIPE_JOURNAL_PRICE_ID
  // One-time journal price. Missing keeps the buy button hidden.
  STRIPE_JOURNAL_PRICE_ID?: string;
  // Set to "true" in production so journal Checkout uses automatic tax.
  // Unset leaves tax off. See docs/journal.md.
  STRIPE_JOURNAL_TAX_ENABLED?: string;
  // Unset means the offer is enabled. "false" hides checkout.
  JOURNAL_OFFER_ENABLED?: string;
  // wrangler secret put JOURNAL_DOWNLOAD_SECRET
  // At least 32 characters. Signs short-lived download links.
  JOURNAL_DOWNLOAD_SECRET?: string;
  // Private Workers KV namespace holding the paid files. Absent keeps checkout closed.
  JOURNAL_FILES?: {
    list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
    get(key: string, options: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>;
  };
  // Public Payment Link. Set in wrangler.jsonc vars, not a secret.
  GIFT_URL?: string;
  // wrangler secret put VAPID_PUBLIC_KEY
  VAPID_PUBLIC_KEY?: string;
  // wrangler secret put VAPID_PRIVATE_KEY
  VAPID_PRIVATE_KEY?: string;
  // wrangler secret put CRON_SECRET
  CRON_SECRET?: string;
  ASSETS: { fetch(input: Request | string, init?: RequestInit): Promise<Response> };
}

interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      run(): Promise<{ meta?: { changes?: number } }>;
      all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
    };
  };
}

interface EsvVerse {
  number: number;
  text: string;
}

function parseEsvPassageText(raw: string): EsvVerse[] {
  // ESV passage text has inline verse numbers: "[1] In the beginning..."
  const results: EsvVerse[] = [];
  const pattern = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    const num = parseInt(match[1], 10);
    const text = match[2].replace(/\s+/g, ' ').trim();
    if (num && text) results.push({ number: num, text });
  }
  return results;
}

function permanentRedirect(location: string): Response {
  return new Response(null, {
    status: 301,
    headers: {
      Location: location,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

async function notFoundResponse(request: Request, env: Env): Promise<Response> {
  const shellUrl = new URL('/', request.url);
  const shell = await env.ASSETS.fetch(new Request(shellUrl.toString(), { method: 'GET' }));
  const shellHtml = shell.ok ? await shell.text() : '';
  const headers = new Headers(shell.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-store');
  headers.set('x-robots-tag', 'noindex');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'DENY');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  return new Response(notFoundDocument(shellHtml), { status: 404, headers });
}

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=86400',
    'Access-Control-Allow-Origin': '*',
  };
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ── ESV Proxy Endpoint ──────────────────────────────────────────────────
    if (url.pathname === '/api/esv') {
      if (!env.ESV_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'ESV_API_KEY not configured. Add it as a Cloudflare secret.' }),
          { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
        );
      }

      const book = url.searchParams.get('book')?.trim();
      const chapter = url.searchParams.get('chapter')?.trim();

      if (!book || !chapter) {
        return new Response(
          JSON.stringify({ error: 'Missing required params: book, chapter' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const esvUrl = new URL('https://api.esv.org/v3/passage/text/');
      esvUrl.searchParams.set('q', `${book} ${chapter}`);
      esvUrl.searchParams.set('include-passage-references', 'false');
      esvUrl.searchParams.set('include-verse-numbers', 'true');
      esvUrl.searchParams.set('include-headings', 'false');
      esvUrl.searchParams.set('include-footnotes', 'false');
      esvUrl.searchParams.set('include-short-copyright', 'false');
      esvUrl.searchParams.set('include-copyright', 'false');
      esvUrl.searchParams.set('indent-poetry', 'false');
      esvUrl.searchParams.set('indent-paragraphs', 'false');

      try {
        const upstream = await fetch(esvUrl.toString(), {
          headers: { Authorization: `Token ${env.ESV_API_KEY}` },
        });

        if (!upstream.ok) {
          return new Response(
            JSON.stringify({ error: `ESV API responded with ${upstream.status}` }),
            { status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
          );
        }

        const data = (await upstream.json()) as { passages?: string[] };
        const raw = data.passages?.[0] ?? '';
        const verses = parseEsvPassageText(raw);

        return new Response(JSON.stringify({ verses }), { headers: corsHeaders() });
      } catch (err) {
        console.error(JSON.stringify({ message: "esv proxy failed" }));
        if (sentryDsnFrom(env.SENTRY_DSN)) Sentry.captureException(err);
        return new Response(
          JSON.stringify({ error: 'Failed to reach ESV API' }),
          { status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
        );
      }
    }

    if (url.pathname.startsWith('/api/')) {
      try {
        const response = await handleApi(request, env);
        if (response) return response;
      } catch (err) {
        console.error(JSON.stringify({ message: 'api failed', path: url.pathname }));
        if (sentryDsnFrom(env.SENTRY_DSN)) Sentry.captureException(err);
        return new Response(JSON.stringify({ error: 'Request failed.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      }
      // Unknown /api paths stay on the asset fallback, same as before.
      return env.ASSETS.fetch(request);
    }

    const decision = resolveDocumentRequest(url.pathname, url.search);
    if (decision.type === 'redirect') return permanentRedirect(decision.location);
    if (decision.type === 'not-found') return notFoundResponse(request, env);

    // Known app routes, Bible routes, and static files.
    return env.ASSETS.fetch(request);
  },

  // Cloudflare invokes this. It is not the public /api/push-send-daily route.
  // Missing VAPID keys or D1 skip the send. Errors are logged and not rethrown,
  // so a failed run is not retried into a second push.
  async scheduled(_controller: { cron: string }, env: Env): Promise<void> {
    try {
      await runScheduledPush(env);
    } catch (err) {
      console.error(JSON.stringify({ message: "daily push failed" }));
      if (sentryDsnFrom(env.SENTRY_DSN)) Sentry.captureException(err);
    }
  },
};

export default Sentry.withSentry(
  (env: Env) => cloudflareSentryOptions(env.SENTRY_DSN),
  worker,
);
