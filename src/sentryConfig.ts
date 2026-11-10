// Shared Sentry options. No DSN is stored here. The Worker reads SENTRY_DSN
// from its environment at runtime. The browser reads VITE_SENTRY_DSN, which
// Vite inlines at build time. Both stay empty until the owner sets them.

export const SENTRY_TRACES_SAMPLE_RATE = 0.05;

// Do not attach account identifiers, cookies, headers, or bodies.
// The Worker sends the ESV API key on an outgoing Authorization header, and
// the browser holds a Puter session token. Neither may be copied into Sentry.
export const sentryDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  genAI: { inputs: false, outputs: false },
};

export function sentryDsnFrom(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const dsn = value.trim();
  return dsn.length > 0 ? dsn : undefined;
}

export function cloudflareSentryOptions(dsnValue: unknown): {
  dsn?: string;
  tracesSampleRate?: number;
  dataCollection: typeof sentryDataCollection;
} {
  const dsn = sentryDsnFrom(dsnValue);
  if (!dsn) return { dataCollection: sentryDataCollection };
  return {
    dsn,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    dataCollection: sentryDataCollection,
  };
}
