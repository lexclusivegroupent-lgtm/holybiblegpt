# Account API on the Cloudflare Worker

holybiblegpt.com is the Worker `holybiblegpt`. Sync and the free-question counter run in that Worker at the same paths the app already calls.

| Path | Method | Auth |
| --- | --- | --- |
| `/api/sync-pull` | GET | Puter bearer token. `userId` must be that account. Pro only. |
| `/api/sync-push` | POST | Same. Body `{ userId, data }`. Pro only. |
| `/api/get-status` | GET | Same. `{ status: "pro" \| "free" }`. |
| `/api/check-status` | GET | Same. `{ isPro: boolean }`. |
| `/api/get-usage` | GET | Same. |
| `/api/increment-usage` | POST | Same. Five free questions, then `allowed: false`. |
| `/api/create-checkout-session` | GET | No auth. `{ checkout, portal }`. Both false until Stripe and D1 are ready. |
| `/api/create-checkout-session` | POST | Puter bearer token. Starts Stripe Checkout. |
| `/api/create-portal-session` | POST | Puter bearer token. Opens the billing portal. |
| `/api/stripe-webhook` | POST | Stripe signature. No Puter token. |
| `/api/push-subscribe` | POST | Browser push subscription. No Puter token. |
| `/api/push-unsubscribe` | POST | `{ endpoint }`. |
| `/api/push-send-daily` | GET or POST | `Authorization: Bearer $CRON_SECRET`. |

A missing or wrong token is `401` JSON. A token for a different username is `403` JSON. The Worker does not follow redirects from Puter's whoami call.

## D1

Storage is a D1 database. It is not bound in `wrangler.jsonc` yet. A placeholder `database_id` would make `wrangler deploy` fail, so the binding stays in a comment until the database exists. With no binding, `/api/get-status` still returns JSON (`401` without a token). Usage returns `404` so the study aid keeps working. Sync returns `503`.

Create the database (do not invent an id in this repo):

```bash
npx wrangler d1 create holybiblegpt
```

Then put this in `wrangler.jsonc`, with the printed `database_id`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "holybiblegpt",
    "database_id": "<database_id>",
    "migrations_dir": "migrations"
  }
]
```

Deploy does not apply migrations. After the binding is deployed:

```bash
npx wrangler d1 migrations apply holybiblegpt --remote
```

`migrations/0001_app_storage.sql` only creates tables if they are missing. It does not drop or delete anything.

The old Vercel functions under `api/` are unused by this host. Leave them in place. Do not delete the Vercel project or its KV data from here.

## Billing secrets

`APP_URL` is a var in `wrangler.jsonc` (`https://holybiblegpt.com`), not a secret. Checkout stays off until the three secrets below exist and D1 is ready. Do not commit the values.

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_PRICE_ID
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Point the Stripe webhook at `https://holybiblegpt.com/api/stripe-webhook`. Subscribe it to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`. Details are in `docs/billing.md`.

## Push secrets

Daily verse push stays off until both keys are set and they are the pair whose public half is already in `components/NotificationOptIn.tsx`. Do not generate a new pair unless that file is updated to match.

```bash
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put CRON_SECRET
```

`VAPID_PUBLIC_KEY` must be:

```text
BExXQ5p2sahc35RIVvLBCI0j79gHbg1anEPfZLGHMBwygoPW_c0OPTLcy07gkl7u8x09cLkTATBOkOQS-TLxbEY
```

`CRON_SECRET` guards `GET` or `POST /api/push-send-daily` only. Generate a long random value. The Worker cron (`0 13 * * *`, 13:00 UTC) calls the scheduled handler directly and does not send that header. If VAPID keys or D1 are missing, the scheduled run logs and returns. It does not throw, so Cloudflare does not retry it into a second send.

A Workers Free plan allows 50 external subrequests and very little CPU per cron run. A large subscriber list needs a Workers Paid plan. The send stops counting a subscription as live when the push service responds `404` or `410`.

`wrangler secret put` publishes a new Worker version. Set secrets after the D1 binding is in the config you intend to deploy, or set them again after that deploy so the version that is live has both.
