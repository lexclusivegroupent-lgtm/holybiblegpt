// Usage count for analytics. AI study is free and is not capped.
// The Worker implements these routes. The count is keyed by the Puter
// account verified from the caller's session token — never a client-supplied
// id alone. Callers must not block a question on this result. Bible reading
// and search do not call this module.

import { getPuterAuthToken } from './aiService';
import { CLOSED_CONSUME, CLOSED_USAGE, consumeFromHttp, usageFromHttp } from './usageGate';

export interface UsageInfo {
  isPro: boolean;
  count: number;
  remaining: number | null; // null = unlimited
  limit: number | null;
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

// Records a question for analytics. The return value must not block study.
// A 404, or a 2xx non-JSON body, means this host has no usage API.
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
