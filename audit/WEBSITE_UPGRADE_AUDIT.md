# HolyBibleGPT Website — Upgrade Audit
Date: 2026-11-27. Scope: `holybiblegpt.com` website only, repo `lexclusivegroupent-lgtm/holybiblegpt` at commit `090da39`.

## 0. Test baseline (re-verified, as requested)

| Suite | Result |
|---|---|
| `tests/observability.test.mjs` | 3/3 pass |
| `tests/api-auth.test.mjs` + `tests/usage-gate.test.mjs` | 6/6 pass |
| `services/authSession.test.mjs` | included above, 14/14 pass combined |
| `tests/crawl`, `worker-api`, `worker-push-billing`, `worker-assets`, `journal-delivery`, `scriptureGrounding`, `scriptureSearch`, `shareCard`, `verify-verses`, `billingAvailability`, `privacy-copy`, `hardening` | 68/68 pass |
| `scripts/verify-kjv.mjs` | pass — 1,189 chapters, checksum `48f110d42c8a` |
| `scripts/verify-quotes.mjs` | pass — 35 quotations match stored KJV |
| `npm run build` | pass — 1,272 pages + sitemap prerendered |
| `playwright test` (e2e) | **could not run** — this sandbox's network allowlist blocks `cdn.playwright.dev`, so the Chromium binary can't download. Not a code issue; run this one in CI or locally before trusting e2e coverage. |

**Correction to my own prior audit**: I previously wrote "97 tests passed." Actual count is 82 non-e2e unit/integration tests (14 + 68 above), all passing, plus 2 verification scripts. 97 was wrong; recording the real number here as the baseline going forward.

## 1. Website vs. "mobile application" — there is no separate mobile application

I searched the full repo for React Native, Expo, Capacitor, Cordova, or any Android/iOS native project (`grep -rli` across all `.ts/.tsx/.json`). The only hits are: PWA manifest/service-worker (`public/manifest.json`, `public/sw.js`), Apple PWA meta tags (`apple-mobile-web-app-*`), and Android adaptive-icon PNGs (`android-chrome-*.png`) — all of which are standard "installable web app" assets, not a native app codebase.

**There are not two products here.** There is one responsive website/PWA. `App.tsx` and every component in `components/` serve both desktop browsers and phone browsers from the same build. This repo's own README confirms it ("This is not an Android or iOS project").

This means the brief's Section 1 scope wall ("never redesign mobile screens," "website vs. app component boundaries") doesn't apply — there's no boundary to find because there's no second app. If there's a separate native app elsewhere (a different repo, a store listing), it isn't this codebase and I have no visibility into it. Worth confirming which is true before anyone plans around a mobile/web split that may not exist.

## 2. Current architecture (unchanged from prior audit, re-confirmed)

Cloudflare Worker + static assets, D1 (optional binding), Stripe billing live and signature-verified in `src/api/billing.mjs`, Puter.js auth, KJV/WEB text, prerendered chapter pages. `api/*.ts` (Vercel-era) is dead code. None of this needs migrating — confirmed again this pass, nothing contradicts the brief's instruction to preserve it.

## 3. The actual "homepage" is an app home screen, not a marketing page

`components/HomeView.tsx` (235 lines) is what every visitor — first-time or returning — lands on. It's built as a compact dashboard: verse of the day, reading streak, "resume reading," a share card. There is no hero section, no headline/subheadline, no "Ask Your First Bible Question" CTA, no explainer of what the product is, no pricing visibility, no FAQ — because the whole app runs inside one persistent chrome (`Header.tsx` + `SideDrawer.tsx` navigation), not a page-by-page marketing site.

This is the real, concrete version of what the brief calls "rebuild the conversion experience": **a brand-new first-time-visitor anonymous user and a Day-30 returning user currently see the identical screen.** A visitor who doesn't already know what HolyBibleGPT is has nothing on that screen explaining it before they're expected to start reading or asking questions.

This is a genuine P1, not a cosmetic one — but building it is a real design/code project (a new landing experience, likely as a distinct first-visit state gated on `AuthProvider`/`useLocalStorage` "have you been here before"), not a quick copy edit. I'm flagging it, not building it yet — see §7.

## 4. Design system

