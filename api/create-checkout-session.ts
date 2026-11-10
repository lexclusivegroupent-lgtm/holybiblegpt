import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { verifyPuterIdentity } from './_lib/puterIdentity.mjs';
import { createCheckoutHandler } from './_lib/userHandlers.mjs';

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-12-15.clover' });
}

async function createSession(userId: string) {
  const stripe = stripeClient();
  return stripe.checkout.sessions.create({
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
    metadata: { userId },
    allow_promotion_codes: true,
  });
}

const checkout = createCheckoutHandler({ verify: verifyPuterIdentity, createSession });

// GET reports whether checkout can run. It is not a new function: Vercel Hobby
// allows 12 serverless functions, and this deployment is already at that limit.
// The response is only booleans. POST still requires a verified Puter session.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const secretConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
    const priceConfigured = Boolean(process.env.STRIPE_PRICE_ID);
    const appUrlConfigured = Boolean(process.env.VITE_APP_URL);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      checkout: secretConfigured && priceConfigured && appUrlConfigured,
      portal: secretConfigured && appUrlConfigured,
    });
  }
  return checkout(req, res);
}
