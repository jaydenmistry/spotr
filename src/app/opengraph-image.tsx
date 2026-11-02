import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/site";

export const alt = "Spotr — Private Party Vehicle Acquisition";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "radial-gradient(circle at 25% 20%, #2a2170 0%, #09090c 55%), #09090c",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <svg width="92" height="92" viewBox="0 0 32 32">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#8a6bff" />
                <stop offset="0.55" stopColor="#5b7bff" />
                <stop offset="1" stopColor="#3ea6ff" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#g)" />
            <path d="M22.6 11.2A8 8 0 1 0 24 16" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="16" cy="16" r="3.1" fill="#fff" />
          </svg>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, letterSpacing: -3, color: "#f5f5f7" }}>spotr</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 52, fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
          <span style={{ color: "#f5f5f7" }}>Spot it first.</span>
          <span style={{ color: "#8f80ff" }}>Buy it right.</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 26, color: "#a3a3ad", maxWidth: 940 }}>
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size }
  );
}
