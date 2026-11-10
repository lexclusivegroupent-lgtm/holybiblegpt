import * as Sentry from "@sentry/cloudflare";
import { handleApi } from "./api/router.mjs";
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
 *
 * All other requests fall through to the static React SPA via env.ASSETS.
 */

interface Env {
  ESV_API_KEY?: string;
  // Set with `npx wrangler secret put SENTRY_DSN`. Empty disables Sentry.
  SENTRY_DSN?: string;
  // Present only after wrangler.jsonc binds D1. Missing is safe.
  DB?: D1Like;
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
    }

    // ── Static SPA (React build in dist/) ───────────────────────────────────
    return env.ASSETS.fetch(request);
  },
};

export default Sentry.withSentry(
  (env: Env) => cloudflareSentryOptions(env.SENTRY_DSN),
  worker,
);
