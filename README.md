# Holy Bible GPT

Holy Bible GPT is a Scripture-first Bible study app. The Bible text is the authority. The study aid is an assistant. It does not replace a pastor, a church, or reading the passage yourself.

The public site is [https://holybiblegpt.com](https://holybiblegpt.com).

## What is in this repo

- A React and Vite reader for the King James Version and the World English Bible. The King James Version is committed in `public/bible/kjv.json` (public domain, 1,189 chapters). The build fails if that file is incomplete or a stored quotation does not match it.
- Sign-in and the study aid use [Puter.js](https://js.puter.com/v2/) in the browser. There is no separate account system.
- Chapter pages, book indexes, and the homepage are prerendered with the King James text, a title, a description, a canonical URL, and breadcrumb markup.
- The Cloudflare Worker serves the site, the ESV proxy, sync, the free-question counter, billing, and daily verse push. Account data uses D1 once it is bound. Billing and push stay off until their secrets are set. See `docs/cloudflare-api.md`. The `api/` folder is the previous Vercel copy and is not what holybiblegpt.com runs.
- The English Standard Version is not offered. Do not label King James text as ESV.

## Local setup

```bash
npm install
npm run dev
```

The dev server is Vite. Open the URL it prints.

## Build and tests

```bash
npm test
npm run build
```

`npm test` checks the King James file and every stored quotation. `npm run build` runs those checks, then Vite, then prerender. Prerender writes `dist/` pages and `public/sitemap.xml`.

## Environment

Do not commit secrets.

Billing variables, and the fact that this repo does not create Stripe products, are listed in `docs/billing.md` on the billing change. Until that file is on this branch, the names are `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `VITE_APP_URL`, and the Vercel KV tokens. The owner creates the Stripe price.

`ESV_API_KEY` is a Cloudflare secret for the Worker proxy. Leave it unset until a Crossway license and the required copyright notice are in place.

Puter does not use a key in this repo.

Workers Logs and traces are on in `wrangler.jsonc`. Sentry stays off until `SENTRY_DSN` (Cloudflare secret) and `VITE_SENTRY_DSN` (build variable) are set. See `.env.example`. Do not put a DSN in `wrangler.jsonc`.

## Hosts

Canonical URLs have no trailing slash and use `https://holybiblegpt.com`. `holy-bible-gpt-new.vercel.app` redirects to that host in `vercel.json`. Other `*.vercel.app` hosts are sent there by `public/canonical-host.js`, which also marks `*.workers.dev` as `noindex`.

The Worker asset setting `html_handling: "drop-trailing-slash"` is a separate change so it can land after the asset-binding fix. Until that setting is deployed, Cloudflare may redirect `/about` to `/about/`.

## Not in this repo

This is not an Android or iOS project. There is no Gemini key.
