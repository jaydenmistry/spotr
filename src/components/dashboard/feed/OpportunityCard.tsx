"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Ban,
  ChevronDown,
  ChevronUp,
  Clock,
  Crosshair,
  Database,
  Eye,
  ExternalLink,
  FileText,
  Gauge,
  MapPin,
  Undo2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import {
  formatCurrency,
  formatDistance,
  formatMiles,
  getVehicleTitle,
  type LeadRecord,
} from "@/lib/vehicleAnalytics";
import { isFixtureLead, SOURCE_LABELS, type OpportunityAssessment, type Recommendation } from "@/lib/opportunity";
import type { FeedAction } from "@/lib/feedActions";

export const RECOMMENDATION_COLORS: Record<Recommendation, string> = {
  BUY: "#34d399",
  INVESTIGATE: "#fbbf24",
  WATCH: "#60a5fa",
  PASS: "#8b9ab8",
};

function scoreColor(score: number) {
  return score >= 65 ? "#34d399" : score >= 45 ? "#fbbf24" : "#f87171";
}

// createdAt is when Spotr ingested the listing, not seller days-on-market —
// the copy must say so.
function formatListingAge(days: number) {
  if (days === 0) return "Found by Spotr today";
  if (days === 1) return "Found by Spotr 1 day ago";
  if (days < 30) return `Found by Spotr ${days} days ago`;
  return `Found by Spotr ${Math.floor(days / 30)}mo ago`;
}

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "3px 8px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 700,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#8b9ab8",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#8b9ab8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginRight: 8,
};

const actionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#f0f4ff",
  transition: "background 0.15s, border-color 0.15s, color 0.15s",
};

const buttonHoverHandlers = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.09)";
  },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
  },
};

