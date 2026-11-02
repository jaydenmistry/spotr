import { SENTRY_OPTIONS } from "@/lib/monitoring";

// Inlined at build time; when unset, the SDK chunk is never requested.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => Sentry.init({ dsn, ...SENTRY_OPTIONS }));
}
