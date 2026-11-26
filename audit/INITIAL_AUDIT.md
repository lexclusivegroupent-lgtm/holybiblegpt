# HolyBibleGPT — Initial Audit
Date: 2026-11-27
Scope: repo `lexclusivegroupent-lgtm/holybiblegpt` as of commit `153261e`, plus the live `holybiblegpt.com` responses fetched during this audit. Everything below was actually run or actually fetched — nothing here is assumed.

## 1. Architecture (actual, not what any brief assumes)

- **Frontend**: React 19 + Vite 6, single `App.tsx` (24KB) driving client-side views, built as static assets.
- **Hosting**: Cloudflare Workers + Workers Assets (`wrangler.jsonc`), **not Vercel**. `vercel.json` exists only to 301 the legacy `holy-bible-gpt-new.vercel.app` alias to the real domain.
- **`/api/*.ts` folder is dead code for production** — README and code comments both say it's "the previous Vercel copy," superseded by `src/api/*.mjs` running inside the Worker (`src/worker.ts` → `src/api/router.mjs`). Don't edit `api/` expecting it to affect the live site.
- **Auth**: Puter.js (client-side, no separate account DB). There is **no Supabase** anywhere in this repo.
- **Data**: Cloudflare D1 (binding `DB`), optional — routes degrade to safe JSON responses when the binding is absent.
- **Billing**: Stripe, implemented directly in the Worker (`src/api/billing.mjs`) with a hand-rolled webhook signature verifier (HMAC-SHA256, timing-safe compare, timestamp tolerance, 1MB body cap) — this is solid and already live, not a gap to fill.
- **Push**: Web Push (VAPID), gated on secrets being present.
- **Bible text**: KJV committed verbatim in `public/bible/kjv.json` (1,189 chapters), build-verified against a checksum and against every quoted verse in the codebase (`scripts/verify-kjv.mjs`, `scripts/verify-quotes.mjs`). WEB is the second translation. **ESV and no other translation is offered** — correctly, since no ESV license/key is configured.
- **There is no Android/iOS app in this repo.** No Google Play billing exists to inspect.

## 2. What I actually tested (all green)

- `npm install` — succeeds, 461 packages.
- `npm run build` — succeeds (prebuild KJV/quote verification → Vite build → prerender). Output: 1,272 static pages + sitemap, no errors.
- Full non-e2e test suite (97 tests across observability, API auth, usage gating, auth session, crawl behavior, worker API/push/billing, asset serving, journal delivery, scripture grounding/search, share cards, verse verification, billing availability, privacy copy, hardening) — **97/97 pass.**
- Live site spot checks: `robots.txt`, `sitemap.xml` (1,272 URLs, correctly split 17 site pages / 1,255 Bible pages), and a sampled chapter page `/bible/genesis/1` — correct `<title>`, meta description, canonical, `index,follow`, and the KJV text is in the server-rendered HTML (not JS-only), confirming prerender is actually deployed and working.

I did not find a broken build, a failing test, or a crawlability defect in what I checked. If something specific is broken for you right now (a GSC error, a page you've seen fail to index, a user-reported bug), tell me which one and I'll chase that exact thing — guessing at problems that aren't there wastes your time.

## 3. Findings, prioritized

### P0 — Critical
None found. Build is green, tests are green, auth/billing fail closed, webhook signatures are verified, no secrets are committed (scanned for Stripe/AWS/Google key patterns — only test placeholders like `sk_test_placeholder` found, in test files).

### P1 — Revenue / conversion
- **No content/SEO acquisition pages exist.** There's no `/blog`, `/bible-verses/*`, `/prayer/*`, etc. — all organic traffic has to come from the 1,189 Bible chapter pages themselves (which are good, but narrow long-tail queries like "Bible verses about anxiety" have nothing to rank for). This is the single biggest real SEO gap, and it's a content project, not a bug fix — see §5.
- **Single Plus tier, no annual-vs-monthly upsell visibility checked in UI** (only checked server-side price wiring). Worth a quick UI pass on the pricing surface, not a pricing restructure.
- `dist/assets/esm-*.js` is 472KB raw / 159KB gzipped — the largest chunk in the build. Worth identifying what's in it (likely Stripe.js or a Sentry/analytics bundle) and confirming it's lazy-loaded, not blocking first paint on a Bible chapter page.

### P2 — SEO / performance / UX
- Structured data is already solid (Organization, WebSite+SearchAction, WebApplication in `index.html`'s `@graph`) — no gap here, contrary to what a generic brief would assume.
- `og:image` is a 512×512 PNG reused for every page — fine for now, but page-specific OG images for top content would lift social CTR.
- Alt-text coverage looks reasonable (8 `alt=` attributes for 6 `<img>` tags found in components) but wasn't exhaustively audited per-page.

### P3 — Hygiene / future
- `npm audit` shows 43 vulnerabilities (1 critical, 31 high) — **all transitively from the `vercel` CLI devDependency** (used only for local tooling/legacy deploy, not shipped in the Worker bundle). Real exposure is low, but worth pruning `vercel` from devDependencies if it's unused now that Cloudflare is canonical, to stop the noise.
- The legacy `api/*.ts` Vercel folder is currently dead code kept for reference. Worth a one-line decision: delete it, or keep as documented fallback — either is fine, just pick one so it doesn't get edited by mistake later.

## 4. On the 12-phase "God Mode" brief

Several of its premises don't match this repo: it assumes Supabase (not used — D1 is), Android/Google Play billing (no Android project exists), and a from-scratch pricing/tier redesign (Stripe billing is already live and tested). I'm not executing that plan as written — it bundles a full redesign, a 4-tier pricing change, an email marketing system, and a 30-article content engine into one unscoped mega-task, several of which are business decisions (pricing, what the free/paid line is) that aren't mine to make unilaterally, and some of which would mean rebuilding working, tested infrastructure for no found reason.

## 5. Recommended next step

The real, substantiated opportunity here is §3's P1 content gap. If organic growth is the actual goal, the highest-leverage next move is a small number of genuinely useful `/bible-verses/*` or `/prayer/*` landing pages targeting real search terms — done a few at a time, biblically reviewed, not generated in bulk. That's a scoped, reversible project I can start on if you want it, separate from "fixing" anything (nothing here is broken).
