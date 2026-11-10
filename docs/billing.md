# Pro billing setup

Holy Bible GPT does not create Stripe products, prices, or live keys. The owner does that in the Stripe Dashboard. Until the steps below are done on the host that actually serves `/api`, the site hides the upgrade and billing-portal buttons.

The canonical site is the Cloudflare Worker. That Worker does not run these Vercel functions. A GET to `/api/create-checkout-session` there returns the app shell, not JSON, so the buttons stay hidden. POST on that same route still requires a verified Puter session and starts checkout. There is no separate billing-config function, because the Vercel Hobby plan allows only 12 serverless functions. Do not point the public site at a second deployment just to reach an API that is still being locked down. Checkout appears on its own once `/api` is served by the deployment that has these variables.

## What to create in Stripe

1. A product and a recurring price for Pro. Copy the price id (`price_...`).
2. A webhook endpoint on the host that runs the functions: `https://<that-host>/api/stripe-webhook`.
3. Subscribe the endpoint to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`.
4. Turn on the Stripe Customer Portal, with subscription cancel and payment-method update.

## Environment variables

Set these on the deployment that runs `api/`. Do not commit the values.

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Secret key. Use a test key until you are ready to charge. |
| `STRIPE_PRICE_ID` | The price id from step 1. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the endpoint above. |
| `VITE_APP_URL` | Public origin with no trailing slash, `https://holybiblegpt.com`. Success, cancel, and portal return use it. |
| `KV_REST_API_URL` and `KV_REST_API_TOKEN` | Already used to store Pro status. Required for the webhook and the portal. |

The screen no longer shows a fixed monthly amount. The amount is whatever price you attached to `STRIPE_PRICE_ID`.

## How access changes

- Checkout completion stores Pro, the Stripe customer id, and the reverse lookup from customer to user.
- `customer.subscription.updated` keeps Pro only while the status is `active` or `trialing`. `past_due`, `unpaid`, `canceled`, `incomplete`, and `incomplete_expired` set the account back to free.
- `customer.subscription.deleted` sets the account back to free.
- `invoice.payment_failed` loads the subscription and applies the same rule.
- Each event id is stored in KV. A repeat delivery does not grant Pro twice.

## What Pro does not lock

The study aid runs in the browser through the reader's own Puter account. A server gate cannot stop someone from calling Puter directly. Pro, once billing is configured, is the checkout and the billing portal for the sync features the API already stores. It is not a lock on the model.
