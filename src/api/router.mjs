import { handleBillingApi } from './billing.mjs';
import { handlePushApi } from './push.mjs';
import { handleUserApi } from './userRoutes.mjs';

// Known /api routes return JSON. /api/esv stays in the Worker entry.
// An unknown /api path returns null and falls through to static assets.

export async function handleApi(request, env, deps = {}) {
  return await handleUserApi(request, env, deps)
    ?? await handleBillingApi(request, env, deps)
    ?? await handlePushApi(request, env, deps);
}
