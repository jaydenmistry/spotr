"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  Ban,
  Clock,
  Eye,
  ExternalLink,
  Gauge,
  Hash,
  MapPin,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import Image from "next/image";
import ChatMock from "./ChatMock";
import CarfaxMock from "./CarfaxMock";
import {
  formatCurrency,
  formatDistance,
  formatMiles,
  getVehicleTitle,
  isVerifiedListing,
  type LeadRecord,
} from "@/lib/vehicleAnalytics";
import {
  getOpportunityAssessment,
  isFixtureLead,
  SOURCE_LABELS,
  type OpportunityAssessment,
  type Recommendation,
  type SourcedValue,
} from "@/lib/opportunity";
import { DEFAULT_BUY_BOX, type BuyBoxConfig } from "@/lib/buyBox";
import type { FeedAction } from "@/lib/feedActions";
import { isSafeHttpUrl } from "@/lib/url";
import { outcomeReasonLabel, parseActivityDetail, type ActivityRecord } from "@/lib/followUp";
import ActivityTimeline from "./ActivityTimeline";
import FollowUpPanel from "./FollowUpPanel";
import RecordOfferForm from "./RecordOfferForm";

const RECOMMENDATION_COLORS: Record<Recommendation, string> = {
  BUY: "#34d399",
  INVESTIGATE: "#fbbf24",
  WATCH: "#60a5fa",
  PASS: "#8b9ab8",
};

const RISK_COLORS: Record<string, string> = {
  Low: "#34d399",
  Medium: "#fbbf24",
  High: "#f87171",
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

/* Reusable row for detail tables */
function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        gap: 12,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 13,
          color: "#8b9ab8",
          flexShrink: 0,
        }}
      >
        {Icon && <Icon style={{ width: 14, height: 14, color: "#8b9ab8" }} />}
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#f0f4ff", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

/**
 * Provenance chip rendered from SourcedValue metadata, never hardcoded copy.
 * A real button: clicking (or keyboard-activating) it toggles the assumption
 * note inline, so the explanation is not hover-only.
 */
function SourceTag({
  sourced,
  expanded,
  onToggle,
}: {
  sourced: Pick<SourcedValue, "source" | "note">;
  expanded: boolean;
  onToggle: () => void;
}) {
  const colors: Record<string, string> = {
    provider: "#60a5fa",
    heuristic: "#a78bfa",
    "fixture-assumption": "#fbbf24",
    unavailable: "#8b9ab8",
  };
  const color = colors[sourced.source];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      title={sourced.note}
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 5,
        padding: "1px 6px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        color,
        background: `${color}14`,
        border: `1px solid ${color}40`,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {SOURCE_LABELS[sourced.source]}
    </button>
  );
}

