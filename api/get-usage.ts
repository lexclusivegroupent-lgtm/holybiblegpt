import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { verifyPuterIdentity } from './_lib/puterIdentity.mjs';
import { FREE_LIMIT } from './_lib/usageGate.mjs';
import { createGetUsageHandler } from './_lib/userHandlers.mjs';

export { FREE_LIMIT };

export default createGetUsageHandler({ kv, verify: verifyPuterIdentity, limit: FREE_LIMIT }) as (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<void>;
