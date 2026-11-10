import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { verifyPuterIdentity } from './_lib/puterIdentity.mjs';
import { createIncrementUsageHandler } from './_lib/userHandlers.mjs';

// Counts a question for analytics. Study is not capped.
export default createIncrementUsageHandler({ kv, verify: verifyPuterIdentity }) as (
  req: VercelRequest,
  res: VercelResponse
) => Promise<void>;
