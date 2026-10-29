"use client";

import { ExternalLink, FileText } from "lucide-react";
import { isSafeHttpUrl } from "@/lib/url";

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
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--separator)",
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
          background: "rgba(var(--tint-rgb), 0.12)",
          border: "1px solid rgba(var(--tint-rgb), 0.2)",
          marginBottom: 20,
        }}
      >
        <FileText style={{ width: 30, height: 30, color: "var(--tint-text)" }} />
      </div>

      <h3
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "var(--label)",
          marginBottom: 10,
          letterSpacing: "-0.01em",
        }}
      >
        Vehicle History Report
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "var(--label-secondary)",
          maxWidth: 380,
          lineHeight: 1.6,
          marginBottom: 28,
        }}
      >
        To view the detailed history report — including accidents, service records, and title
        information — visit the original listing on{" "}
        <span style={{ color: "var(--tint-text)", fontWeight: 600 }}>
          {source || "the listing source"}
        </span>
        .
      </p>

      {isSafeHttpUrl(vdpUrl) ? (
        <a
          href={vdpUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: "var(--radius-md)",
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            background: "linear-gradient(135deg, var(--tint), var(--tint-2))",
            boxShadow: "0 8px 24px rgba(var(--tint-rgb), 0.35)",
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
            borderRadius: "var(--radius-md)",
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--label-tertiary)",
            background: "var(--fill)",
            border: "1px solid var(--separator)",
            cursor: "not-allowed",
          }}
        >
          Listing Link Unavailable
        </button>
      )}
    </div>
  );
}
