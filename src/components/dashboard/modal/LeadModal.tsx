"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Gauge,
  Hash,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import Image from "next/image";
import ChatMock from "./ChatMock";
import CarfaxMock from "./CarfaxMock";
import {
  formatCurrency,
  formatDistance,
  getVehicleTitle,
  isVerifiedListing,
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

interface Lead {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim?: string | null;
  listingTitle: string | null;
  price: number | null;
  miles: number | null;
  distanceMiles: number | null;
  searchZip: string | null;
  searchRadius: number | null;
  city: string | null;
  state: string | null;
  photo_url: string | null;
  stage: string;
  vin: string | null;
  source: string | null;
  vdp_url: string | null;
  sellerName: string | null;
  createdAt: string;
  updatedAt?: string;
}

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
        {Icon && <Icon style={{ width: 14, height: 14, color: "#4a5670" }} />}
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#f0f4ff", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

/** Provenance chip rendered from SourcedValue metadata, never hardcoded copy. */
function SourceTag({ sourced }: { sourced: Pick<SourcedValue, "source" | "note"> }) {
  const colors: Record<string, string> = {
    provider: "#60a5fa",
    heuristic: "#a78bfa",
    "fixture-assumption": "#fbbf24",
    unavailable: "#4a5670",
  };
  const color = colors[sourced.source];
  return (
    <span
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
        cursor: "help",
        whiteSpace: "nowrap",
      }}
    >
      {SOURCE_LABELS[sourced.source]}
    </span>
  );
}

/** Money row in the economics table: value + provenance + assumption note. */
function MoneyRow({ label, sourced, strong }: { label: string; sourced: SourcedValue; strong?: boolean }) {
  return (
    <DetailRow
      label={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {label}
          <SourceTag sourced={sourced} />
        </span>
      }
      value={
        sourced.value === null ? (
          <span style={{ color: "#8b9ab8" }} title={sourced.note}>
            Unavailable
          </span>
        ) : (
          <span style={{ fontSize: strong ? 15 : 13, fontWeight: strong ? 900 : 600 }} title={sourced.note}>
            {formatCurrency(sourced.value)}
          </span>
        )
      }
    />
  );
}

export default function LeadModal({
  lead,
  onClose,
  assessment: assessmentProp,
}: {
  lead: Lead;
  onClose: () => void;
  /** Server-computed assessment (feed); when absent the modal computes one. */
  assessment?: OpportunityAssessment;
}) {
  const [activeTab, setActiveTab] = useState<"decision" | "chat" | "carfax">("decision");
  const [assessment, setAssessment] = useState<OpportunityAssessment | null>(assessmentProp ?? null);
  const [buyBoxNote, setBuyBoxNote] = useState<string | null>(null);

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

  return (
    /* Backdrop */
    <div
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
          {(["decision", "chat", "carfax"] as const).map((tab) => {
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
                  color: active ? "#ff9147" : "#4a5670",
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${active ? "#ff7a1a" : "transparent"}`,
                  cursor: "pointer",
                  transition: "color 0.15s",
                  marginBottom: -1,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#8b9ab8"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "#4a5670"; }}
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
                gridTemplateColumns: "1fr 1fr",
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#8b9ab8", fontSize: 13 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,122,26,0.2)", borderTopColor: "#ff7a1a", animation: "spin 0.8s linear infinite" }} />
                    Assessing against your buy box…
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                      <div style={{ minWidth: 0, flex: "1 1 320px" }}>
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
                      </div>
                      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                        {[
                          {
                            label: "Score",
                            value: String(assessment.finalOpportunityScore),
                            sub: `raw ${assessment.rawScoreBeforeRisk} − risk ${assessment.riskPenalty}`,
                            color: "#f0f4ff",
                          },
                          {
                            label: "Confidence",
                            value: `${assessment.confidencePercent}%`,
                            sub: `${assessment.confidenceTier} · data completeness`,
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
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#4a5670", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</p>
                            <p style={{ fontSize: 18, fontWeight: 900, color }}>{value}</p>
                            <p style={{ fontSize: 10, color: "#8b9ab8", marginTop: 2 }}>{sub}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
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
                      color: "#4a5670",
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
                <DetailRow
                  label="Mileage"
                  value={lead.miles ? `${new Intl.NumberFormat("en-US").format(lead.miles)} mi` : "Unknown"}
                  icon={Gauge}
                />
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
                {lead.vdp_url && lead.vdp_url !== "#" && (
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
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "#f0f4ff", marginBottom: 2 }}>
                    Acquisition economics
                  </h3>
                  <p style={{ fontSize: 12, color: "#8b9ab8", marginBottom: 12 }}>
                    Planning figures from stated assumptions — not guarantees. Hover any tag for the assumption behind the number.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                    {/* Offer math */}
                    <div>
                      <MoneyRow label="Asking price" sourced={assessment.askingPrice} strong />
                      {assessment.estimatedRange ? (
                        <DetailRow
                          label={
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              Est. retail range
                              <SourceTag sourced={assessment.estimatedRange} />
                            </span>
                          }
                          value={
                            <span title={assessment.estimatedRange.note}>
                              {formatCurrency(assessment.estimatedRange.low)} – {formatCurrency(assessment.estimatedRange.high)}
                            </span>
                          }
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
                              Below configured acquisition range — investigate only
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
                                title={scenario.description}
                                style={{
                                  borderRadius: 10,
                                  padding: "10px 14px",
                                  background: "rgba(255,255,255,0.03)",
                                  border: "1px solid rgba(255,255,255,0.07)",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: "#f0f4ff" }}>{scenario.name}</span>
                                  <span style={{ fontSize: 15, fontWeight: 900, color: gross >= 0 ? "#34d399" : "#f87171" }} title={scenario.projectedGross.note}>
                                    {gross >= 0 ? "+" : "−"}{formatCurrency(Math.abs(gross))} gross
                                  </span>
                                </div>
                                <p style={{ fontSize: 11.5, color: "#8b9ab8", marginTop: 3 }}>
                                  Retail {formatCurrency(scenario.retail.value)} · all-in {formatCurrency(scenario.allIn.value)}
                                </p>
                                <p style={{ fontSize: 10.5, color: "#4a5670", marginTop: 2 }}>{scenario.description}</p>
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
                    <p style={{ fontSize: 13, color: "#8b9ab8" }}>
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
                      <p style={{ fontSize: 12, color: "#4a5670" }}>
                        Condition and title status are never inferred — verify by inspection and history report before an offer.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "chat" && <ChatMock leadId={lead.id} sellerName={lead.sellerName} />}
          {activeTab === "carfax" && <CarfaxMock vdpUrl={lead.vdp_url} source={lead.source} />}
        </div>
      </div>
    </div>
  );
}
