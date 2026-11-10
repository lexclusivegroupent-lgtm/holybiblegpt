// D1 standing in for the Vercel KV calls the handlers already make.
// Values are JSON text so strings, numbers, and objects round-trip.
// A missing binding, or a database that does not have these tables yet,
// is "not configured". Callers keep the site up instead of throwing.

function decode(value) {
  if (typeof value !== 'string') return value ?? null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function missingTable(error) {
  return /no such table/i.test(String(error?.message || error));
}

export async function storageReady(db) {
  if (!db || typeof db.prepare !== 'function') return false;
  try {
    await db.prepare('SELECT key FROM app_kv WHERE key = ?').bind('__schema_probe__').first();
    return true;
  } catch (error) {
    if (missingTable(error)) return false;
    throw error;
  }
}

export function createD1Kv(db) {
  return {
    async get(key) {
      const row = await db.prepare('SELECT value FROM app_kv WHERE key = ?').bind(key).first();
      if (!row) return null;
      return decode(row.value);
    },

    async set(key, value) {
      const encoded = JSON.stringify(value);
      await db.prepare(
        'INSERT INTO app_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ).bind(key, encoded).run();
    },

    async del(key) {
      await db.prepare('DELETE FROM app_kv WHERE key = ?').bind(key).run();
    },

    // Atomic counter. SQLite applies the conflict update in one statement.
    async incr(key) {
      const row = await db.prepare(`
        INSERT INTO app_kv (key, value) VALUES (?, '1')
        ON CONFLICT(key) DO UPDATE SET
          value = CAST(CAST(app_kv.value AS INTEGER) + 1 AS TEXT)
        RETURNING value
      `).bind(key).first();
      const count = decode(row?.value);
      if (typeof count !== 'number' || !Number.isFinite(count)) {
        throw new Error('Usage counter did not return a number.');
      }
      return count;
    },

    // Insert only if absent. True means this caller claimed the key.
    async insertNew(key, value) {
      const result = await db.prepare(
        'INSERT INTO app_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING',
      ).bind(key, JSON.stringify(value)).run();
      return (result?.meta?.changes ?? 0) > 0;
    },

    async sadd(setKey, member) {
      await db.prepare(
        'INSERT INTO kv_set_members (set_key, member) VALUES (?, ?) ON CONFLICT(set_key, member) DO NOTHING',
      ).bind(setKey, member).run();
    },

    async srem(setKey, member) {
      await db.prepare(
        'DELETE FROM kv_set_members WHERE set_key = ? AND member = ?',
      ).bind(setKey, member).run();
    },

    async smembers(setKey) {
      const result = await db.prepare(
        'SELECT member FROM kv_set_members WHERE set_key = ?',
      ).bind(setKey).all();
      return (result?.results ?? []).map((row) => row.member);
    },
  };
}

export async function openStore(env) {
  if (!env?.DB) return null;
  try {
    const ready = await storageReady(env.DB);
    if (!ready) return null;
    return createD1Kv(env.DB);
  } catch (error) {
    console.error(JSON.stringify({ message: 'd1 probe failed' }));
    return null;
  }
}
