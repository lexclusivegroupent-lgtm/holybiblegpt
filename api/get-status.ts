import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { verifyPuterIdentity } from './_lib/puterIdentity.mjs';
import { createGetStatusHandler } from './_lib/userHandlers.mjs';

export default createGetStatusHandler({ kv, verify: verifyPuterIdentity }) as (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<void>;
