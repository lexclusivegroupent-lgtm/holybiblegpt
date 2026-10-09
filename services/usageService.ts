// Free-tier usage gate for the AI chat: 5 free questions, then Pro
// ($6.99/mo) is required. Enforced server-side (api/get-usage.ts,
// api/increment-usage.ts) against Vercel KV, keyed by the same Puter
// userId used for the Pro-tier cloud sync — never trust a client-side count.

export interface UsageInfo {
  isPro: boolean;
  count: number;
  remaining: number | null; // null = unlimited (Pro)
  limit: number;
}

export interface ConsumeResult {
  allowed: boolean;
  isPro: boolean;
  remaining: number | null;
}

export const getUsage = async (userId: string): Promise<UsageInfo> => {
  const res = await fetch(`/api/get-usage?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    // Fail open on read errors — don't block the UI over an infra hiccup.
    return { isPro: false, count: 0, remaining: 5, limit: 5 };
  }
  return res.json();
};

// Call this right before sending a message to the AI. Atomically checks and
// consumes one of the free tries. If `allowed` is false, do not call the AI
// — show the upgrade paywall instead.
export const consumeUsage = async (userId: string): Promise<ConsumeResult> => {
  try {
    const res = await fetch('/api/increment-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return { allowed: true, isPro: false, remaining: null };
    return res.json();
  } catch {
    // Fail open — a network hiccup shouldn't block a free tool.
    return { allowed: true, isPro: false, remaining: null };
  }
};