/** Money row in the economics table: value + provenance + toggleable note. */
function MoneyRow({ label, sourced, strong }: { label: string; sourced: SourcedValue; strong?: boolean }) {
  const [showNote, setShowNote] = useState(false);
  return (
    <div>
      <DetailRow
        label={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {label}
            <SourceTag sourced={sourced} expanded={showNote} onToggle={() => setShowNote((v) => !v)} />
          </span>
        }
        value={
          sourced.value === null ? (
            <span style={{ color: "#8b9ab8" }}>Unavailable</span>
          ) : (
            <span style={{ fontSize: strong ? 15 : 13, fontWeight: strong ? 900 : 600 }}>
              {formatCurrency(sourced.value)}
            </span>
          )
        }
      />
      {showNote && (
        <p style={{ padding: "6px 0 8px", fontSize: 11.5, color: "#8b9ab8", lineHeight: 1.5, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {sourced.note}
        </p>
      )}
    </div>
  );
}

export default function LeadModal({
  lead: leadProp,
  onClose,
  assessment: assessmentProp,
  buyBoxPersisted,
  onAction,
  actionBusy = false,
  onLeadUpdated,
}: {
  lead: LeadRecord;
  onClose: () => void;
  /** Server-computed assessment (feed); when absent the modal computes one. */
  assessment?: OpportunityAssessment;
  /** Whether a saved buy box backs the provided assessment (feed knows this). */
  buyBoxPersisted?: boolean;
  /** When provided, the dossier can act directly (watch/assign/pass). */
  onAction?: (leadId: string, action: FeedAction) => void;
  actionBusy?: boolean;
  /** Notifies the parent when follow-up edits change the lead. */
  onLeadUpdated?: (lead: LeadRecord) => void;
}) {
  const [activeTab, setActiveTab] = useState<"decision" | "activity" | "chat" | "carfax">("decision");
  // Local overlay so follow-up edits render immediately; re-synced whenever
  // the parent hands down a fresh lead (adjust-during-render pattern).
  const [lead, setLead] = useState(leadProp);
  const [activityReload, setActivityReload] = useState(0);
  const [prevLeadProp, setPrevLeadProp] = useState(leadProp);
  if (leadProp !== prevLeadProp) {
    setPrevLeadProp(leadProp);
    setLead(leadProp);
    // Parent-driven changes (watch/pass/assign) also write activities.
    setActivityReload((value) => value + 1);
  }

  const handleLeadUpdated = (updated: LeadRecord) => {
    setLead((prev) => ({ ...prev, ...updated }));
    setActivityReload((value) => value + 1);
    onLeadUpdated?.(updated);
  };

  const panelRef = useRef<HTMLDivElement>(null);

  // Dialog semantics: focus the panel on open, close on Escape. When a
  // nested dialog (e.g. the pass-reason prompt) has focus, Escape belongs
  // to it — the dossier stays open.
  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target instanceof Element ? event.target : null;
      const enclosingDialog = target?.closest('[role="dialog"]');
      if (enclosingDialog && enclosingDialog !== panelRef.current?.parentElement) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The buyer's most recent recorded offer (a real buyer action, distinct
  // from Spotr's heuristic max offer) — read from the activity trail so it
  // survives closing/reopening the dossier.
  const [lastOffer, setLastOffer] = useState<{ amountUsd: number; at: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    axios
      .get<{ activities: ActivityRecord[] }>("/api/leads/activity", { params: { leadId: lead.id } })
      .then((res) => {
        if (cancelled) return;
        const offer = res.data.activities.find((entry) => entry.type === "offer_recorded");
        const amountUsd = offer ? parseActivityDetail(offer.detail)?.amountUsd : null;
        setLastOffer(
          offer && typeof amountUsd === "number" ? { amountUsd, at: offer.createdAt } : null
        );
      })
      .catch(() => {
        if (!cancelled) setLastOffer(null);
      });
    return () => {
      cancelled = true;
    };
  }, [lead.id, activityReload]);
  const [assessment, setAssessment] = useState<OpportunityAssessment | null>(assessmentProp ?? null);
  const [buyBoxNote, setBuyBoxNote] = useState<string | null>(
    assessmentProp && buyBoxPersisted === false
      ? "No saved buy box — assessed against default settings."
      : null
  );

  // Keep in sync when the parent refreshes the assessment (e.g. after
  // actions) — adjust during render instead of in an effect.
  const [prevAssessmentProp, setPrevAssessmentProp] = useState(assessmentProp);
  if (assessmentProp !== prevAssessmentProp) {
    setPrevAssessmentProp(assessmentProp);
    if (assessmentProp) setAssessment(assessmentProp);
  }

  // Dossier entry points outside the feed (kanban, inventory) compute the
  // assessment client-side against the saved buy box; same pure function the
  // feed API uses, so results can't drift.
  useEffect(() => {
    if (assessmentProp) return;
    let cancelled = false;
    axios
      .get<{ config: BuyBoxConfig; persisted: boolean }>("/api/buybox")
      .then((res) => {
        if (cancelled) return;
        setAssessment(getOpportunityAssessment(lead, res.data.config));
        if (!res.data.persisted) {
          setBuyBoxNote("No saved buy box — assessed against default settings.");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAssessment(getOpportunityAssessment(lead, DEFAULT_BUY_BOX));
        setBuyBoxNote("Couldn't load your buy box — assessed against default settings.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, assessmentProp]);

  const verified = isVerifiedListing(lead);
  const fixture = isFixtureLead(lead);
  const recColor = assessment ? RECOMMENDATION_COLORS[assessment.recommendation] : "#8b9ab8";
  const isWatched = Boolean(lead.watchedAt);
  const isAssigned = Boolean(lead.assignedTo);

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${getVehicleTitle(lead)} dossier`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "90vh",
          width: "100%",
          maxWidth: 900,
          borderRadius: 20,
          overflow: "hidden",
          background: "var(--bg-surface)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          outline: "none",
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: "-0.01em",
                color: "#f0f4ff",
              }}
            >
              {getVehicleTitle(lead)}
              {fixture && (
                <span
                  style={{
                    borderRadius: 6,
                    padding: "2px 7px",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    color: "#fbbf24",
                    background: "rgba(251,191,36,0.15)",
                    border: "1px solid rgba(251,191,36,0.5)",
                  }}
                >
                  SAMPLE DATA
                </span>
              )}
            </h2>
            <p style={{ fontSize: 13, color: "#8b9ab8", marginTop: 2 }}>
              {[lead.city, lead.state].filter(Boolean).join(", ") || "Location unknown"} · {formatDistance(lead.distanceMiles)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dossier"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              color: "#8b9ab8",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.15)";
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "#8b9ab8";
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            padding: "0 24px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          {(["decision", "activity", "chat", "carfax"] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "13px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "capitalize",
                  color: active ? "#ff9147" : "#8b9ab8",
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${active ? "#ff7a1a" : "transparent"}`,
                  cursor: "pointer",
                  transition: "color 0.15s",
                  marginBottom: -1,
                }}
              >
                {tab === "decision" ? "Decision" : tab}
              </button>
            );
          })}
        </div>

        {/* ── Content ────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {activeTab === "decision" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {/* ── A. Decision header ─────────────────────── */}
              <div
                style={{
                  gridColumn: "1 / -1",
                  background: "var(--bg-card)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  border: `1px solid ${assessment ? `${recColor}40` : "rgba(255,255,255,0.07)"}`,
                }}
              >
                {!assessment ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#8b9ab8", fontSize: 13, minHeight: 96 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,122,26,0.2)", borderTopColor: "#ff7a1a", animation: "spin 0.8s linear infinite" }} />
                    Assessing against your buy box…
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
                      <div style={{ minWidth: 0, flex: "1 1 300px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span
                            style={{
                              borderRadius: 8,
                              padding: "4px 12px",
                              fontSize: 14,
                              fontWeight: 900,
                              letterSpacing: "0.05em",
                              color: recColor,
                              background: `${recColor}1a`,
                              border: `1px solid ${recColor}55`,
                            }}
                          >
                            {assessment.recommendation}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#8b9ab8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Spotr heuristic recommendation
                          </span>
                        </div>
                        <p style={{ fontSize: 13.5, color: "#c6d0e2", lineHeight: 1.55 }}>{assessment.recommendationReason}</p>
                        {buyBoxNote && (
                          <p style={{ fontSize: 12, color: "#fbbf24", marginTop: 6 }}>{buyBoxNote}</p>
                        )}
                        {onAction && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                            <button
                              disabled={actionBusy}
                              onClick={() => onAction(lead.id, isWatched ? "unwatch" : "watch")}
                              style={{
                                ...actionButtonStyle,
                                ...(isWatched
                                  ? { background: "rgba(255,122,26,0.15)", borderColor: "rgba(255,122,26,0.5)", color: "#ff9147" }
                                  : {}),
                              }}
                            >
                              <Eye style={{ width: 14, height: 14 }} />
                              {isWatched ? "Watching" : "Watch"}
                            </button>
                            <button
                              disabled={actionBusy}
                              onClick={() => onAction(lead.id, isAssigned ? "unassign" : "assign")}
                              style={{
                                ...actionButtonStyle,
                                ...(isAssigned
                                  ? { background: "rgba(96,165,250,0.12)", borderColor: "rgba(96,165,250,0.45)", color: "#60a5fa" }
                                  : {}),
                              }}
                            >
                              <UserPlus style={{ width: 14, height: 14 }} />
                              {isAssigned ? "Unassign" : "Assign to me"}
                            </button>
                            <button
                              disabled={actionBusy}
                              onClick={() => onAction(lead.id, "pass")}
                              style={{ ...actionButtonStyle, color: "#f87171", borderColor: "rgba(248,113,113,0.35)" }}
                            >
                              <Ban style={{ width: 14, height: 14 }} />
                              Pass
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flexShrink: 0 }}>
                        {[
                          {
                            label: "Asking",
                            value: lead.price ? formatCurrency(lead.price) : "—",
                            sub: fixture ? "demo listing" : "provider data",
                            color: "#f0f4ff",
                          },
                          {
                            label: "Max offer",
                            value:
                              assessment.maxOffer.status === "ok"
                                ? formatCurrency(assessment.maxOffer.amount)
                                : assessment.maxOffer.status === "below-acquisition-range"
                                ? "Below min"
                                : "—",
                            sub: "Spotr heuristic",
                            color: assessment.maxOffer.status === "ok" ? "#ff9147" : "#fbbf24",
                          },
                          {
                            label: "Your last offer",
                            value: lastOffer ? formatCurrency(lastOffer.amountUsd) : "—",
                            sub: lastOffer
                              ? `buyer-recorded · ${new Date(lastOffer.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                              : "none recorded",
                            color: lastOffer ? "#34d399" : "#8b9ab8",
                          },
                          {
                            label: "Score",
                            value: String(assessment.finalOpportunityScore),
                            sub: `raw ${assessment.rawScoreBeforeRisk} − risk ${assessment.riskPenalty}`,
                            color: "#f0f4ff",
                          },
                          {
                            label: "Confidence",
                            value: `${assessment.confidencePercent}%`,
                            sub: `${assessment.confidenceTier} · completeness`,
                            color: "#f0f4ff",
                          },
                          {
                            label: "Risk",
                            value: assessment.riskLevel,
                            sub: assessment.riskFactors.length > 0 ? `${assessment.riskFactors.length} flag${assessment.riskFactors.length === 1 ? "" : "s"}` : "no flags",
                            color: RISK_COLORS[assessment.riskLevel],
                          },
                        ].map(({ label, value, sub, color }) => (
                          <div key={label} style={{ textAlign: "center", borderRadius: 10, padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#8b9ab8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</p>
                            <p style={{ fontSize: 18, fontWeight: 900, color }}>{value}</p>
                            <p style={{ fontSize: 10, color: "#8b9ab8", marginTop: 2 }}>{sub}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Outcome banner: why this lead was Passed / marked Lost */}
              {lead.outcomeReason && (lead.passedAt || lead.stage === "Lost") && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    borderRadius: 12,
                    border: "1px solid rgba(248,113,113,0.3)",
                    background: "rgba(248,113,113,0.07)",
                    padding: "12px 16px",
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>
                    {lead.passedAt ? "Passed" : "Lost"} — {outcomeReasonLabel(lead.outcomeReason)}
                  </p>
                  {lead.outcomeNote && (
                    <p style={{ fontSize: 12, color: "#c6d0e2", marginTop: 4 }}>“{lead.outcomeNote}”</p>
                  )}
                </div>
              )}

              {/* Follow-up + offer logging */}
              <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                <FollowUpPanel lead={lead} onLeadUpdated={handleLeadUpdated} />
                <RecordOfferForm
                  leadId={lead.id}
                  recommendedMaxOfferLabel={
                    assessment?.maxOffer.status === "ok" ? formatCurrency(assessment.maxOffer.amount) : null
                  }
                  onRecorded={() => setActivityReload((value) => value + 1)}
                />
              </div>

              {/* Photo */}
              <div
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  position: "relative",
                  height: 220,
                  background: "#0f1520",
                }}
              >
                {lead.photo_url ? (
                  <Image
                    src={lead.photo_url}
                    alt={getVehicleTitle(lead)}
                    fill
                    unoptimized
                    sizes="450px"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      height: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#8b9ab8",
                    }}
                  >
                    No photo available
                  </div>
                )}
              </div>

              {/* Vehicle info panel */}
              <div
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 14,
                  padding: "16px 18px",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#ff9147",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 4,
                  }}
                >
                  Vehicle
                </h3>
                <DetailRow label="Listing" value={getVehicleTitle(lead)} />
                <DetailRow label="VIN" value={lead.vin || "Not supplied"} icon={Hash} />
                <DetailRow label="Trim" value={lead.trim || "Unknown"} />
                <DetailRow label="Mileage" value={formatMiles(lead.miles)} icon={Gauge} />
                <DetailRow
                  label="Location"
                  value={[lead.city, lead.state].filter(Boolean).join(", ") || "Unknown"}
                  icon={MapPin}
                />
                <DetailRow label="Distance" value={formatDistance(lead.distanceMiles)} />
              </div>

              {/* Source & freshness panel */}
              <div
                style={{
                  gridColumn: "1 / -1",
                  background: "var(--bg-card)",
                  borderRadius: 14,
                  padding: "16px 18px",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#ff9147",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 4,
                  }}
                >
                  Source & freshness
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", columnGap: 24 }}>
                  <DetailRow
                    label="Source"
                    value={fixture ? "Synthetic fixture (demo)" : lead.source || "Unknown"}
                  />
                  <DetailRow
                    label="Verification"
                    value={
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          borderRadius: 100,
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          background: verified ? "rgba(52,211,153,0.15)" : "rgba(255,122,26,0.12)",
                          color: verified ? "#34d399" : "#ff9147",
                        }}
                      >
                        <ShieldCheck style={{ width: 11, height: 11 }} />
                        {verified ? "Live link + VIN" : "Needs source check"}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Found by Spotr"
                    icon={Clock}
                    value={
                      assessment
                        ? assessment.listingAgeDays === 0
                          ? "Today"
                          : `${assessment.listingAgeDays} day${assessment.listingAgeDays === 1 ? "" : "s"} ago (ingestion date)`
                        : "—"
                    }
                  />
                  <DetailRow label="Seller" value={lead.sellerName || "Private Party"} />
                </div>
                {isSafeHttpUrl(lead.vdp_url) && (
                  <div style={{ paddingTop: 10 }}>
                    <a
                      href={lead.vdp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#ff9147",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                    >
                      View Original Listing <ExternalLink style={{ width: 13, height: 13 }} />
                    </a>
                  </div>
                )}
              </div>

              {/* ── B. Acquisition economics ───────────────── */}
              {!assessment ? (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    background: "var(--bg-card)",
                    borderRadius: 14,
                    padding: "18px 20px",
                    border: "1px solid rgba(255,255,255,0.07)",
                    minHeight: 320,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8b9ab8",
                    fontSize: 13,
                  }}
                >
                  Economics and risk assessment load once the buy box is available…
                </div>
              ) : (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    background: "var(--bg-card)",
                    borderRadius: 14,
                    padding: "18px 20px",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "#f0f4ff", marginBottom: 2 }}>
                    Acquisition economics
                  </h3>
                  <p style={{ fontSize: 12, color: "#8b9ab8", marginBottom: 12 }}>
                    Planning figures from stated assumptions — not guarantees. Click any source tag for the assumption behind the number.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                    {/* Offer math */}
                    <div>
                      <MoneyRow label="Asking price" sourced={assessment.askingPrice} strong />
                      {assessment.estimatedRange ? (
                        <MoneyRow
                          label="Est. retail (low end)"
                          sourced={{
                            value: assessment.estimatedRange.low,
                            source: assessment.estimatedRange.source,
                            note: `${assessment.estimatedRange.note} Full band: ${formatCurrency(assessment.estimatedRange.low)} – ${formatCurrency(assessment.estimatedRange.high)} (midpoint ${formatCurrency(assessment.estimatedRange.mid)}).`,
                          }}
                        />
                      ) : (
                        <DetailRow label="Est. retail range" value={<span style={{ color: "#8b9ab8" }}>Unavailable — no asking price</span>} />
                      )}
                      <MoneyRow label="Reconditioning" sourced={assessment.maxOffer.inputs.recon} />
                      <MoneyRow label="Transport / fees" sourced={assessment.maxOffer.inputs.transport} />
                      <MoneyRow label="Uncertainty buffer" sourced={assessment.maxOffer.inputs.uncertaintyBuffer} />
                      <MoneyRow label="Target gross (planning)" sourced={assessment.maxOffer.inputs.targetGross} />

                      {/* Max offer callout */}
                      <div
                        style={{
                          marginTop: 12,
                          borderRadius: 10,
                          padding: "12px 14px",
                          background:
                            assessment.maxOffer.status === "ok"
                              ? "rgba(255,122,26,0.08)"
                              : assessment.maxOffer.status === "below-acquisition-range"
                              ? "rgba(251,191,36,0.08)"
                              : "rgba(255,255,255,0.03)",
                          border: `1px solid ${
                            assessment.maxOffer.status === "ok"
                              ? "rgba(255,122,26,0.3)"
                              : assessment.maxOffer.status === "below-acquisition-range"
                              ? "rgba(251,191,36,0.35)"
                              : "rgba(255,255,255,0.08)"
                          }`,
                        }}
                      >
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#8b9ab8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                          Recommended max offer · Spotr heuristic
                        </p>
                        {assessment.maxOffer.status === "unavailable" ? (
                          <p style={{ fontSize: 12.5, color: "#8b9ab8", lineHeight: 1.5 }}>{assessment.maxOffer.reason}</p>
                        ) : assessment.maxOffer.status === "below-acquisition-range" ? (
                          <>
                            <p style={{ fontSize: 14, fontWeight: 800, color: "#fbbf24" }}>
                              Offer ceiling below your minimum acquisition price — investigate only
                            </p>
                            <p style={{ fontSize: 12, color: "#8b9ab8", marginTop: 3 }}>
                              Internal estimate of the ceiling: {formatCurrency(assessment.maxOffer.amount)} (under your configured minimum).
                            </p>
                          </>
                        ) : (
                          <>
                            <p style={{ fontSize: 22, fontWeight: 900, color: "#ff9147" }}>
                              {formatCurrency(assessment.maxOffer.amount)}
                              {assessment.maxOffer.cappedByAcquisitionMax && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#8b9ab8", marginLeft: 8 }}>capped at your configured max</span>
                              )}
                            </p>
                            <p style={{ fontSize: 11.5, color: "#8b9ab8", marginTop: 3, lineHeight: 1.5 }}>
                              Conservative retail (low end) − target gross − recon − transport − buffer. Built to protect the gross target under the stated assumptions.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Scenarios */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#8b9ab8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                        Scenarios (buying at asking)
                      </p>
                      {assessment.scenarios.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: "#8b9ab8" }}>
                          Scenario projections need an asking price.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {assessment.scenarios.map((scenario) => {
                            const gross = scenario.projectedGross.value ?? 0;
                            return (
                              <div
                                key={scenario.name}
                                style={{
                                  borderRadius: 10,
                                  padding: "10px 14px",
                                  background: "rgba(255,255,255,0.03)",
                                  border: "1px solid rgba(255,255,255,0.07)",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: "#f0f4ff" }}>{scenario.name}</span>
                                  <span style={{ fontSize: 15, fontWeight: 900, color: gross >= 0 ? "#34d399" : "#f87171" }}>
                                    {gross >= 0 ? "+" : "−"}{formatCurrency(Math.abs(gross))} gross
                                  </span>
                                </div>
                                <p style={{ fontSize: 11.5, color: "#8b9ab8", marginTop: 3 }}>
                                  Retail {formatCurrency(scenario.retail.value)} · all-in {formatCurrency(scenario.allIn.value)}
                                </p>
                                <p style={{ fontSize: 10.5, color: "#8b9ab8", marginTop: 2 }}>{scenario.description}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── E. Risks & data gaps ───────────────────── */}
              {assessment && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    background: "var(--bg-card)",
                    borderRadius: 14,
                    padding: "18px 20px",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "#f0f4ff", marginBottom: 10 }}>
                    <AlertTriangle style={{ width: 15, height: 15, color: "#fbbf24" }} />
                    Risks & data gaps
                  </h3>
                  {assessment.riskFactors.length === 0 && assessment.completeness.missing.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#c6d0e2" }}>
                      No risk flags and no missing key fields. Condition and title status still require inspection — Spotr has no data for either.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {assessment.riskFactors.map((risk) => (
                        <div key={risk.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                          <span style={{ color: "#c6d0e2" }}>
                            <span style={{ fontWeight: 700, color: "#f87171" }}>{risk.label}.</span> {risk.detail}
                          </span>
                          <span style={{ fontWeight: 800, flexShrink: 0, color: "#f87171" }}>−{risk.points} pts</span>
                        </div>
                      ))}
                      {assessment.completeness.missing.length > 0 && (
                        <p style={{ fontSize: 13, color: "#c6d0e2" }}>
                          <span style={{ fontWeight: 700, color: "#fbbf24" }}>Missing data.</span>{" "}
                          {assessment.completeness.missing.join(", ")} — treated as uncertainty, lowering confidence to {assessment.confidencePercent}%.
                        </p>
                      )}
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: "#8b9ab8" }}>
                        Condition and title status are never inferred — verify by inspection and history report before an offer.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div style={{ maxWidth: 640 }}>
              <ActivityTimeline leadId={lead.id} reloadKey={activityReload} />
            </div>
          )}
          {activeTab === "chat" && <ChatMock leadId={lead.id} sellerName={lead.sellerName} />}
          {activeTab === "carfax" && <CarfaxMock vdpUrl={lead.vdp_url} source={lead.source} />}
        </div>
      </div>
    </div>
  );
}
