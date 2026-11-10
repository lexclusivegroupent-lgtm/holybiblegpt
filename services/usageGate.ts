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
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

// The Cloudflare Worker has no usage routes. After the asset binding fix
// those URLs are the SPA shell (200 HTML) or, if unmatched, 404. That is not
// an outage: let the question through, which is how the main domain behaves
// today. A JSON body means the usage API exists (the Vercel host).
export const ABSENT_USAGE: UsageInfo = {
  isPro: false,
  count: 0,
  remaining: null,
  limit: 5,
};

export const ABSENT_CONSUME: ConsumeResult = {
  allowed: true,
  isPro: false,
  remaining: null,
};

export function parseUsageHttp(status: number, rawBody: string):
  | { kind: 'absent' }
  | { kind: 'json'; ok: boolean; body: unknown } {
  if (status === 404) return { kind: 'absent' };
  const trimmed = rawBody.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return { kind: 'absent' };
  try {
    const body = JSON.parse(trimmed);
    if (!isRecord(body)) return { kind: 'absent' };
    return { kind: 'json', ok: status >= 200 && status < 300, body };
  } catch {
    return { kind: 'absent' };
  }
}

export function usageFromHttp(status: number, rawBody: string): UsageInfo {
  const parsed = parseUsageHttp(status, rawBody);
  if (parsed.kind === 'absent') return { ...ABSENT_USAGE };
  return usageFromPayload(parsed.ok, parsed.body);
}

export function consumeFromHttp(status: number, rawBody: string): ConsumeResult {
  const parsed = parseUsageHttp(status, rawBody);
  if (parsed.kind === 'absent') return { ...ABSENT_CONSUME };
  return consumeFromPayload(parsed.ok, parsed.body);
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
