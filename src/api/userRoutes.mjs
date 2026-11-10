import { verifyPuterIdentity } from '../../api/_lib/puterIdentity.mjs';
import { usageUnavailableBody } from '../../api/_lib/usageGate.mjs';
import {
  createCheckStatusHandler,
  createGetStatusHandler,
  createGetUsageHandler,
  createIncrementUsageHandler,
  createSyncPullHandler,
  createSyncPushHandler,
} from '../../api/_lib/userHandlers.mjs';
import { openStore } from './d1kv.mjs';
import { callHandler, json, readJson } from './responses.mjs';

// Same paths the Vite app already calls. Auth runs before any read of D1.
// A missing database is not an outage for the usage counter: the client
// treats 404 as "no usage API" and still allows the question. The counter
// is analytics only and never blocks study. Sync and Plus status fail
// closed (503) until storage is ready.

const ROUTES = {
  '/api/sync-pull': { method: 'GET', usage: false, create: createSyncPullHandler },
  '/api/sync-push': { method: 'POST', usage: false, create: createSyncPushHandler },
  '/api/get-status': { method: 'GET', usage: false, create: createGetStatusHandler },
  '/api/check-status': { method: 'GET', usage: false, create: createCheckStatusHandler },
  '/api/get-usage': { method: 'GET', usage: true, create: createGetUsageHandler },
  '/api/increment-usage': { method: 'POST', usage: true, create: createIncrementUsageHandler },
};

const BODY_LIMIT = 600_000;

export async function handleUserApi(request, env, deps = {}) {
  const url = new URL(request.url);
  const route = ROUTES[url.pathname];
  if (!route) return null;

  if (request.method !== route.method) {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body;
  if (route.method === 'POST') {
    body = await readJson(request, BODY_LIMIT);
    if (body?.tooLarge) return json({ error: 'Sync data too large.' }, 413);
    if (body?.invalid) {
      const identity = await (deps.verify ?? verifyPuterIdentity)(
        request.headers.get('authorization') ?? undefined,
        '',
      );
      if (!identity.ok && identity.status === 401) return json({ error: identity.error }, 401);
      return json({ error: 'Invalid JSON.' }, 400);
    }
  }

  const requested = route.method === 'GET'
    ? (url.searchParams.get('userId') ?? '')
    : (typeof body?.userId === 'string' ? body.userId : '');

  const verify = deps.verify ?? verifyPuterIdentity;
  const identity = await verify(request.headers.get('authorization') ?? undefined, requested);
  if (!identity.ok) return json({ error: identity.error }, identity.status);

  const kv = deps.kv !== undefined ? deps.kv : await openStore(env);
  if (!kv) {
    if (route.usage) return json({ error: 'Storage is not configured.' }, 404);
    return json({ error: 'Storage is not configured.' }, 503);
  }

  // Identity was already checked against this request. Do not call Puter again.
  const handler = route.create({
    kv,
    verify: async () => identity,
  });
  try {
    return await callHandler(handler, {
      method: request.method,
      authorization: request.headers.get('authorization') ?? undefined,
      query: Object.fromEntries(url.searchParams),
      body,
    });
  } catch {
    console.error(JSON.stringify({ message: 'user route failed', path: url.pathname }));
    if (url.pathname === '/api/increment-usage') {
      return json({
        allowed: true,
        isPro: false,
        remaining: null,
        unavailable: true,
      }, 200);
    }
    if (route.usage) return json(usageUnavailableBody(), 503);
    return json({ error: 'Request failed.' }, 500);
  }
}
