import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export const FREE_LIMIT = 5;

// Read-only usage check — does NOT consume a try. Used to show "X free
// questions left" on load/sign-in without burning one of the 5 free uses.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const status = await kv.get<string>(`user:${userId}:status`);
    if (status === 'pro') {
      return res.status(200).json({ isPro: true, count: 0, remaining: null, limit: FREE_LIMIT });
    }

    const count = (await kv.get<number>(`usage:${userId}:count`)) || 0;
    res.status(200).json({
      isPro: false,
      count,
      remaining: Math.max(0, FREE_LIMIT - count),
      limit: FREE_LIMIT,
    });
  } catch (error: any) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: error.message });
  }
}
