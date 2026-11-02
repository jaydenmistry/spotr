import { createHash, randomBytes } from "node:crypto";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

// Strict CSP for the signed-in app and the login page, sent by src/proxy.ts.
// Those routes render per request, so Next stamps this nonce on its own
// scripts and no inline script runs without it ('unsafe-inline' is ignored
// once a nonce is present). Marketing pages stay static and keep the looser
// header in next.config.ts, which can't import this file (the runtime image
// ships next.config.ts on its own) — keep the other directives in step.

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// The pre-paint theme script in app/layout.tsx is a fixed string, so it's
// allowed by hash rather than by threading the nonce through the root layout
// (which would make every page dynamic).
export const THEME_INIT_SCRIPT_HASH = `'sha256-${createHash("sha256").update(THEME_INIT_SCRIPT).digest("base64")}'`;

export function createNonce(): string {
  return randomBytes(16).toString("base64");
}

export function nonceContentSecurityPolicy(nonce: string): string {
  const analyticsOrigin = originOf(process.env.NEXT_PUBLIC_ANALYTICS_SRC);
  const sentryOrigin = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const extra = (...origins: Array<string | null>) => origins.filter(Boolean).map((origin) => ` ${origin}`).join("");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${THEME_INIT_SCRIPT_HASH}${extra(analyticsOrigin)}`,
    // React renders inline style attributes, which nonces can't cover.
    "style-src 'self' 'unsafe-inline'",
    // Listing photos come from many dealer CDNs; they're https-only via safePhotoUrl().
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${extra(analyticsOrigin, sentryOrigin)}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}
