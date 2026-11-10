# Bible Study Buddy

**Legacy project name:** Holy Bible GPT.

Bible Study Buddy is a modernized Christian Bible study assistant that combines chat-based study, verse reflection workflows, devotionals, prayer notes, and saved verses in one clean app.

## Features
- Bible Chat with suggested prompts and response states.
- Verse Study workflow (explanation, context, application, prayer, related verses).
- Devotional section (topic, verse, reflection, prayer, action step).
- Prayer Notes (add/edit/delete with local persistence).
- Saved Verses (save/remove with local persistence).
- Core theological guardrails in `src/lib/bibleAssistantGuidelines.ts`.

## Tech Stack
- React + TypeScript
- Vite
- Local storage persistence for notes/verses

## Local Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```
3. Add your keys (if using external AI or billing endpoints).
4. Start development server:
   ```bash
   npm run dev
   ```

## Build
```bash
npm run build
```

## Environment Variables
- `GEMINI_API_KEY`: AI provider key (never hard-code keys).
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: optional billing support.
- See `.env.example` for the full list, including `CRON_SECRET` and Sentry.

## Observability and Sentry

Workers Logs and traces are turned on in `wrangler.jsonc` (`observability.enabled`, plus logs and traces). They start on the next `wrangler deploy`. Nothing in this repo sends a Sentry DSN. Sentry stays off until these are set.

Create two Sentry projects (https://sentry.io):

1. Platform **Cloudflare Workers**, for the `holybiblegpt` Worker.
2. Platform **React**, for the Vite app.

Then:

| Variable | Where | When it is read |
|---|---|---|
| `SENTRY_DSN` | Cloudflare secret: `npx wrangler secret put SENTRY_DSN` | Worker runtime. `wrangler secret put` deploys a new version. Do not put the DSN in `wrangler.jsonc`. |
| `VITE_SENTRY_DSN` | Cloudflare Workers build variables, and the Vercel project if that copy should report too | `npm run build`. Vite inlines it into the browser bundle. Change it and rebuild. It is public in the shipped JavaScript. |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | The build environment, only if you want readable server/browser stack traces | Source map upload. Not required for errors to be captured. |

Local Worker development can use `.dev.vars` (gitignored) with `SENTRY_DSN=`. Do not commit that file.

The SDKs are `@sentry/cloudflare` (wrapped with `Sentry.withSentry` in `src/worker.ts`) and `@sentry/react`. The browser SDK is a separate chunk and is downloaded only when `VITE_SENTRY_DSN` is non-empty at build time. Headers, cookies, user ids, request bodies, and query strings are not attached, so the ESV API key and the Puter session token are not copied into events. Sentry traces are sampled at 5%. Workers traces in `wrangler.jsonc` are sampled at 1%. Worker logs are not sampled down.

To confirm after deploy: set the DSNs, deploy, load the site, and trigger a test error in a non-production way only if you are comfortable sending it. This repo does not include a public debug route.

## Google Play Store Notes
This repository is currently a **web Vite app**, not an Expo/React Native project. No Android manifest, Gradle, or Play-specific package files were found in this repo. For Play Store deployment, create a mobile client (Expo recommended) that consumes the same backend/API contracts and reuses this app’s brand/design/theology guardrails.

## Branding
- Public brand: **Bible Study Buddy**
- Historical/internal legacy reference: **Holy Bible GPT**
