"use client";

import { Clock, ExternalLink, Eye, Gauge, MapPin, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import Image from "next/image";
import ValueTrendGraph from "./ValueTrendGraph";
import {
  formatCurrency,
  formatDistance,
  formatSignedCurrency,
  formatSignedPercent,
  getVehicleTitle,
  getVehicleAnalytics,
  isVerifiedListing,
  type LeadRecord,
} from "@/lib/vehicleAnalytics";
import { isSafeHttpUrl } from "@/lib/url";
import { isTerminalStage } from "@/lib/stages";
import { getFollowUpStatus } from "@/lib/followUp";

export default function LeadCard({
  lead,
  onClick,
  now,
}: {
  lead: LeadRecord;
  onClick: () => void;
  /** Shared clock from the page. Omitted (inventory grid) it falls back to the
   *  helper's own `new Date()`; supplied, every follow-up readout on the page
   *  is evaluated against the same instant. */
  now?: Date;
}) {
  const analytics = getVehicleAnalytics(lead);
  const isAppreciating = analytics.movement === "Appreciating";
  const verified = isVerifiedListing(lead);
  // Overdue is the only follow-up state loud enough for a card badge; the
  // shared helper already exempts passed/terminal leads.
  const isOverdue = getFollowUpStatus(lead, now) === "overdue";
  const TrendIcon = isAppreciating ? TrendingUp : TrendingDown;
  const trendColor = isAppreciating ? "#34d399" : "#ff9147";

  return (
    <div
      onClick={onClick}
      style={{
        marginBottom: 10,
        cursor: "pointer",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,122,26,0.4)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.35)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.transform = "";
      }}
    >
      {/* Photo */}
      <div style={{ position: "relative", height: 120, background: "#0f1520" }}>
        {lead.photo_url ? (
          <Image
            src={lead.photo_url}
            alt={getVehicleTitle(lead)}
            fill
            sizes="300px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#4a5670",
              background: "linear-gradient(135deg, #0f1520, #1a0a00)",
            }}
          >
            No photo available
          </div>
        )}

        {/* Price badge */}
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "rgba(8,12,20,0.85)",
            backdropFilter: "blur(8px)",
            borderRadius: 8,
            padding: "3px 9px",
            fontSize: 12,
            fontWeight: 800,
            color: "#f0f4ff",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {formatCurrency(lead.price)}
        </div>

        {/* Verified badge */}
        {verified && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(8,12,20,0.85)",
              backdropFilter: "blur(8px)",
              borderRadius: 8,
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 700,
              color: "#34d399",
              border: "1px solid rgba(52,211,153,0.25)",
            }}
          >
            <ShieldCheck style={{ width: 11, height: 11 }} aria-hidden="true" />
            Verified
          </div>
        )}

        {/* Feed decisions are visible on every surface. Pass outranks Watch,
            and closed-out leads (Acquired/Lost) drop the badge — matching the
            feed's Watching tab and the TopStats count. */}
        {!lead.passedAt && lead.watchedAt && !isTerminalStage(lead.stage) && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(8,12,20,0.85)",
              backdropFilter: "blur(8px)",
              borderRadius: 8,
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 700,
              color: "#ff9147",
              border: "1px solid rgba(255,122,26,0.35)",
            }}
          >
            <Eye style={{ width: 11, height: 11 }} aria-hidden="true" />
            Watching
          </div>
        )}
        {lead.passedAt && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              background: "rgba(8,12,20,0.85)",
              backdropFilter: "blur(8px)",
              borderRadius: 8,
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 700,
              color: "#f87171",
              border: "1px solid rgba(248,113,113,0.3)",
            }}
          >
            Passed in feed
          </div>
        )}

        {/* Overdue follow-up — bottom-right so it never collides with the
            watch/pass badges bottom-left. Icon + text, not color alone. */}
        {isOverdue && (
          <div
            role="status"
            aria-label="Follow-up overdue"
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(8,12,20,0.85)",
              backdropFilter: "blur(8px)",
              borderRadius: 8,
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 700,
              color: "#f87171",
              border: "1px solid rgba(248,113,113,0.4)",
            }}
          >
            <Clock style={{ width: 11, height: 11 }} aria-hidden="true" />
            Overdue
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "12px 12px 14px" }}>
        <h4
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#f0f4ff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 8,
          }}
        >
          {getVehicleTitle(lead)}
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8b9ab8" }}>
            <Gauge style={{ width: 11, height: 11, color: "#4a5670", flexShrink: 0 }} />
            {lead.miles ? new Intl.NumberFormat("en-US").format(lead.miles) : "Unknown"} miles
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8b9ab8" }}>
            <MapPin style={{ width: 11, height: 11, color: "#4a5670", flexShrink: 0 }} />
            {formatDistance(lead.distanceMiles)}{lead.city || lead.state ? ` · ${lead.city}, ${lead.state}` : ""}
          </div>
        </div>

        {/* Analyzer box */}
        <div
          style={{
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.025)",
            padding: "10px 10px 8px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#ff9147",
              }}
            >
              Listing analyzer
            </span>
            <span
              style={{
                borderRadius: 100,
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 700,
                background: analytics.dealScore === "Great deal" ? "rgba(52,211,153,0.15)" : "rgba(255,122,26,0.15)",
                color: analytics.dealScore === "Great deal" ? "#34d399" : "#ff9147",
              }}
            >
              {analytics.dealScore}
            </span>
          </div>

          {/* Fair value */}
          <div
            style={{
              borderRadius: 8,
              background: "rgba(52,211,153,0.07)",
              border: "1px solid rgba(52,211,153,0.15)",
              padding: "7px 10px",
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#8b9ab8" }}>Spotr est. value</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f0f4ff" }}>
                {formatCurrency(analytics.estimatedMarketValue)}
              </span>
            </div>
            <p
              style={{
                marginTop: 3,
                fontSize: 11,
                fontWeight: 600,
                color: analytics.fairValueSpread >= 0 ? "#34d399" : "#ff9147",
              }}
            >
              {formatSignedCurrency(analytics.fairValueSpread)} vs asking · heuristic
            </p>
          </div>

          {/* Trend */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#f0f4ff" }}>
              <TrendIcon style={{ width: 13, height: 13, color: trendColor }} />
              {analytics.movement}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>
              {formatSignedCurrency(analytics.projectedChangeDollars)}
            </span>
          </div>

          <ValueTrendGraph points={analytics.graphPoints} movement={analytics.movement} compact />

          <div
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 10,
              color: "#4a5670",
            }}
          >
            {/* Heuristic label, not a comp count — getVehicleAnalytics has no real comps. */}
            <span>Spotr heuristic</span>
            <span>{formatSignedPercent(analytics.projectedChangePercent)}</span>
          </div>

          {isSafeHttpUrl(lead.vdp_url) && (
            <a
              href={lead.vdp_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                borderRadius: 8,
                background: "linear-gradient(135deg, #ff7a1a, #f59e0b)",
                padding: "7px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                textDecoration: "none",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Verify listing <ExternalLink style={{ width: 11, height: 11 }} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
