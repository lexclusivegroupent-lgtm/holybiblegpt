// Decides whether the Pro buttons should be shown. A HTML response (the
// Cloudflare Worker serves the SPA for unknown /api routes) is not a
// working billing API.

export function interpretBillingResponse(status, contentType, body) {
  if (status !== 200 || !String(contentType || '').includes('application/json') || !body || typeof body !== 'object') {
    return { checkout: false, portal: false };
  }
  return {
    checkout: body.checkout === true,
    portal: body.portal === true,
  };
}

// Pro stays only while Stripe reports an active or trialing subscription.
// past_due, unpaid, canceled, incomplete, and incomplete_expired do not.
export function isProSubscriptionStatus(status) {
  return status === 'active' || status === 'trialing';
}

export function subscriptionIdFromInvoice(invoice) {
  const nested = invoice?.parent?.subscription_details?.subscription;
  if (typeof nested === 'string') return nested;
  if (nested && typeof nested.id === 'string') return nested.id;
  const legacy = invoice?.subscription;
  if (typeof legacy === 'string') return legacy;
  if (legacy && typeof legacy.id === 'string') return legacy.id;
  return null;
}