export default function OpportunityCard({
  lead,
  assessment,
  onAction,
  onOpenDossier,
  busy,
  passedView = false,
}: {
  lead: LeadRecord;
  assessment: OpportunityAssessment;
  onAction: (leadId: string, action: FeedAction) => void;
  onOpenDossier: (lead: LeadRecord) => void;
  busy: boolean;
  passedView?: boolean;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const breakdownId = `score-breakdown-${lead.id}`;
  // Shared helper — must match the dossier's fixture detection exactly.
  const isSample = isFixtureLead(lead);
  const isWatched = Boolean(lead.watchedAt);
  const isAssigned = Boolean(lead.assignedTo);
  const locationText = [lead.city, lead.state].filter(Boolean).join(", ");
  const recColor = RECOMMENDATION_COLORS[assessment.recommendation];
  const { maxOffer, buyBoxMatch } = assessment;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "border-color 0.15s, box-shadow 0.15s",
        opacity: busy ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,122,26,0.35)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.35)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {/* Photo — wraps to full width above the content on narrow viewports */}
      <div style={{ position: "relative", flex: "1 1 210px", maxWidth: "100%", minHeight: 190, background: "#0f1520" }}>
        {lead.photo_url ? (
          <Image
            src={lead.photo_url}
            alt={getVehicleTitle(lead)}
            fill
            sizes="(max-width: 800px) 100vw, 210px"
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
              color: "#8b9ab8",
              background: "linear-gradient(135deg, #0f1520, #1a0a00)",
            }}
          >
            No photo available
          </div>
        )}
        {isSample && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "rgba(251,191,36,0.15)",
              border: "1px solid rgba(251,191,36,0.5)",
              borderRadius: 6,
              padding: "2px 7px",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#fbbf24",
            }}
          >
            SAMPLE DATA
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: "999 1 380px", minWidth: 0, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Header row: title + recommendation + score */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span
                style={{
                  flexShrink: 0,
                  borderRadius: 6,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  color: recColor,
                  background: `${recColor}1a`,
                  border: `1px solid ${recColor}55`,
                }}
              >
                {assessment.recommendation}
              </span>
              <h3
                title={getVehicleTitle(lead)}
                style={{ fontSize: 16, fontWeight: 800, color: "#f0f4ff", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {getVehicleTitle(lead)}
              </h3>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 5, fontSize: 12, color: "#8b9ab8" }}>
              {lead.year && <span>{lead.year}</span>}
              {lead.trim && <span>{lead.trim}</span>}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Gauge style={{ width: 13, height: 13 }} />
                {formatMiles(lead.miles)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <MapPin style={{ width: 13, height: 13 }} />
                {locationText || "Location unknown"}
                {lead.distanceMiles !== null && lead.distanceMiles !== undefined && (
                  <span> · {formatDistance(lead.distanceMiles)}</span>
                )}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Clock style={{ width: 13, height: 13 }} />
                {formatListingAge(assessment.listingAgeDays)}
              </span>
            </div>
          </div>

          {/* Score */}
          <button
            onClick={() => setShowBreakdown((value) => !value)}
            title="Show how this score was computed"
            aria-expanded={showBreakdown}
            aria-controls={breakdownId}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "6px 12px",
              borderRadius: 10,
              border: `1px solid ${scoreColor(assessment.finalOpportunityScore)}44`,
              background: `${scoreColor(assessment.finalOpportunityScore)}14`,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 900, color: scoreColor(assessment.finalOpportunityScore), lineHeight: 1 }}>
              {assessment.finalOpportunityScore}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#8b9ab8", display: "inline-flex", alignItems: "center", gap: 3 }}>
              HEURISTIC SCORE {showBreakdown ? <ChevronUp style={{ width: 10, height: 10 }} /> : <ChevronDown style={{ width: 10, height: 10 }} />}
            </span>
          </button>
        </div>

        {/* Why this is interesting */}
        <p style={{ fontSize: 12.5, color: "#c6d0e2", lineHeight: 1.5 }}>{assessment.recommendationReason}</p>

        {/* Price row */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 16 }}>
          <div>
            <span style={fieldLabelStyle}>Asking</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#f0f4ff" }}>{formatCurrency(lead.price)}</span>
          </div>
          <div>
            <span style={fieldLabelStyle}>Est. range</span>
            {assessment.estimatedRange ? (
              <span style={{ fontSize: 14, fontWeight: 700, color: "#f0f4ff" }} title={assessment.estimatedRange.note}>
                {formatCurrency(assessment.estimatedRange.low)} – {formatCurrency(assessment.estimatedRange.high)}
                <span style={{ fontSize: 10, fontWeight: 700, color: "#8b9ab8", marginLeft: 6 }}>
                  {SOURCE_LABELS[assessment.estimatedRange.source]}
                </span>
              </span>
            ) : (
              <span style={{ fontSize: 13, color: "#8b9ab8" }}>Unavailable — no asking price</span>
            )}
          </div>
          <div>
            <span style={fieldLabelStyle}>Max offer</span>
            {maxOffer.status === "unavailable" ? (
              <span style={{ fontSize: 13, color: "#8b9ab8" }} title={maxOffer.reason ?? undefined}>
                Unavailable
              </span>
            ) : maxOffer.status === "below-acquisition-range" ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }} title={`Internal estimate: computed ceiling ${formatCurrency(maxOffer.amount)}`}>
                Offer ceiling below your minimum acquisition price — investigate only
              </span>
            ) : (
              <span style={{ fontSize: 18, fontWeight: 900, color: "#ff9147" }} title={maxOffer.inputs.conservativeRetail.note}>
                {formatCurrency(maxOffer.amount)}
                <span style={{ fontSize: 10, fontWeight: 700, color: "#8b9ab8", marginLeft: 6 }}>
                  Spotr heuristic{maxOffer.cappedByAcquisitionMax ? " · capped at your max" : ""}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Score breakdown (expandable) */}
        {showBreakdown && (
          <div
            id={breakdownId}
            style={{
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(8,12,20,0.6)",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <p style={{ fontSize: 11, color: "#8b9ab8" }}>
              Deterministic heuristic — not an AI model or market appraisal.
            </p>
            {assessment.bands.map((band) => (
              <div key={band.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                <span style={{ color: "#8b9ab8" }}>
                  <span style={{ fontWeight: 700, color: "#f0f4ff" }}>{band.label}.</span> {band.detail}
                </span>
                <span style={{ fontWeight: 800, flexShrink: 0, color: band.points >= band.max * 0.6 ? "#34d399" : "#8b9ab8" }}>
                  {band.points}/{band.max}
                </span>
              </div>
            ))}
            {assessment.riskFactors.map((risk) => (
              <div key={risk.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                <span style={{ color: "#8b9ab8" }}>
                  <span style={{ fontWeight: 700, color: "#f87171" }}>Risk — {risk.label}.</span> {risk.detail}
                </span>
                <span style={{ fontWeight: 800, flexShrink: 0, color: "#f87171" }}>−{risk.points}</span>
              </div>
            ))}
            <p style={{ fontSize: 11, fontWeight: 700, color: "#f0f4ff", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 6 }}>
              Raw {assessment.rawScoreBeforeRisk} − risk {assessment.riskPenalty} ={" "}
              {assessment.finalOpportunityScore} / 100
            </p>
          </div>
        )}

        {/* Provenance + fit + confidence chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span style={chipStyle}>
            <Database style={{ width: 11, height: 11 }} />
            {isSample ? "Synthetic fixture" : lead.source || "Unknown source"}
          </span>
          <span
            style={{
              ...chipStyle,
              ...(buyBoxMatch.excluded ? { color: "#f87171", borderColor: "rgba(248,113,113,0.4)" } : {}),
            }}
            title={buyBoxMatch.reasons.join("; ") || "Meets every configured criterion"}
          >
            <Crosshair style={{ width: 11, height: 11 }} />
            {buyBoxMatch.excluded
              ? "Outside buy box"
              : `Buy box ${buyBoxMatch.fitPoints}/${buyBoxMatch.maxFitPoints}${buyBoxMatch.priority ? ` · ${buyBoxMatch.priority}` : ""}`}
          </span>
          {/* Neutral chip — the recommendation chip is the card's one accent. */}
          <span
            style={chipStyle}
            title={`Confidence reflects listing data completeness only (${assessment.completeness.present} of ${assessment.completeness.total} key fields present). Heuristic, not statistical.`}
          >
            {assessment.confidenceTier} confidence · {assessment.confidencePercent}% · from data completeness
          </span>
          <span
            style={{
              ...chipStyle,
              ...(assessment.completeness.missing.length > 0 ? { color: "#fbbf24", borderColor: "rgba(251,191,36,0.35)" } : {}),
            }}
            title={
              assessment.completeness.missing.length > 0
                ? `Missing: ${assessment.completeness.missing.join(", ")}`
                : "All key data points present"
            }
          >
            {assessment.completeness.present}/{assessment.completeness.total} data points
            {assessment.completeness.missing.length > 0 && ` · missing ${assessment.completeness.missing.join(", ")}`}
          </span>
          {isAssigned && (
            <span style={{ ...chipStyle, color: "#60a5fa", borderColor: "rgba(96,165,250,0.35)" }}>
              <UserCheck style={{ width: 11, height: 11 }} />
              {lead.assignedTo}
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "auto" }}>
          <button
            disabled={busy}
            onClick={() => onOpenDossier(lead)}
            style={{ ...actionButtonStyle, color: "#ff9147", borderColor: "rgba(255,122,26,0.4)", background: "rgba(255,122,26,0.08)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,122,26,0.16)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,122,26,0.08)";
            }}
          >
            <FileText style={{ width: 14, height: 14 }} />
            Open Dossier
          </button>
          {passedView ? (
            <button
              disabled={busy}
              onClick={() => onAction(lead.id, "unpass")}
              style={{ ...actionButtonStyle, color: "#ff9147", borderColor: "rgba(255,122,26,0.4)" }}
              {...buttonHoverHandlers}
            >
              <Undo2 style={{ width: 14, height: 14 }} />
              Restore to feed
            </button>
          ) : (
            <>
              <button
                disabled={busy}
                onClick={() => onAction(lead.id, isWatched ? "unwatch" : "watch")}
                style={{
                  ...actionButtonStyle,
                  ...(isWatched
                    ? { background: "rgba(255,122,26,0.15)", borderColor: "rgba(255,122,26,0.5)", color: "#ff9147" }
                    : {}),
                }}
                {...(isWatched ? {} : buttonHoverHandlers)}
              >
                <Eye style={{ width: 14, height: 14 }} />
                {isWatched ? "Watching" : "Watch"}
              </button>
              <button
                disabled={busy}
                onClick={() => onAction(lead.id, isAssigned ? "unassign" : "assign")}
                style={{
                  ...actionButtonStyle,
                  ...(isAssigned
                    ? { background: "rgba(96,165,250,0.12)", borderColor: "rgba(96,165,250,0.45)", color: "#60a5fa" }
                    : {}),
                }}
                {...(isAssigned ? {} : buttonHoverHandlers)}
              >
                <UserPlus style={{ width: 14, height: 14 }} />
                {isAssigned ? "Unassign" : "Assign to me"}
              </button>
              <button
                disabled={busy}
                onClick={() => onAction(lead.id, "pass")}
                style={{ ...actionButtonStyle, color: "#8b9ab8" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#f87171";
                  e.currentTarget.style.borderColor = "rgba(248,113,113,0.45)";
                  e.currentTarget.style.background = "rgba(248,113,113,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#8b9ab8";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
              >
                <Ban style={{ width: 14, height: 14 }} />
                Pass
              </button>
            </>
          )}
          {lead.vdp_url && lead.vdp_url !== "#" && (
            <a
              href={lead.vdp_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...actionButtonStyle, textDecoration: "none", marginLeft: "auto", color: "#8b9ab8" }}
              {...buttonHoverHandlers}
            >
              <ExternalLink style={{ width: 14, height: 14 }} />
              Listing
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
