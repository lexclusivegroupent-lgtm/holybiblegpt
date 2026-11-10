// Free-tier usage gate for the AI chat: 5 free questions, then Pro
// ($6.99/mo) is required. Enforced server-side (api/get-usage.ts,
// api/increment-usage.ts) against Vercel KV, keyed by the Puter account
// verified from the caller's session token — never a client-supplied id
// alone, and never a client-side count.
//
// If the check cannot be completed, the gate fails closed: the AI question
// is not sent. Bible reading does not call this module.

import { getPuterAuthToken } from './aiService';
import { CLOSED_CONSUME, CLOSED_USAGE, consumeFromPayload, usageFromPayload } from './usageGate';

export interface UsageInfo {
  isPro: boolean;
  count: number;
  remaining: number | null; // null = unlimited (Pro) or unknown (unavailable)
  limit: number;
  unavailable?: boolean;
}

export interface ConsumeResult {
  allowed: boolean;
  isPro: boolean;
  remaining: number | null;
  unavailable?: boolean;
}

async function authHeader(): Promise<Record<string, string> | null> {
  const token = await getPuterAuthToken();
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export const getUsage = async (userId: string): Promise<UsageInfo> => {
  try {
    const headers = await authHeader();
    if (!headers) return { ...CLOSED_USAGE };
    const res = await fetch(`/api/get-usage?userId=${encodeURIComponent(userId)}`, { headers });
    const body = await res.json().catch(() => null);
    return usageFromPayload(res.ok, body);
  } catch {
    return { ...CLOSED_USAGE };
  }
};

// Call this right before sending a message to the AI. If `allowed` is not
// true, do not call the AI. Network and server errors return allowed: false.
export const consumeUsage = async (userId: string): Promise<ConsumeResult> => {
  try {
    const headers = await authHeader();
    if (!headers) return { ...CLOSED_CONSUME };
    const res = await fetch('/api/increment-usage', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const body = await res.json().catch(() => null);
    return consumeFromPayload(res.ok, body);
  } catch {
    return { ...CLOSED_CONSUME };
  }
};
