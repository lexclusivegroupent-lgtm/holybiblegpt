import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { kv } from '@vercel/kv';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'Missing userId' });

        // Retrieve Customer ID from KV
        const customerId = await kv.get<string>(`user:${userId}:customer`);

        if (!customerId) {
            return res.status(404).json({ error: 'No subscription found for this user.' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.VITE_APP_URL}/settings`,
        });

        res.status(200).json({ url: session.url });
    } catch (error: any) {
        console.error('Portal Error:', error);
        res.status(500).json({ error: error.message });
    }
}
