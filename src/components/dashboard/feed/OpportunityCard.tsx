"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import {
  Ban,
  ChevronDown,
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
import { isFixtureLead, SOURCE_LABELS, type OpportunityAssessment } from "@/lib/opportunity";
import type { FeedAction } from "@/lib/feedActions";
import { isSafeHttpUrl } from "@/lib/url";
import { RECOMMENDATION_COLORS, scoreColor, tone } from "@/lib/ui/colors";
import { spring } from "@/lib/motion";

export { RECOMMENDATION_COLORS } from "@/lib/ui/colors";

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
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
  background: "var(--fill)",
  color: "var(--label-secondary)",
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

  const score = assessment.finalOpportunityScore;
  const title = getVehicleTitle(lead);

  return (
    <article
      className="hover-lift opportunity-card"
      style={{
        display: "flex",
        flexWrap: "wrap",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "var(--bg-card)",
        border: "1px solid var(--separator)",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {/* Photo — opens the dossier; wraps above the content on narrow screens */}
      <button
        type="button"
        onClick={() => onOpenDossier(lead)}
        aria-label={`Open dossier for ${title}${isSample ? " (sample data)" : ""}`}
        className="card-photo"
        style={{
          position: "relative",
          flex: "1 1 240px",
          maxWidth: "100%",
          minHeight: 200,
          padding: 0,
          border: "none",
          cursor: "pointer",
          overflow: "hidden",
          background: "var(--bg-surface)",
        }}
      >
        {lead.photo_url ? (
          <Image src={lead.photo_url} alt={title} fill unoptimized sizes="(max-width: 800px) 100vw, 260px" style={{ objectFit: "cover" }} />
        ) : (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              height: "100%",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--label-secondary)",
              background: "linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))",
            }}
          >
            No photo available
          </div>
        )}
        {isSample && (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              borderRadius: 999,
              padding: "3px 9px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "#ffd60a",
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            SAMPLE DATA
          </span>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: "999 1 380px", minWidth: 0, padding: "16px 20px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Header: recommendation + title + score */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                padding: "2px 9px 2px 7px",
                marginBottom: 6,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: recColor,
                background: tone(recColor, 13),
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: recColor }} />
              {assessment.recommendation}
            </span>
            <h3
              title={title}
              className="t-headline"
              style={{ color: "var(--label)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {title}
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", columnGap: 12, rowGap: 4, marginTop: 5, fontSize: 12, color: "var(--label-secondary)" }}>
              {lead.trim && <span>{lead.trim}</span>}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Gauge style={{ width: 13, height: 13 }} />
                {formatMiles(lead.miles)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <MapPin style={{ width: 13, height: 13 }} />
                {locationText || "Location unknown"}
                {lead.distanceMiles !== null && lead.distanceMiles !== undefined && <span> · {formatDistance(lead.distanceMiles)}</span>}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Clock style={{ width: 13, height: 13 }} />
                {formatListingAge(assessment.listingAgeDays)}
              </span>
            </div>
          </div>

          {/* Score ring — tap for the breakdown */}
          <button
            type="button"
            onClick={() => setShowBreakdown((value) => !value)}
            title="Show how this score was computed"
            aria-expanded={showBreakdown}
            aria-controls={breakdownId}
            aria-label={`Spotr score ${score} of 100. ${showBreakdown ? "Hide" : "Show"} breakdown`}
            className="pressable hover-fill"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "6px 8px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <span style={{ position: "relative", width: 50, height: 50, display: "grid", placeItems: "center" }}>
              <svg width="50" height="50" viewBox="0 0 50 50" aria-hidden="true" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
                <circle cx="25" cy="25" r="21" fill="none" stroke="rgba(var(--ink-rgb), 0.1)" strokeWidth="4.5" />
                <motion.circle
                  cx="25"
                  cy="25"
                  r="21"
                  fill="none"
                  stroke={scoreColor(score)}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: Math.max(0, Math.min(score, 100)) / 100 }}
                  viewport={{ once: true }}
                  transition={{ ...spring.smooth, duration: 1 }}
                />
              </svg>
              <span className="tabular" style={{ fontSize: 16, fontWeight: 700, color: "var(--label)" }}>{score}</span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--label-secondary)", display: "inline-flex", alignItems: "center", gap: 2 }}>
              Spotr score
              <motion.span animate={{ rotate: showBreakdown ? 180 : 0 }} transition={spring.snappy} style={{ display: "inline-flex" }}>
                <ChevronDown style={{ width: 11, height: 11 }} />
              </motion.span>
            </span>
          </button>
        </div>

        {/* Why this is interesting */}
        <p style={{ fontSize: 13, color: "var(--label-body)", lineHeight: 1.5 }}>{assessment.recommendationReason}</p>

        {/* Price semantics stay separated: listing asking price vs. Spotr estimates */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 1,
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "var(--separator)",
            border: "1px solid var(--separator)",
          }}
        >
          <PriceCell label="Asking price" caption={isSample ? "Demo listing" : "Listing price"}>
            <span className="tabular" style={{ fontSize: 17, fontWeight: 700, color: "var(--label)" }}>{formatCurrency(lead.price)}</span>
          </PriceCell>
          <PriceCell
            label="Est. retail range"
            caption={assessment.estimatedRange ? SOURCE_LABELS[assessment.estimatedRange.source] : "Spotr estimate"}
            title={assessment.estimatedRange?.note}
          >
            {assessment.estimatedRange ? (
              <span className="tabular" style={{ fontSize: 14, fontWeight: 600, color: "var(--label)" }}>
                {formatCurrency(assessment.estimatedRange.low)} – {formatCurrency(assessment.estimatedRange.high)}
              </span>
            ) : (
              <span style={{ fontSize: 13, color: "var(--label-secondary)" }}>Unavailable — no asking price</span>
            )}
          </PriceCell>
          <PriceCell
            label="Max offer"
            caption={`Spotr estimate${maxOffer.cappedByAcquisitionMax ? " · capped at your max" : ""}`}
            title={maxOffer.status === "ok" ? maxOffer.inputs.conservativeRetail.note : maxOffer.reason ?? undefined}
          >
            {maxOffer.status === "unavailable" ? (
              <span style={{ fontSize: 13, color: "var(--label-secondary)" }}>Unavailable</span>
            ) : maxOffer.status === "below-acquisition-range" ? (
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--yellow)" }} title={`Internal estimate: computed ceiling ${formatCurrency(maxOffer.amount)}`}>
                Below your minimum — investigate only
              </span>
            ) : (
              <span className="tabular" style={{ fontSize: 17, fontWeight: 700, color: "var(--tint-text)" }}>{formatCurrency(maxOffer.amount)}</span>
            )}
          </PriceCell>
        </div>

        {/* Score breakdown (expandable) */}
        <AnimatePresence initial={false}>
          {showBreakdown && (
            <motion.div
              id={breakdownId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring.smooth}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  borderRadius: "var(--radius-md)",
                  background: "var(--fill)",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                <p style={{ fontSize: 12, color: "var(--label-secondary)" }}>
                  Deterministic heuristic — not an AI model or market appraisal.
                </p>
                {assessment.bands.map((band, index) => {
                  const strong = band.points >= band.max * 0.6;
                  return (
                    <div key={band.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                        <span style={{ color: "var(--label-secondary)" }}>
                          <span style={{ fontWeight: 600, color: "var(--label)" }}>{band.label}.</span> {band.detail}
                        </span>
                        <span className="tabular" style={{ fontWeight: 600, flexShrink: 0, color: strong ? "var(--green)" : "var(--label-secondary)" }}>
                          {band.points}/{band.max}
                        </span>
                      </div>
                      <div aria-hidden="true" style={{ height: 3, borderRadius: 999, background: "rgba(var(--ink-rgb), 0.08)", marginTop: 5, overflow: "hidden" }}>
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: band.max > 0 ? band.points / band.max : 0 }}
                          transition={{ ...spring.smooth, delay: 0.05 + index * 0.04 }}
                          style={{ height: "100%", borderRadius: 999, transformOrigin: "left", background: strong ? "var(--green)" : "var(--label-tertiary)" }}
                        />
                      </div>
                    </div>
                  );
                })}
                {assessment.riskFactors.map((risk) => (
                  <div key={risk.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                    <span style={{ color: "var(--label-secondary)" }}>
                      <span style={{ fontWeight: 600, color: "var(--red)" }}>Risk — {risk.label}.</span> {risk.detail}
                    </span>
                    <span className="tabular" style={{ fontWeight: 600, flexShrink: 0, color: "var(--red)" }}>−{risk.points}</span>
                  </div>
                ))}
                <p className="tabular" style={{ fontSize: 12, fontWeight: 600, color: "var(--label)", borderTop: "1px solid var(--separator)", paddingTop: 8 }}>
                  Raw {assessment.rawScoreBeforeRisk} − risk {assessment.riskPenalty} = {score} / 100
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Provenance + fit + confidence */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={chipStyle}>
            <Database style={{ width: 12, height: 12 }} />
            {isSample ? "Synthetic fixture" : lead.source || "Unknown source"}
          </span>
          <span
            style={{ ...chipStyle, ...(buyBoxMatch.excluded ? { color: "var(--red)", background: "rgba(var(--red-rgb), 0.12)" } : {}) }}
            title={buyBoxMatch.reasons.join("; ") || "Meets every configured criterion"}
          >
            <Crosshair style={{ width: 12, height: 12 }} />
            {buyBoxMatch.excluded
              ? "Outside buy box"
              : `Buy box ${buyBoxMatch.fitPoints}/${buyBoxMatch.maxFitPoints}${buyBoxMatch.priority ? ` · ${buyBoxMatch.priority}` : ""}`}
          </span>
          <span
            style={chipStyle}
            title={`Confidence reflects listing data completeness only (${assessment.completeness.present} of ${assessment.completeness.total} key fields present). Heuristic, not statistical.`}
          >
            {assessment.confidenceTier} confidence · {assessment.confidencePercent}% · from data completeness
          </span>
          <span
            style={{ ...chipStyle, ...(assessment.completeness.missing.length > 0 ? { color: "var(--yellow)", background: "rgba(var(--yellow-rgb), 0.12)" } : {}) }}
            title={assessment.completeness.missing.length > 0 ? `Missing: ${assessment.completeness.missing.join(", ")}` : "All key data points present"}
          >
            {assessment.completeness.present}/{assessment.completeness.total} data points
            {assessment.completeness.missing.length > 0 && ` · missing ${assessment.completeness.missing.join(", ")}`}
          </span>
          {isAssigned && (
            <span style={{ ...chipStyle, color: "var(--blue)", background: "rgba(var(--blue-rgb), 0.12)" }}>
              <UserCheck style={{ width: 12, height: 12 }} />
              {lead.assignedTo}
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "auto", paddingTop: 2 }}>
          <button type="button" disabled={busy} onClick={() => onOpenDossier(lead)} className="btn btn-sm btn-primary pressable">
            <FileText style={{ width: 14, height: 14 }} />
            Open dossier
          </button>
          {passedView ? (
            <button type="button" disabled={busy} onClick={() => onAction(lead.id, "unpass")} className="btn btn-sm btn-secondary pressable">
              <Undo2 style={{ width: 14, height: 14 }} />
              Restore to feed
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                aria-pressed={isWatched}
                onClick={() => onAction(lead.id, isWatched ? "unwatch" : "watch")}
                className={`btn btn-sm pressable ${isWatched ? "btn-plain" : "btn-secondary"}`}
                style={isWatched ? { background: "rgba(var(--tint-rgb), 0.14)" } : undefined}
              >
                <motion.span key={String(isWatched)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={spring.bouncy} style={{ display: "inline-flex" }}>
                  <Eye style={{ width: 14, height: 14 }} />
                </motion.span>
                {isWatched ? "Watching" : "Watch"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction(lead.id, isAssigned ? "unassign" : "assign")}
                className="btn btn-sm btn-secondary pressable"
                style={isAssigned ? { color: "var(--blue)", background: "rgba(var(--blue-rgb), 0.12)", borderColor: "transparent" } : undefined}
              >
                <UserPlus style={{ width: 14, height: 14 }} />
                {isAssigned ? "Unassign" : "Assign to me"}
              </button>
              <button type="button" disabled={busy} onClick={() => onAction(lead.id, "pass")} className="btn btn-sm btn-secondary pressable hover-danger">
                <Ban style={{ width: 14, height: 14 }} />
                Pass
              </button>
            </>
          )}
          {isSafeHttpUrl(lead.vdp_url) && (
            <a
              href={lead.vdp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm pressable hover-fill"
              style={{ marginLeft: "auto", color: "var(--label-secondary)" }}
            >
              <ExternalLink style={{ width: 14, height: 14 }} />
              Listing
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function PriceCell({ label, caption, title, children }: { label: string; caption: string; title?: string; children: React.ReactNode }) {
  return (
    <div title={title} style={{ background: "var(--bg-card)", padding: "10px 12px", minWidth: 0 }}>
      <p className="t-eyebrow" style={{ color: "var(--label-secondary)", marginBottom: 4 }}>{label}</p>
      <div>{children}</div>
      <p style={{ fontSize: 11, color: "var(--label-secondary)", marginTop: 2 }}>{caption}</p>
    </div>
  );
}
