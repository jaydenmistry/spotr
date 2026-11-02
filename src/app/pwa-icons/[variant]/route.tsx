import { ImageResponse } from "next/og";

// Home-screen / install icons for the web app manifest, rendered once at build.
const VARIANTS = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  // Maskable icons get cropped to a circle or squircle by the OS, so the mark
  // sits inside the central 80% "safe zone" on a full-bleed background.
  "maskable-512": { size: 512, maskable: true },
} as const;

type Variant = keyof typeof VARIANTS;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  const config = VARIANTS[variant as Variant];
  if (!config) return new Response("Not found", { status: 404 });
  const { size, maskable } = config;
  // The mark's ring spans ~56% of its 32-unit box — the same proportion as
  // the in-app logo tile; maskable shrinks it to stay inside the safe zone.
  const markSize = Math.round(size * (maskable ? 0.8 : 1));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #8a6bff 0%, #5b7bff 55%, #3ea6ff 100%)",
          borderRadius: maskable ? 0 : Math.round(size * 0.22),
        }}
      >
        <svg width={markSize} height={markSize} viewBox="0 0 32 32">
          <path d="M22.6 11.2A8 8 0 1 0 24 16" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="16" cy="16" r="3.1" fill="#fff" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
