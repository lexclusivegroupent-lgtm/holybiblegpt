import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

// Removes a push subscription — called when the user turns notifications
// off, or by push-send-daily.ts itself when a push bounces as expired/gone.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { endpoint } = req.body;
        if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

        const key = `push:${Buffer.from(endpoint).toString('base64url')}`;
        await kv.del(key);
        await kv.srem('push:subscriptions', key);

        res.status(200).json({ ok: true });
    } catch (error: any) {
        console.error('Push unsubscribe error:', error);
        res.status(500).json({ error: error.message });
    }
}
