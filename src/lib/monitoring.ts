/**
 * Error monitoring is opt-in: nothing loads unless a Sentry DSN is set.
 * Server: SENTRY_DSN. Browser: NEXT_PUBLIC_SENTRY_DSN (inlined at build).
 * Default PII sending stays off — no IPs, cookies, or request bodies.
 */
export const SENTRY_OPTIONS = {
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
} as const;

/** Report an error the UI caught (error boundaries), if monitoring is on. */
export function reportClientError(error: unknown) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)).catch(() => {});
}
