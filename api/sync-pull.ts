import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { verifyPuterIdentity } from './_lib/puterIdentity.mjs';
import { createSyncPullHandler } from './_lib/userHandlers.mjs';

export default createSyncPullHandler({ kv, verify: verifyPuterIdentity }) as (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<void>;
