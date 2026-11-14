# 30 Days in the Word

Optional $9 printable journal. Reading, search, and AI study stay free. This repo does not create Stripe products, prices, webhooks, or tax registrations.

The product and price already exist:

| Stripe object | Id |
| --- | --- |
| Product | `prod_Vd5RBppwT38pc5` |
| Price | `price_1UbpGHIh46pSg55QCUP263LR` |

The price is $9 USD, one-time, `tax_behavior` exclusive, tax code `txcd_10302000`. Do not create another product or price. Do not change `tax_behavior` from this repo. The price id is not hardcoded. Production sets it with:

```bash
npx wrangler secret put STRIPE_JOURNAL_PRICE_ID
```

Value: `price_1UbpGHIh46pSg55QCUP263LR`

## Checkout

`POST /api/journal/checkout` creates a Checkout Session in `mode=payment` and sends the browser to Stripe. The buy button is rendered only when `GET /api/journal/offer` returns `{ "checkout": true }`.

Checkout stays closed, and the button is not shown, unless all of these are true:

- `JOURNAL_OFFER_ENABLED` is unset or not `false` / `0` / `no` / `off` (the default is on)
- `STRIPE_SECRET_KEY` is set (the same key Plus already uses)
- `STRIPE_JOURNAL_PRICE_ID` is a `price_...` id and is not a Plus price
- `APP_URL` is a public origin (`https://holybiblegpt.com` is already in `wrangler.jsonc`)
- `JOURNAL_DOWNLOAD_SECRET` is at least 32 characters
- The private KV binding `JOURNAL_FILES` is present, and either the zip is uploaded or both PDFs are uploaded

A missing price or a missing file returns `{ "checkout": false }` with HTTP 200. The home announcement and the buy button stay hidden. Nothing on the page is a button that errors.

`JOURNAL_OFFER_ENABLED=false` is the kill switch. Leave it unset in production.

## Tax

Stripe Tax is already active on the account. The head office is in Sweden, and Sweden is registered under the `small_seller` (EU €10,000) scheme. This repo does not change that.

`STRIPE_JOURNAL_TAX_ENABLED` defaults to off when it is unset, so a Worker that has not been told to collect tax will not send `automatic_tax`. Production should set it to `true`. When it is `true`, the Checkout Session sends `automatic_tax[enabled]=true` and `billing_address_collection=required`, so Stripe has the billing address the tax calculation needs. Tax is added on top of the $9 price because that price is tax-exclusive. The session does not send `tax_behavior` or `payment_method_types`.

```bash
npx wrangler secret put STRIPE_JOURNAL_TAX_ENABLED
```

Value: `true`

Do not add another tax registration from here.

## Private files

There is no Supabase bucket on this site, and R2 is not enabled on this Cloudflare account. Account data is Cloudflare D1, which is the wrong place for these files. The journal files live in a private Workers KV namespace, `holybiblegpt-journal` (id `df230d3dda794bdca2cfb95d9e4db992`), bound as `JOURNAL_FILES` in `wrangler.jsonc`. Each file is under 1 MB; a KV value can be up to 25 MiB. KV values are never public: the only way to read them is through `/api/journal/file` after Stripe confirms the payment. Do not commit the PDFs or the zip, and do not put them under `public/`.

The Worker checks which files exist with one `list({ prefix: 'private/' })` call and reads a file with `get(key, { type: 'arrayBuffer' })`.

Upload these keys, not public URLs:

| File | KV key |
| --- | --- |
| Zip of both PDFs | `private/30-days-in-the-word.zip` |
| US Letter PDF | `private/30-days-in-the-word-us-letter.pdf` |
| A4 PDF | `private/30-days-in-the-word-a4.pdf` |

```bash
npx wrangler kv key put --namespace-id df230d3dda794bdca2cfb95d9e4db992 --remote private/30-days-in-the-word.zip --path ./30-Days-in-the-Word-KJV-Journal.zip
npx wrangler kv key put --namespace-id df230d3dda794bdca2cfb95d9e4db992 --remote private/30-days-in-the-word-us-letter.pdf --path ./30-Days-in-the-Word-KJV-Journal-US-Letter.pdf
npx wrangler kv key put --namespace-id df230d3dda794bdca2cfb95d9e4db992 --remote private/30-days-in-the-word-a4.pdf --path ./30-Days-in-the-Word-KJV-Journal-A4.pdf
```

The Worker sets the download content type and filename itself, so no metadata is needed on the KV values.

Checkout opens when the zip is there, or when both PDFs are there. After Stripe reports `payment_status=paid` for this price, the success page offers whichever of those files are present: the zip, the two PDFs, or all three. Each link is signed with `JOURNAL_DOWNLOAD_SECRET`, expires in 15 minutes, and is checked against Stripe again before the bytes are sent.

```bash
npx wrangler secret put JOURNAL_DOWNLOAD_SECRET
```

Use a random string of at least 32 characters. It is not a Stripe key.

No delivery email is sent. This repo has no email provider. A buyer who paid and cannot download can email thechristiansdeck@gmail.com. The refund line on the page uses that same address.

The Plus webhook is unchanged. A journal payment is `mode=payment` and does not grant Plus.

## What production needs

| Name | Kind | Production value |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Existing Worker secret | Already used for Plus. Reuse it. A restricted key needs Checkout Sessions permission. |
| `APP_URL` | Already in `wrangler.jsonc` | `https://holybiblegpt.com` |
| `STRIPE_JOURNAL_PRICE_ID` | New secret | `price_1UbpGHIh46pSg55QCUP263LR` |
| `STRIPE_JOURNAL_TAX_ENABLED` | New secret or var | `true` |
| `JOURNAL_DOWNLOAD_SECRET` | New secret | Random, 32+ characters |
| `JOURNAL_OFFER_ENABLED` | Optional | Leave unset (on). `false` hides the offer. |
| `JOURNAL_FILES` | KV binding (in `wrangler.jsonc`) | Namespace `holybiblegpt-journal`, keys in the table above |

## How a deploy reaches production

holybiblegpt.com is the Cloudflare Worker named `holybiblegpt`. The files under `api/` are the old Vercel copy. They are not what the live site runs, and this change does not add a Vercel function.

This repo has no GitHub Actions workflow that deploys. Merging to `main` does not, by itself, publish the Worker. Production updates when someone runs `npx wrangler deploy` from this repo, or when a Cloudflare Workers build connected in the Cloudflare dashboard builds `main`. That dashboard connection is not stored in this repo, so a merge should be followed by checking the Worker version before treating the journal as live.

`npx wrangler secret put` publishes a new Worker version. Set the journal secrets on the version you intend to serve. The KV binding is already in `wrangler.jsonc`. Until the price, the download secret, and the files are all present, the site keeps working and the buy button stays hidden.
