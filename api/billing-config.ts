import { VercelRequest, VercelResponse } from '@vercel/node';

// Reports whether checkout can run. It never returns key material.
// The owner creates the Stripe product and price in the Dashboard and sets
// the variables named in docs/billing.md. This route does not create them.

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secretConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const priceConfigured = Boolean(process.env.STRIPE_PRICE_ID);
  const appUrlConfigured = Boolean(process.env.VITE_APP_URL);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    checkout: secretConfigured && priceConfigured && appUrlConfigured,
    portal: secretConfigured && appUrlConfigured,
  });
}
