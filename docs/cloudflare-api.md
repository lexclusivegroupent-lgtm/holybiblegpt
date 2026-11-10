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
