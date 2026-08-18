import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover', // Update to latest or use default
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId } = req.body; // In a real app, verify this session

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.VITE_APP_URL}/?billing_status=success`,
            cancel_url: `${process.env.VITE_APP_URL}/?billing_status=cancel`,
            metadata: {
                userId: userId,
            },
            allow_promotion_codes: true,
        });

        res.status(200).json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe Error:', error);
        res.status(500).json({ error: error.message });
    }
}
