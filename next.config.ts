import type { NextConfig } from "next";

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Production-only CSP. Inline scripts stay allowed because Next's streamed
// RSC payload and the pre-paint theme script are inline (moving to nonces is
// a follow-up); what this does lock down: third-party script/connect origins,
// framing, plugins, base-URI hijacks, and cross-origin form posts.
const analyticsOrigin = originOf(process.env.NEXT_PUBLIC_ANALYTICS_SRC);
const sentryOrigin = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${analyticsOrigin ? ` ${analyticsOrigin}` : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Listing photos come from arbitrary provider CDNs.
  "img-src 'self' data: blob: https: http:",
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
  // Dev needs eval + HMR websockets, so the CSP only ships in production builds.
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
];

const nextConfig: NextConfig = {
  images: {
    // Listing photos come from arbitrary dealer/seller CDNs over http and https
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
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
    ];
  },
};

export default nextConfig;
