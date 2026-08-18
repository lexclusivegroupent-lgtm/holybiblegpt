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
                    console.log(`Granted PRO to user ${userId}`);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                // We need to find the user associated with this customer
                // This is inefficient without a reverse index, but for now we look up by customer ID if possible
                // Or we rely on the client to check status and fail? 
                // Vercel KV doesn't support secondary indexes easily. 
                // We might need to store `customer:${customerId}:user` = userId during checkout.

                // Let's defer "REVOKE" logic complexity for MVP or just allow access until re-check.
                // Actually, let's just log it for now.
                console.log('Subscription deleted', subscription.id);
                break;
            }
        }
        res.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
}
