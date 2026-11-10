import { handleUserApi } from './userRoutes.mjs';

// Known /api routes return JSON. Anything else, including /api/esv, returns
// null so the Worker can keep its existing behavior. Billing and push are
// added beside this module; an unknown /api path still falls through to assets.

export async function handleApi(request, env, deps = {}) {
  return handleUserApi(request, env, deps);
}
