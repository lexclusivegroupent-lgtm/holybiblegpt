import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const userId = req.query.userId as string;
        if (!userId) return res.status(400).json({ error: 'Missing userId' });

        const status = await kv.get<string>(`user:${userId}:status`);
        res.status(200).json({ status: status === 'pro' ? 'pro' : 'free' });
    } catch (error: any) {
        console.error('Status check error:', error);
        res.status(500).json({ error: error.message });
    }
}
