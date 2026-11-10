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

export default createCheckoutHandler({ verify: verifyPuterIdentity, createSession }) as (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<void>;
