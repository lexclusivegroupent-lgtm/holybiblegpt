# Pro billing setup

Holy Bible GPT does not create Stripe products, prices, or live keys. The owner does that in the Stripe Dashboard. Until the steps below are done on the host that actually serves `/api`, the site hides the upgrade and billing-portal buttons.

The canonical site is the Cloudflare Worker. GET `/api/create-checkout-session` returns JSON booleans. Checkout and the portal stay false until the Worker has `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `APP_URL`, and the D1 binding from `docs/cloudflare-api.md`. POST still requires a verified Puter session. The files under `api/` are the previous Vercel copy. They are not what holybiblegpt.com runs. Do not delete that project from here.

## What to create in Stripe

1. A product and a recurring price for Pro. Copy the price id (`price_...`).
2. A webhook endpoint at `https://holybiblegpt.com/api/stripe-webhook`.
3. Subscribe the endpoint to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`.
4. Turn on the Stripe Customer Portal, with subscription cancel and payment-method update.

## Environment variables

Set these on the Worker. Do not commit the values. `APP_URL` is already `https://holybiblegpt.com` in `wrangler.jsonc`.

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_PRICE_ID
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Secret key. Use a test key until you are ready to charge. |
| `STRIPE_PRICE_ID` | The price id from step 1. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `https://holybiblegpt.com/api/stripe-webhook`. |
| `APP_URL` | Public origin with no trailing slash. Success, cancel, and portal return use it. |

The webhook and the portal also need the D1 database from `docs/cloudflare-api.md`. Pro status is stored there, not in Vercel KV.

The screen no longer shows a fixed monthly amount. The amount is whatever price you attached to `STRIPE_PRICE_ID`.

## How access changes

- Checkout completion stores Pro, the Stripe customer id, and the reverse lookup from customer to user.
- `customer.subscription.updated` keeps Pro only while the status is `active` or `trialing`. `past_due`, `unpaid`, `canceled`, `incomplete`, and `incomplete_expired` set the account back to free.
- `customer.subscription.deleted` sets the account back to free.
- `invoice.payment_failed` loads the subscription and applies the same rule.
- Each event id is stored in D1. A repeat delivery does not grant Pro twice.

## What Pro does not lock

The study aid runs in the browser through the reader's own Puter account. A server gate cannot stop someone from calling Puter directly. Pro, once billing is configured, is the checkout and the billing portal for the sync features the API already stores. It is not a lock on the model.
