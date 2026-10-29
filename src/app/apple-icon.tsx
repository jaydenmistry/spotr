import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the Spotr lens mark, full-bleed (iOS rounds the corners). */
export default function AppleIcon() {
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
        }}
      >
        <svg width="132" height="132" viewBox="0 0 32 32">
          <path d="M22.6 11.2A8 8 0 1 0 24 16" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="16" cy="16" r="3.1" fill="#fff" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
