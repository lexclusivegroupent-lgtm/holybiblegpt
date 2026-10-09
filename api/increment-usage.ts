import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { FREE_LIMIT } from './get-usage';

// Atomic check-and-consume — called right before each free-tier AI question
// is sent. Pro users always pass through uncapped. Free users get FREE_LIMIT
// total questions (lifetime, not daily) before every future call is blocked
// until they upgrade. Uses kv.incr so concurrent requests from multiple
// tabs/devices can't race past the limit.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const status = await kv.get<string>(`user:${userId}:status`);
    if (status === 'pro') {
      return res.status(200).json({ allowed: true, isPro: true, remaining: null });
    }

    const count = await kv.incr(`usage:${userId}:count`);

    if (count > FREE_LIMIT) {
      return res.status(200).json({ allowed: false, isPro: false, remaining: 0, count: FREE_LIMIT, limit: FREE_LIMIT });
    }

    res.status(200).json({
      allowed: true,
      isPro: false,
      remaining: FREE_LIMIT - count,
      count,
      limit: FREE_LIMIT,
    });
  } catch (error: any) {
    console.error('Increment usage error:', error);
    // Fail open — if KV hiccups, don't block someone from using the free tool
    // over an infra error. Worst case a user gets a couple of extra tries.
    res.status(200).json({ allowed: true, isPro: false, remaining: null, degraded: true });
  }
}
