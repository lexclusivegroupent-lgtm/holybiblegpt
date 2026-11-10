import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { kv } from '@vercel/kv';
import micro from 'micro';
import { isProSubscriptionStatus, subscriptionIdFromInvoice } from '../services/billingAvailability.mjs';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function applySubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;
  if (!customerId) return;
  const userId = await kv.get<string>(`customer:${customerId}:user`);
  if (!userId) {
    console.warn('Subscription update for an unknown customer.');
    return;
  }
  const next = isProSubscriptionStatus(subscription.status) ? 'pro' : 'free';
  await kv.set(`user:${userId}:status`, next);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Billing is not configured.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  });

  const buf = await micro.buffer(req);
  const sig = req.headers['stripe-signature'];
  if (!sig || Array.isArray(sig)) {
    return res.status(400).json({ error: 'Missing Stripe signature.' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid Stripe signature.' });
  }

  const seenKey = `stripe:event:${event.id}`;
  try {
    const seen = await kv.get(seenKey);
    if (seen) return res.json({ received: true, duplicate: true });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        if (userId && customerId) {
          await kv.set(`user:${userId}:status`, 'pro');
          await kv.set(`user:${userId}:customer`, customerId);
          await kv.set(`customer:${customerId}:user`, userId);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = subscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await applySubscription(subscription);
        }
        break;
      }
      default:
        break;
    }

    await kv.set(seenKey, '1');
    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed');
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}
