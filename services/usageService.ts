// Free-tier usage gate for the AI chat: 5 free questions, then Pro
// ($6.99/mo) is required. Enforced server-side (api/get-usage.ts,
// api/increment-usage.ts) against Vercel KV, keyed by the Puter account
// verified from the caller's session token — never a client-supplied id
// alone, and never a client-side count.
//
// The Worker implements these routes. Until D1 is bound and migrated, an
// authenticated call gets 404, which this module treats as "no usage API":
// the question is allowed. A real JSON body from D1 is enforced. Any 5xx,
// JSON or not, and any network error fail closed. Bible reading does not
// call this module.

import { getPuterAuthToken } from './aiService';
import { CLOSED_CONSUME, CLOSED_USAGE, consumeFromHttp, usageFromHttp } from './usageGate';

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
    return usageFromHttp(res.status, await res.text());
  } catch {
    return { ...CLOSED_USAGE };
  }
};

// Call this right before sending a message to the AI. `allowed: true` may
// continue. Any 5xx or a network error returns allowed: false. A 404, or a
// 2xx non-JSON body, means this host has no usage API and returns allowed: true.
export const consumeUsage = async (userId: string): Promise<ConsumeResult> => {
  try {
    const headers = await authHeader();
    if (!headers) return { ...CLOSED_CONSUME };
    const res = await fetch('/api/increment-usage', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return consumeFromHttp(res.status, await res.text());
  } catch {
    return { ...CLOSED_CONSUME };
  }
};
