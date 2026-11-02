import type { NextConfig } from "next";

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Production-only CSP for the static marketing pages. Inline scripts stay
// allowed because their HTML is built ahead of time, so there's no per-request
// nonce; what this does lock down: third-party script/connect origins,
// framing, plugins, base-URI hijacks, and cross-origin form posts. The app
// and login get a strict nonce-based policy from src/proxy.ts instead
// (src/lib/csp.ts — keep the shared directives in step).
const analyticsOrigin = originOf(process.env.NEXT_PUBLIC_ANALYTICS_SRC);
const sentryOrigin = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${analyticsOrigin ? ` ${analyticsOrigin}` : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Listing photos come from many dealer CDNs; they're https-only via safePhotoUrl().
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${analyticsOrigin ? ` ${analyticsOrigin}` : ""}${sentryOrigin ? ` ${sentryOrigin}` : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  images: {
    // Listing photos come from many dealer CDNs and are shown as-is (no
    // server-side fetching), over https only — see safePhotoUrl().
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Dev needs eval + HMR websockets, so the CSP only ships in production builds.
      ...(process.env.NODE_ENV === "production"
        ? [{ source: "/((?!(?:dashboard|login)(?:/|$)).*)", headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] }]
        : []),
    ];
  },
};

export default nextConfig;
