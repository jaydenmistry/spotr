import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Error monitoring is opt-in: nothing loads unless a Sentry DSN is set.
 * Server: SENTRY_DSN. Browser: NEXT_PUBLIC_SENTRY_DSN (inlined at build).
 *
 * Privacy: this SDK version collects request data by default and ignores the
 * legacy `sendDefaultPii` flag, so every `dataCollection` channel is switched
 * off explicitly, and `scrubEvent` strips what remains. Performance tracing
 * is off. Keep /privacy in sync with this file.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// 17-character VINs (no I, O, Q) and Spotr's fixture/e2e VIN formats.
const VIN = /\b(?:[A-HJ-NPR-Z0-9]{17}|(?:SPOTR|LIVE|E2E)-[A-Z0-9-]+)\b/g;

function redact(text: string): string {
  return text.replace(EMAIL, "[email]").replace(VIN, "[vin]");
}

/** Removes request/user context and redacts emails and VINs from messages. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.request;
  delete event.user;
  delete event.extra;
  if (event.message) event.message = redact(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = redact(exception.value);
  }
  event.breadcrumbs = event.breadcrumbs?.map(({ data: _data, ...crumb }) => ({
    ...crumb,
    message: crumb.message ? redact(crumb.message) : crumb.message,
  }));
  return event;
}

export const SENTRY_OPTIONS = {
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
  },
  beforeSend: scrubEvent,
};

/** Report an error the UI caught (error boundaries), if monitoring is on. */
export function reportClientError(error: unknown) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)).catch(() => {});
}
