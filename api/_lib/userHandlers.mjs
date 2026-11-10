import { FREE_LIMIT, usageUnavailableBody } from './usageGate.mjs';
import { headerValue } from './puterIdentity.mjs';

function requestedUserId(value) {
  return typeof value === 'string' ? value : '';
}

async function requireIdentity(verify, req, requested) {
  const authorization = headerValue(req.headers?.authorization);
  return verify(authorization, requested);
}

function deny(res, identity) {
  res.status(identity.status).json({ error: identity.error });
}

export function createSyncPullHandler({ kv, verify }) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const identity = await requireIdentity(verify, req, requestedUserId(req.query?.userId));
    if (!identity.ok) return deny(res, identity);

    try {
      const status = await kv.get(`user:${identity.username}:status`);
      if (status !== 'pro') {
        return res.status(403).json({ error: 'Pro subscription required for sync.' });
      }
      const data = await kv.get(`user:${identity.username}:data`);
      return res.status(200).json({ data: data ?? null });
    } catch (error) {
      console.error('Sync pull error:', error);
      return res.status(500).json({ error: 'Sync failed.' });
    }
  };
}

export function createSyncPushHandler({ kv, verify }) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const identity = await requireIdentity(verify, req, requestedUserId(req.body?.userId));
    if (!identity.ok) return deny(res, identity);

    const data = req.body?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'Missing data' });
    }

    try {
      const status = await kv.get(`user:${identity.username}:status`);
      if (status !== 'pro') {
        return res.status(403).json({ error: 'Pro subscription required for sync.' });
      }
      const size = JSON.stringify(data).length;
      if (size > 500_000) {
        return res.status(413).json({ error: 'Sync data too large.' });
      }
      const syncedAt = Date.now();
      await kv.set(`user:${identity.username}:data`, { ...data, syncedAt });
      return res.status(200).json({ ok: true, syncedAt });
    } catch (error) {
      console.error('Sync push error:', error);
      return res.status(500).json({ error: 'Sync failed.' });
    }
  };
}

export function createGetStatusHandler({ kv, verify }) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const identity = await requireIdentity(verify, req, requestedUserId(req.query?.userId));
    if (!identity.ok) return deny(res, identity);

    try {
      const status = await kv.get(`user:${identity.username}:status`);
      return res.status(200).json({ status: status === 'pro' ? 'pro' : 'free' });
    } catch (error) {
      console.error('Status check error:', error);
      return res.status(503).json({ error: 'Could not check status.' });
    }
  };
}

export function createCheckStatusHandler({ kv, verify }) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const identity = await requireIdentity(verify, req, requestedUserId(req.query?.userId));
    if (!identity.ok) return deny(res, identity);

    try {
      const status = await kv.get(`user:${identity.username}:status`);
      return res.status(200).json({ isPro: status === 'pro' });
    } catch (error) {
      console.error('Status Check Error:', error);
      return res.status(503).json({ error: 'Could not check status.' });
    }
  };
}

export function createGetUsageHandler({ kv, verify, limit = FREE_LIMIT }) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const identity = await requireIdentity(verify, req, requestedUserId(req.query?.userId));
    if (!identity.ok) return deny(res, identity);

    try {
      const status = await kv.get(`user:${identity.username}:status`);
      if (status === 'pro') {
        return res.status(200).json({ isPro: true, count: 0, remaining: null, limit });
      }
      const count = (await kv.get(`usage:${identity.username}:count`)) || 0;
      return res.status(200).json({
        isPro: false,
        count,
        remaining: Math.max(0, limit - count),
        limit,
      });
    } catch (error) {
      console.error('Get usage error:', error);
      return res.status(503).json(usageUnavailableBody());
    }
  };
}

export function createIncrementUsageHandler({ kv, verify, limit = FREE_LIMIT }) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const identity = await requireIdentity(verify, req, requestedUserId(req.body?.userId));
    if (!identity.ok) return deny(res, identity);

    try {
      const status = await kv.get(`user:${identity.username}:status`);
      if (status === 'pro') {
        return res.status(200).json({ allowed: true, isPro: true, remaining: null });
      }

      const count = await kv.incr(`usage:${identity.username}:count`);
      if (count > limit) {
        return res.status(200).json({
          allowed: false,
          isPro: false,
          remaining: 0,
          count: limit,
          limit,
        });
      }

      return res.status(200).json({
        allowed: true,
        isPro: false,
        remaining: limit - count,
        count,
        limit,
      });
    } catch (error) {
      console.error('Increment usage error:', error);
      // Fail closed. A KV error must not grant another AI question.
      return res.status(503).json(usageUnavailableBody());
    }
  };
}

export function createCheckoutHandler({ verify, createSession }) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const identity = await requireIdentity(verify, req, requestedUserId(req.body?.userId));
    if (!identity.ok) return deny(res, identity);

    try {
      const session = await createSession(identity.username);
      if (!session?.url) {
        return res.status(500).json({ error: 'Could not start checkout.' });
      }
      return res.status(200).json({ url: session.url });
    } catch (error) {
      console.error('Stripe Error:', error);
      return res.status(500).json({ error: 'Could not start checkout.' });
    }
  };
}

export function createPortalHandler({ kv, verify, createPortalSession }) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const identity = await requireIdentity(verify, req, requestedUserId(req.body?.userId));
    if (!identity.ok) return deny(res, identity);

    try {
      const customerId = await kv.get(`user:${identity.username}:customer`);
      if (!customerId) {
        return res.status(404).json({ error: 'No subscription found for this user.' });
      }
      const session = await createPortalSession(customerId);
      if (!session?.url) {
        return res.status(500).json({ error: 'Could not open billing portal.' });
      }
      return res.status(200).json({ url: session.url });
    } catch (error) {
      console.error('Portal Error:', error);
      return res.status(500).json({ error: 'Could not open billing portal.' });
    }
  };
}
