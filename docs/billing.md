# Plus billing setup

Holy Bible GPT does not create Stripe products, prices, or live keys. The owner does that in the Stripe Dashboard. Until the steps below are done on the host that actually serves `/api`, the site hides the Plus checkout and billing-portal buttons.

Reading, search, and AI study stay free forever. Plus does not gate them. Plus is one plan for cross-device sync and cloud backup of notes, highlights, bookmarks, prayers, chat history, and reading progress. The prices are $4.99 per month or $39.99 per year. Put both prices on one Plus product (two billing intervals of the same plan, not two tiers).

The canonical site is the Cloudflare Worker. GET `/api/create-checkout-session` returns JSON. `checkout` and `portal` stay false until the Worker has `STRIPE_SECRET_KEY`, a price (`STRIPE_PRICE_ID_MONTHLY` or the monthly fallback `STRIPE_PRICE_ID`, and/or `STRIPE_PRICE_ID_YEARLY`), `APP_URL`, and the D1 binding from `docs/cloudflare-api.md`. POST accepts `interval` of `month` or `year` and still requires a verified Puter session. An omitted interval means `month`. The files under `api/` are the previous Vercel copy. They are not what holybiblegpt.com runs. Do not delete that project from here.

A restricted Stripe key (`rk_...`) is a better fit than a secret key (`sk_...`) if its permissions cover Checkout, Customers, Billing Portal, and Subscriptions. Store whichever key you use in `STRIPE_SECRET_KEY`. If you charge US or EU customers, consider Stripe Tax and an active registration before turning on `automatic_tax`. This repo does not enable `automatic_tax`. See [Collect taxes for recurring payments](https://docs.stripe.com/billing/taxes/collect-taxes.md).

## What to create in Stripe

1. One Plus product. Add a monthly price of $4.99 and a yearly price of $39.99. Copy both price ids (`price_...`).
2. A webhook endpoint at `https://holybiblegpt.com/api/stripe-webhook`.
3. Subscribe the endpoint to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`.
4. Turn on the Stripe Customer Portal, with subscription cancel and payment-method update.
5. Optional: a Payment Link for gifts ($5, $10, and $25 are the suggested amounts). Copy its `https://buy.stripe.com/...` URL. Leave this unset to hide the gift link.

## Environment variables

Set these on the Worker. Do not commit the values. `APP_URL` is already `https://holybiblegpt.com` in `wrangler.jsonc`.

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_PRICE_ID_MONTHLY
npx wrangler secret put STRIPE_PRICE_ID_YEARLY
npx wrangler secret put STRIPE_PRICE_ID
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put GIFT_URL
```

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Secret or restricted key. Use a test key until you are ready to charge. |
| `STRIPE_PRICE_ID_MONTHLY` | Plus monthly price id ($4.99). |
| `STRIPE_PRICE_ID_YEARLY` | Plus yearly price id ($39.99). |
| `STRIPE_PRICE_ID` | Backward-compatible monthly price id, used only when `STRIPE_PRICE_ID_MONTHLY` is unset. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `https://holybiblegpt.com/api/stripe-webhook`. |
| `APP_URL` | Public origin with no trailing slash. Success, cancel, and portal return use it. |
| `GIFT_URL` | Optional. Public Stripe Payment Link on `buy.stripe.com`. Empty hides the gift link. It does not enable checkout. |

The webhook and the portal also need the D1 database from `docs/cloudflare-api.md`. Plus status is stored there as `pro` so existing rows keep working. The screen says Plus. `plus` is also accepted on read. No migration is required.

Checkout stays `{ "checkout": false }` until a secret key, `APP_URL`, D1, and at least one price are set. The GET body includes `intervals.month` and `intervals.year`. `giftUrl` is included only when `GIFT_URL` is a `https://buy.stripe.com/` link.

## How access changes

- A completed subscription Checkout, monthly or yearly, stores Plus (`pro`), the Stripe customer id, and the reverse lookup from customer to user. A one-time gift (`mode: payment`) does not.
- `customer.subscription.updated` keeps Plus only while the status is `active` or `trialing`, for either price. `past_due`, `unpaid`, `canceled`, `incomplete`, and `incomplete_expired` set the account back to free.
- `customer.subscription.deleted` sets the account back to free.
- `invoice.payment_failed` loads the subscription and applies the same rule.
- Each event id is stored in D1. A repeat delivery does not grant Plus twice.
- The billing portal is unchanged. It needs the secret key, `APP_URL`, and D1. It does not need a price id.

## What Plus does not lock

The study aid runs in the browser through the reader's own Puter account. There is no question cap. Plus, once billing is configured, is checkout and the billing portal for sync and backup. It is not a lock on Scripture, search, or the model.

The optional gift copy on the Support page says giving unlocks nothing and is not tax-deductible. HolyBibleGPT is not a registered charity.
