import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId, data } = req.body;
        if (!userId) return res.status(400).json({ error: 'Missing userId' });
        if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Missing data' });

        // Server-side gate — never trust the client's claim of pro status.
        const status = await kv.get<string>(`user:${userId}:status`);
        if (status !== 'pro') {
            return res.status(403).json({ error: 'Pro subscription required for sync.' });
        }

        // Rough size guard — Vercel KV values should stay well under 1MB.
        const size = JSON.stringify(data).length;
        if (size > 500_000) {
            return res.status(413).json({ error: 'Sync data too large.' });
        }

        await kv.set(`user:${userId}:data`, { ...data, syncedAt: Date.now() });
        res.status(200).json({ ok: true, syncedAt: Date.now() });
    } catch (error: any) {
        console.error('Sync push error:', error);
        res.status(500).json({ error: error.message });
    }
}
