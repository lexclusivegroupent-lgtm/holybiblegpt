import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { kv } from '@vercel/kv';
import { verifyPuterIdentity } from './_lib/puterIdentity.mjs';
import { createPortalHandler } from './_lib/userHandlers.mjs';

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-12-15.clover' });
}

async function createPortalSession(customerId: string) {
  const stripe = stripeClient();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.VITE_APP_URL}/settings`,
  });
}

export default createPortalHandler({
  kv,
  verify: verifyPuterIdentity,
  createPortalSession,
}) as (req: VercelRequest, res: VercelResponse) => Promise<void>;
