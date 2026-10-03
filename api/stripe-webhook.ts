import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { kv } from '@vercel/kv';
import micro from 'micro'; // Need to read raw body

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
});

// Disable body parsing for this route to verify signature
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const buf = await micro.buffer(req);
    const sig = req.headers['stripe-signature']!;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.userId;
                const customerId = session.customer as string;

                if (userId) {
                    // Grant Pro Status
                    await kv.set(`user:${userId}:status`, 'pro');
                    // Map customerId to user for portal access
                    await kv.set(`user:${userId}:customer`, customerId);
                    // Reverse index so subscription.deleted (which only has customerId) can find the user
                    await kv.set(`customer:${customerId}:user`, userId);
                    console.log(`Granted PRO to user ${userId}`);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const userId = await kv.get<string>(`customer:${customerId}:user`);

                if (userId) {
                    await kv.set(`user:${userId}:status`, 'free');
                    console.log(`Revoked PRO from user ${userId}`);
                } else {
                    console.warn(`Subscription deleted for unknown customer ${customerId} — no reverse mapping found.`);
                }
                break;
            }
        }
        res.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
}
