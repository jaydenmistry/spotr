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
          background: "linear-gradient(135deg, #05070c 0%, #0d1420 60%, #1a1108 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #ff7a1a, #f59e0b)",
              fontSize: 52,
            }}
          >
            🚗
          </div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 900, color: "#f0f4ff" }}>
            SPOT<span style={{ color: "#ff7a1a" }}>R</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 40,
            fontWeight: 700,
            color: "#f0f4ff",
            lineHeight: 1.2,
          }}
        >
          Find private-party exotics before anyone else.
        </div>
        <div style={{ marginTop: 24, fontSize: 26, color: "#8b9ab8", maxWidth: 900 }}>
          {SITE_DESCRIPTION}
        </div>
        <div style={{ marginTop: 48, fontSize: 24, color: "#ff7a1a", fontWeight: 700 }}>
          spotrcars.com
        </div>
      </div>
    ),
    { ...size }
  );
}
