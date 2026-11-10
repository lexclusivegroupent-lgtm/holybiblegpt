// Free-tier usage gate for the AI chat: 5 free questions, then Pro
// ($6.99/mo) is required. Enforced server-side (api/get-usage.ts,
// api/increment-usage.ts) against Vercel KV, keyed by the Puter account
// verified from the caller's session token — never a client-supplied id
// alone, and never a client-side count.
//
// The Worker on holybiblegpt.com does not implement these routes. HTML or a
// 404 means there is no usage API, and the question is allowed. On the Vercel
// host the API returns JSON: a 5xx JSON body or a network error fails closed
// and the question is not sent. Bible reading does not call this module.

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
// continue. A JSON 5xx or a network error returns allowed: false. HTML or
// 404 (no usage API on this host) returns allowed: true.
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
