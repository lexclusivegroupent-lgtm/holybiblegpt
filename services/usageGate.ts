import type { UsageInfo, ConsumeResult } from './usageService';

export const CLOSED_USAGE: UsageInfo = {
  isPro: false,
  count: 0,
  remaining: null,
  limit: 5,
  unavailable: true,
};

export const CLOSED_CONSUME: ConsumeResult = {
  allowed: false,
  isPro: false,
  remaining: null,
  unavailable: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

// A non-OK response, a network failure, or a payload that does not explicitly
// allow the question fails closed. `isPro` is granted only by boolean true.
export function usageFromPayload(ok: boolean, body: unknown): UsageInfo {
  if (!ok || !isRecord(body) || body.unavailable === true) return { ...CLOSED_USAGE };
  const isPro = body.isPro === true;
  const count = typeof body.count === 'number' && Number.isFinite(body.count) ? body.count : 0;
  const limit = typeof body.limit === 'number' && Number.isFinite(body.limit) ? body.limit : 5;
  const remaining = isPro
    ? null
    : typeof body.remaining === 'number' && Number.isFinite(body.remaining)
      ? body.remaining
      : 0;
  return { isPro, count, remaining, limit };
}

export function consumeFromPayload(ok: boolean, body: unknown): ConsumeResult {
  if (!ok || !isRecord(body) || body.allowed !== true) {
    if (isRecord(body) && body.allowed === false && body.unavailable !== true && typeof body.remaining === 'number') {
      return { allowed: false, isPro: false, remaining: body.remaining };
    }
    return { ...CLOSED_CONSUME };
  }
  const isPro = body.isPro === true;
  return {
    allowed: true,
    isPro,
    remaining: isPro
      ? null
      : typeof body.remaining === 'number' && Number.isFinite(body.remaining)
        ? body.remaining
        : null,
  };
}

// What the chat screen should show. Outage is not the upgrade paywall, and
// a missing check is not "5 free questions left".
export function chatUsageView(usage: UsageInfo | null): 'hidden' | 'remaining' | 'paywall' | 'unavailable' {
  if (!usage || usage.isPro) return 'hidden';
  if (usage.unavailable) return 'unavailable';
  if (usage.remaining === 0) return 'paywall';
  if (usage.remaining !== null && usage.remaining > 0) return 'remaining';
  return 'hidden';
}
