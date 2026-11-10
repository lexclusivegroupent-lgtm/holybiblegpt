import type { UsageInfo, ConsumeResult } from './usageService';

export const CLOSED_USAGE: UsageInfo = {
  isPro: false,
  count: 0,
  remaining: null,
  limit: null,
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

// A 404, or a 2xx whose body is not JSON (the SPA shell, or the usage routes
// before D1 is provisioned), means this host is not enforcing a counter yet:
// let the question through. Any 5xx, JSON or not, is an outage and fails closed.
export const ABSENT_USAGE: UsageInfo = {
  isPro: false,
  count: 0,
  remaining: null,
  limit: null,
};

export const ABSENT_CONSUME: ConsumeResult = {
  allowed: true,
  isPro: false,
  remaining: null,
};

function jsonObject(rawBody: string): Record<string, unknown> | undefined {
  const trimmed = rawBody.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;
  try {
    const body = JSON.parse(trimmed);
    return isRecord(body) ? body : undefined;
  } catch {
    return undefined;
  }
}

export function parseUsageHttp(status: number, rawBody: string):
  | { kind: 'absent' }
  | { kind: 'closed' }
  | { kind: 'json'; ok: boolean; body: unknown } {
  if (status === 404) return { kind: 'absent' };
  const body = jsonObject(rawBody);
  if (status >= 500) {
    return body ? { kind: 'json', ok: false, body } : { kind: 'closed' };
  }
  if (status >= 200 && status < 300 && !body) return { kind: 'absent' };
  if (!body) return { kind: 'closed' };
  return { kind: 'json', ok: status >= 200 && status < 300, body };
}

export function usageFromHttp(status: number, rawBody: string): UsageInfo {
  const parsed = parseUsageHttp(status, rawBody);
  if (parsed.kind === 'absent') return { ...ABSENT_USAGE };
  if (parsed.kind === 'closed') return { ...CLOSED_USAGE };
  return usageFromPayload(parsed.ok, parsed.body);
}

export function consumeFromHttp(status: number, rawBody: string): ConsumeResult {
  const parsed = parseUsageHttp(status, rawBody);
  if (parsed.kind === 'absent') return { ...ABSENT_CONSUME };
  if (parsed.kind === 'closed') return { ...CLOSED_CONSUME };
  return consumeFromPayload(parsed.ok, parsed.body);
}

// A non-OK response, a network failure, or a payload that does not explicitly
// allow the question fails closed. `isPro` is granted only by boolean true.
export function usageFromPayload(ok: boolean, body: unknown): UsageInfo {
  if (!ok || !isRecord(body) || body.unavailable === true) return { ...CLOSED_USAGE };
  const isPro = body.isPro === true;
  const count = typeof body.count === 'number' && Number.isFinite(body.count) ? body.count : 0;
  const limit = typeof body.limit === 'number' && Number.isFinite(body.limit) ? body.limit : null;
  const remaining = typeof body.remaining === 'number' && Number.isFinite(body.remaining)
    ? body.remaining
    : null;
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

// The chat screen does not show a question counter or an upgrade prompt.
// Reading, search, and AI study stay free. A usage payload never paywalls.
export function chatUsageView(_usage: UsageInfo | null): 'hidden' {
  return 'hidden';
}
