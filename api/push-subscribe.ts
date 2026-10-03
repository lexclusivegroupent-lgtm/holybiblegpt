import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

// Stores a browser's push subscription so push-send-daily.ts can reach it.
// Keyed by endpoint URL (unique per browser/device) so re-subscribing from
// the same device just overwrites, never duplicates.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const subscription = req.body;
        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return res.status(400).json({ error: 'Invalid push subscription' });
        }

        const key = `push:${Buffer.from(subscription.endpoint).toString('base64url')}`;
        await kv.set(key, subscription);
        await kv.sadd('push:subscriptions', key);

        res.status(200).json({ ok: true });
    } catch (error: any) {
        console.error('Push subscribe error:', error);
        res.status(500).json({ error: error.message });
    }
}