There is a design system, and it's more deliberate than the brief assumed: CSS custom properties for a gold/obsidian palette (`--gold-primary`, `--gold-deep`, `--obsidian`), three purposeful type families (Inter for UI, Crimson Pro for Scripture body text, Cinzel for accent/headers), a `.glass-dark` frosted-glass treatment, 44×44px minimum touch targets on controls (`Header.tsx`'s `controlClass`), and consistent `aria-label`/focus-management patterns (55 `aria-*` and 17 `role=` attributes found across `components/`, plus real keyboard-escape and focus-return handling in `Header.tsx`).

It is **not** generic AI-startup styling — gradients are restrained to a single gold-text effect, there's a subtle noise texture instead of flat color, and copy is notably honest rather than salesy ("Reading, search, and AI study are free forever. There is no question limit." in `PlusPlan.tsx`). The brief's "avoid cheap AI aesthetics" instruction is already largely satisfied; this isn't a from-scratch visual redesign situation.

## 5. Performance — one real, verifiable problem

**Tailwind is loaded from `https://cdn.tailwindcss.com` in `index.html` (line 98) and compiled client-side on every page load.** This is the Tailwind Play CDN build, which Tailwind's own docs say explicitly is not intended for production: it ships the full compiler to the browser, generates styles at runtime instead of a build-time purged stylesheet, and logs a console warning on every page load telling visitors (and any developer inspecting the site) that it shouldn't be in production. This is a real, measurable Core Web Vitals and trust problem — concretely:
- Adds a render-blocking third-party script and a runtime JIT compile step to every single page load, including the 1,189 prerendered Bible chapter pages that otherwise ship correct static HTML.
- Produces an unpurged runtime stylesheet instead of a small build-time one.
- The visible console warning undercuts "trustworthy, premium" for anyone who opens devtools — including reviewers, security-conscious users, and any SEO/performance auditor.

Fix is bounded and safe: install `tailwindcss` as a dev dependency, add it to the existing Vite build, remove the CDN `<script>` tag. This doesn't touch Stripe, D1, auth, or routing — it's a pure build-tooling change, squarely inside what the brief authorizes. I'd want to actually do this one rather than just flag it, given how clear-cut and low-risk it is — see §7.

Bundle sizes otherwise are reasonable for a feature-rich SPA (largest chunk 472KB/159KB gzip, lazy-split by route); worth re-measuring Core Web Vitals after the Tailwind fix rather than before, since that fix changes the numbers.

## 6. Security (re-checked with this pass's focus: XSS/input validation on the chat surface)

No regressions found. Webhook signature verification, fail-closed auth, and secret handling are unchanged and still correct (see prior audit, §2–3). Did not find any `dangerouslySetInnerHTML` or raw HTML injection from AI or user input in a scan of `components/ChatInterface.tsx` and `components/MessageBubble.tsx` — chat content renders as text, not interpreted HTML. No new findings here this pass.

## 7. Prioritized plan

**P0:** None.

**P1:**
1. Remove the Tailwind CDN script and switch to a built stylesheet — small, safe, high-confidence fix. **I'm ready to do this now if you want it**; it's the one item in this audit that's unambiguous enough not to need a design call from you first.
2. Design and build a real first-visit marketing/landing experience distinct from the returning-user app home screen (§3). This needs your input before I build it — see questions below — because it involves actual copy/positioning choices, not just code.

**P2:** Content/SEO landing pages (`/bible-verses/anxiety` etc.) — unchanged from prior audit, still the main organic-growth lever, still a content project not a code fix.

**P3:** Page-specific OG images instead of one reused 512×512 PNG; decide fate of dead `api/*.ts` folder.

## 8. What I'm not doing without your sign-off

Per the brief's own change control, I have not touched the homepage, navigation copy, or pricing presentation. Before I build the landing-page experience in §3, I need your call on: the actual value proposition/headline (the brief suggests one — do you want that exact copy, or your own?), whether anonymous visitors should be able to try the AI chat before any sign-in prompt (confirmed in the code that they currently can — `PlusPlan.tsx` and `Header.tsx` both treat sign-in as optional/free), and whether you want this built as a new route or as a first-visit state on the existing home screen.
