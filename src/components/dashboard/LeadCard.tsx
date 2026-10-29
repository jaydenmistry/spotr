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
  const trendColor = isAppreciating ? "var(--green)" : "var(--orange)";

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Open dossier for ${getVehicleTitle(lead)}`}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="hover-lift opportunity-card"
      style={{
        marginBottom: 10,
        cursor: "pointer",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "var(--bg-card)",
        border: "1px solid var(--separator)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Photo */}
      <div className="card-photo" style={{ position: "relative", height: 150, overflow: "hidden", background: "var(--bg-surface)" }}>
        {lead.photo_url ? (
          <Image
            src={lead.photo_url}
            alt={getVehicleTitle(lead)}
            fill
            unoptimized
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
              fontWeight: 600,
              color: "var(--label-secondary)",
              background: "linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))",
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
            background: "rgba(var(--base-rgb), 0.85)",
            backdropFilter: "blur(8px)",
            borderRadius: "var(--radius-sm)",
            padding: "3px 9px",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--label)",
            border: "1px solid var(--separator-strong)",
          }}
        >
          <span style={{ fontWeight: 500, opacity: 0.75, marginRight: 4 }}>Asking</span>
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
              background: "rgba(var(--base-rgb), 0.85)",
              backdropFilter: "blur(8px)",
              borderRadius: "var(--radius-sm)",
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--green)",
              border: "1px solid rgba(var(--green-rgb), 0.25)",
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
              background: "rgba(var(--base-rgb), 0.85)",
              backdropFilter: "blur(8px)",
              borderRadius: "var(--radius-sm)",
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--tint-text)",
              border: "1px solid rgba(var(--tint-rgb), 0.35)",
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
              background: "rgba(var(--base-rgb), 0.85)",
              backdropFilter: "blur(8px)",
              borderRadius: "var(--radius-sm)",
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--red)",
              border: "1px solid rgba(var(--red-rgb), 0.3)",
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
              background: "rgba(var(--base-rgb), 0.85)",
              backdropFilter: "blur(8px)",
              borderRadius: "var(--radius-sm)",
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--red)",
              border: "1px solid rgba(var(--red-rgb), 0.4)",
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
            fontWeight: 600,
            color: "var(--label)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 8,
          }}
        >
          {getVehicleTitle(lead)}
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--label-secondary)" }}>
            <Gauge style={{ width: 11, height: 11, color: "var(--label-secondary)", flexShrink: 0 }} />
            {lead.miles ? new Intl.NumberFormat("en-US").format(lead.miles) : "Unknown"} miles
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--label-secondary)" }}>
            <MapPin style={{ width: 11, height: 11, color: "var(--label-secondary)", flexShrink: 0 }} />
            {formatDistance(lead.distanceMiles)}{lead.city || lead.state ? ` · ${lead.city}, ${lead.state}` : ""}
          </div>
        </div>

        {/* Analyzer box */}
        <div
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--separator)",
            background: "rgba(var(--ink-rgb), 0.025)",
            padding: "10px 10px 8px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--tint-text)",
              }}
            >
              Listing analyzer
            </span>
            <span
              style={{
                borderRadius: 999,
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 600,
                background: analytics.dealScore === "Great deal" ? "rgba(var(--green-rgb), 0.15)" : "rgba(var(--tint-rgb), 0.15)",
                color: analytics.dealScore === "Great deal" ? "var(--green)" : "var(--tint-text)",
              }}
            >
              {analytics.dealScore}
            </span>
          </div>

          {/* Fair value */}
          <div
            style={{
              borderRadius: "var(--radius-sm)",
              background: "rgba(var(--green-rgb), 0.07)",
              border: "1px solid rgba(var(--green-rgb), 0.15)",
              padding: "7px 10px",
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "var(--label-secondary)" }}>Spotr est. value</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>
                {formatCurrency(analytics.estimatedMarketValue)}
              </span>
            </div>
            <p
              style={{
                marginTop: 3,
                fontSize: 11,
                fontWeight: 600,
                color: analytics.fairValueSpread >= 0 ? "var(--green)" : "var(--tint-text)",
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
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "var(--label)" }}>
              <TrendIcon style={{ width: 13, height: 13, color: trendColor }} />
              {analytics.movement} · projected
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: trendColor }}>
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
              fontSize: 11,
              color: "var(--label-secondary)",
            }}
          >
            {/* Heuristic label, not a comp count — getVehicleAnalytics has no real comps. */}
            <span>Spotr estimate (heuristic), not market data</span>
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
                borderRadius: 999,
                background: "rgba(var(--tint-rgb), 0.12)",
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--tint-text)",
                textDecoration: "none",
              }}
              className="pressable hover-fill"
            >
              Verify listing <ExternalLink style={{ width: 11, height: 11 }} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
