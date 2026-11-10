import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { verifyPuterIdentity } from './_lib/puterIdentity.mjs';
import { createCheckoutHandler } from './_lib/userHandlers.mjs';
import { describeBilling, priceForInterval, publicBillingStatus } from '../services/billingAvailability.mjs';

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-12-15.clover' });
}

async function createSession(userId: string, interval?: string) {
  const selected = priceForInterval(process.env, interval);
  if (!selected.ok) {
    const error = new Error(selected.error) as Error & { statusCode?: number };
    error.statusCode = selected.reason === 'invalid' ? 400 : 503;
    throw error;
  }
  const stripe = stripeClient();
  const origin = process.env.VITE_APP_URL || process.env.APP_URL;
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: selected.price,
        quantity: 1,
      },
    ],
    success_url: `${origin}/?billing_status=success`,
    cancel_url: `${origin}/?billing_status=cancel`,
    metadata: { userId, interval: selected.interval },
    allow_promotion_codes: true,
    automatic_tax: { enabled: true },
    billing_address_collection: 'required',
  });
}

const checkout = createCheckoutHandler({ verify: verifyPuterIdentity, createSession });

// GET reports whether checkout can run. It is not a new function: Vercel Hobby
// allows 12 serverless functions, and this deployment is already at that limit.
// POST still requires a verified Puter session. This file is the previous
// Vercel copy. holybiblegpt.com runs the Worker.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(publicBillingStatus(describeBilling(process.env, true)));
  }
  return checkout(req, res);
}
