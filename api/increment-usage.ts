import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { verifyPuterIdentity } from './_lib/puterIdentity.mjs';
import { FREE_LIMIT } from './_lib/usageGate.mjs';
import { createIncrementUsageHandler } from './_lib/userHandlers.mjs';

// Atomic check-and-consume. Pro passes. Free users get FREE_LIMIT questions
// total. KV errors fail closed (allowed: false) so an outage cannot skip the gate.
export default createIncrementUsageHandler({ kv, verify: verifyPuterIdentity, limit: FREE_LIMIT }) as (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<void>;
