import Script from "next/script";

// Privacy-friendly analytics (Umami/Plausible-compatible script tag).
// Enabled only when both env vars are set at build time, e.g.:
//   NEXT_PUBLIC_ANALYTICS_SRC=https://analytics.example.com/script.js
//   NEXT_PUBLIC_ANALYTICS_WEBSITE_ID=<website-uuid>
const src = process.env.NEXT_PUBLIC_ANALYTICS_SRC;
const websiteId = process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID;

export function Analytics() {
  if (!src || !websiteId) return null;
  return <Script src={src} data-website-id={websiteId} strategy="afterInteractive" />;
}
