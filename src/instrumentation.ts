import type { Instrumentation } from "next";
import { SENTRY_OPTIONS } from "@/lib/monitoring";

const dsn = process.env.SENTRY_DSN;

export async function register() {
  if (!dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({ dsn, ...SENTRY_OPTIONS });
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
