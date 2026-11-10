import { cloudflareSentryOptions } from '../src/sentryConfig';

type SentryModule = typeof import('@sentry/react');

let sentry: SentryModule | null = null;

// Loads @sentry/react only when VITE_SENTRY_DSN was set at build time.
// An empty value does not download the SDK.
export async function initClientSentry(dsnValue: unknown): Promise<boolean> {
  if (sentry) return true;
  const options = cloudflareSentryOptions(dsnValue);
  if (!options.dsn) return false;
  sentry = await import('@sentry/react');
  sentry.init(options);
  return true;
}

export function captureClientException(error: unknown): void {
  sentry?.captureException(error);
}
