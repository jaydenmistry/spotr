"use client";

import { ExternalLink, FileText } from "lucide-react";

export default function CarfaxMock({
  vdpUrl,
  source,
}: {
  vdpUrl: string | null;
  source: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "var(--bg-card)",
        padding: "64px 32px",
        textAlign: "center",
        minHeight: 340,
      }}
    >
      {/* Icon badge */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          display: "grid",
          placeItems: "center",
          background: "rgba(255,122,26,0.12)",
          border: "1px solid rgba(255,122,26,0.2)",
          marginBottom: 20,
        }}
      >
        <FileText style={{ width: 30, height: 30, color: "#ff9147" }} />
      </div>

      <h3
        style={{
          fontSize: 20,
          fontWeight: 900,
          color: "#f0f4ff",
          marginBottom: 10,
          letterSpacing: "-0.01em",
        }}
      >
        Vehicle History Report
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "#8b9ab8",
          maxWidth: 380,
          lineHeight: 1.6,
          marginBottom: 28,
        }}
      >
        To view the detailed history report — including accidents, service records, and title
        information — visit the original listing on{" "}
        <span style={{ color: "#ff9147", fontWeight: 600 }}>
          {source || "the listing source"}
        </span>
        .
      </p>

      {vdpUrl && vdpUrl !== "#" ? (
        <a
          href={vdpUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            background: "linear-gradient(135deg, #ff7a1a, #f59e0b)",
            boxShadow: "0 8px 24px rgba(255,122,26,0.35)",
            textDecoration: "none",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          View Full Report <ExternalLink style={{ width: 15, height: 15 }} />
        </a>
      ) : (
        <button
          disabled
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 700,
            color: "#4a5670",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "not-allowed",
          }}
        >
          Listing Link Unavailable
        </button>
      )}
    </div>
  );
}
