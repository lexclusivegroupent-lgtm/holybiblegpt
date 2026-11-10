-- HolyBibleGPT application storage.
-- Non-destructive: creating an existing table or index is a no-op.
-- Apply with: npx wrangler d1 migrations apply holybiblegpt --remote
-- Deploy does not apply this file.

CREATE TABLE IF NOT EXISTS app_kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kv_set_members (
  set_key TEXT NOT NULL,
  member TEXT NOT NULL,
  PRIMARY KEY (set_key, member)
);
