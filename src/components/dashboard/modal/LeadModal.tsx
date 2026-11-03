"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
  type LucideIcon,
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
import { assignToggle, type Viewer } from "@/lib/leadAssignee";
import { safePhotoUrl, isSafeHttpUrl } from "@/lib/url";
import { outcomeReasonLabel, parseActivityDetail, type ActivityRecord } from "@/lib/followUp";
import ActivityTimeline from "./ActivityTimeline";
import FollowUpPanel from "./FollowUpPanel";
import RecordOfferForm from "./RecordOfferForm";
import { Sheet } from "@/components/ui/Sheet";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { RECOMMENDATION_COLORS, RISK_COLORS, scoreColor, tone } from "@/lib/ui/colors";
import { listContainer, listItem, spring } from "@/lib/motion";

type DossierTab = "decision" | "activity" | "chat" | "history";

const TABS: { value: DossierTab; label: string }[] = [
  { value: "decision", label: "Decision" },
  { value: "activity", label: "Activity" },
  { value: "chat", label: "Practice chat" },
  { value: "history", label: "History" },
];

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
        minHeight: 42,
        padding: "10px 0",
        borderBottom: "1px solid var(--separator)",
        gap: 12,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 13,
          color: "var(--label-secondary)",
          flexShrink: 0,
        }}
      >
        {Icon && <Icon style={{ width: 15, height: 15, color: "var(--label-tertiary)" }} />}
        {label}
      </span>
      <span className="tabular" style={{ fontSize: 13, fontWeight: 500, color: "var(--label)", textAlign: "right" }}>
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
    provider: "var(--blue)",
    heuristic: "var(--purple)",
    "fixture-assumption": "var(--yellow)",
    unavailable: "var(--label-secondary)",
  };
  const color = colors[sourced.source];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      title={sourced.note}
      className="pressable"
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "1px 8px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        color,
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
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
            <span style={{ color: "var(--label-secondary)" }}>Unavailable</span>
          ) : (
            <span style={{ fontSize: strong ? 15 : 13, fontWeight: strong ? 700 : 500 }}>
              {formatCurrency(sourced.value)}
            </span>
          )
        }
      />
      <AnimatePresence initial={false}>
        {showNote && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.snappy}
            style={{ overflow: "hidden", fontSize: 12, color: "var(--label-secondary)", lineHeight: 1.5, borderBottom: "1px solid var(--separator)" }}
          >
            <span style={{ display: "block", padding: "6px 0 10px" }}>{sourced.note}</span>
          </motion.p>
        )}
      </AnimatePresence>
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
  viewer,
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
  /** Signed-in user; decides which assign action the dossier offers. */
  viewer?: Viewer;
}) {
  const [activeTab, setActiveTab] = useState<DossierTab>("decision");
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

  // Tab content slides in from the side of the tab you moved toward.
  const [tabDirection, setTabDirection] = useState(1);
  const selectTab = (next: DossierTab) => {
    const order = TABS.map((t) => t.value);
    setTabDirection(order.indexOf(next) >= order.indexOf(activeTab) ? 1 : -1);
    setActiveTab(next);
  };

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
  const recColor = assessment ? RECOMMENDATION_COLORS[assessment.recommendation] : "var(--label-secondary)";
  const isWatched = Boolean(lead.watchedAt);
  const assign = assignToggle(lead.assignedTo, viewer);

  const title = getVehicleTitle(lead);
  const photoUrl = safePhotoUrl(lead.photo_url);
  const maxOfferOk = assessment?.maxOffer.status === "ok";

  return (
    <Sheet
      onClose={onClose}
      ariaLabel={`${title} dossier`}
      closeLabel="Close dossier"
      header={
        <>
          <div style={{ padding: "8px 72px 14px 24px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <h2 className="t-title2" style={{ color: "var(--label)" }}>
                {title}
              </h2>
              {fixture && <SampleBadge />}
            </div>
            <p className="t-footnote" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, color: "var(--label-secondary)", marginTop: 4 }}>
              <MapPin style={{ width: 13, height: 13 }} aria-hidden="true" />
              {[lead.city, lead.state].filter(Boolean).join(", ") || "Location unknown"}
              <Dot />
              {formatDistance(lead.distanceMiles)}
              <Dot />
              {fixture ? "Synthetic fixture" : lead.source || "Unknown source"}
            </p>
          </div>
        </>
      }
      toolbar={
        <div style={{ padding: "0 24px 14px", overflowX: "auto" }}>
          <SegmentedControl
            role="tabs"
            ariaLabel="Dossier sections"
            idPrefix="dossier-tab"
            segments={TABS}
            value={activeTab}
            onChange={selectTab}
          />
        </div>
      }
    >
      <AnimatePresence mode="wait" initial={false} custom={tabDirection}>
        <motion.div
          key={activeTab}
          custom={tabDirection}
          variants={{
            enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
            center: { opacity: 1, x: 0 },
            exit: (dir: number) => ({ opacity: 0, x: dir * -28 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ ...spring.snappy, opacity: { duration: 0.16 } }}
          role="tabpanel"
          id="dossier-tab-panel"
          aria-labelledby={`dossier-tab-${activeTab}`}
          style={{ padding: 24 }}
        >
          {activeTab === "decision" && (
            <motion.div
              variants={listContainer}
              initial="hidden"
              animate="show"
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              {/* ── Photo + decision ─────────────────────────── */}
              <motion.div
                variants={listItem}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}
              >
                <div
                  style={{
                    position: "relative",
                    minHeight: 240,
                    borderRadius: "var(--radius-lg)",
                    overflow: "hidden",
                    background: "var(--bg-card)",
                    border: "1px solid var(--separator)",
                  }}
                >
                  {photoUrl ? (
                    <motion.div
                      initial={{ scale: 1.08, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ ...spring.smooth, duration: 0.8 }}
                      style={{ position: "absolute", inset: 0 }}
                    >
                      <Image src={photoUrl} referrerPolicy="no-referrer" alt={title} fill unoptimized sizes="500px" style={{ objectFit: "cover" }} />
                    </motion.div>
                  ) : (
                    <div style={{ display: "grid", placeItems: "center", height: "100%", minHeight: 240, color: "var(--label-secondary)", fontSize: 13, fontWeight: 500 }}>
                      No photo available
                    </div>
                  )}
                </div>

                <SectionCard accent={assessment ? recColor : undefined}>
                  {!assessment ? (
                    <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 180 }}>
                      <span className="t-footnote" style={{ color: "var(--label-secondary)" }}>Assessing against your buy box…</span>
                      <div className="skeleton" style={{ width: 120, height: 30, borderRadius: 999 }} />
                      <div className="skeleton" style={{ height: 14 }} />
                      <div className="skeleton" style={{ width: "70%", height: 14 }} />
                    </div>
                  ) : (
                    <>
                      <p className="t-eyebrow" style={{ color: "var(--label-secondary)", marginBottom: 10 }}>
                        Spotr heuristic recommendation
                      </p>
                      <motion.span
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ ...spring.bouncy, delay: 0.12 }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          borderRadius: 999,
                          padding: "6px 14px 6px 10px",
                          fontSize: 15,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          color: recColor,
                          background: tone(recColor, 14),
                          boxShadow: `inset 0 0 0 1px ${tone(recColor, 30)}`,
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: recColor, boxShadow: `0 0 0 4px ${tone(recColor, 20)}` }} />
                        {assessment.recommendation}
                      </motion.span>
                      <p style={{ fontSize: 14, color: "var(--label-body)", lineHeight: 1.55, marginTop: 12 }}>{assessment.recommendationReason}</p>
                      {buyBoxNote && (
                        <p className="t-footnote" style={{ color: "var(--yellow)", marginTop: 8 }}>{buyBoxNote}</p>
                      )}
                      {onAction && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => onAction(lead.id, isWatched ? "unwatch" : "watch")}
                            className={`btn btn-sm pressable ${isWatched ? "btn-plain" : "btn-secondary"}`}
                            style={isWatched ? { background: "rgba(var(--tint-rgb), 0.14)" } : undefined}
                          >
                            <Eye style={{ width: 14, height: 14 }} />
                            {isWatched ? "Watching" : "Watch"}
                          </button>
                          {assign && (
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={() => onAction(lead.id, assign.action)}
                              className="btn btn-sm btn-secondary pressable"
                              style={assign.action === "unassign" ? { color: "var(--blue)", background: "rgba(var(--blue-rgb), 0.12)", borderColor: "transparent" } : undefined}
                            >
                              <UserPlus style={{ width: 14, height: 14 }} />
                              {assign.label}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => onAction(lead.id, "pass")}
                            className="btn btn-sm btn-destructive pressable"
                          >
                            <Ban style={{ width: 14, height: 14 }} />
                            Pass
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </SectionCard>
              </motion.div>

              {/* ── Key figures ──────────────────────────────── */}
              {assessment && (
                <motion.div
                  variants={listItem}
                  style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}
                >
                  <MetricTile
                    label="Asking price"
                    sub={fixture ? "Demo listing" : "Listing · provider data"}
                    value={lead.price ? formatCurrency(lead.price) : "—"}
                  />
                  <MetricTile
                    label="Max offer"
                    sub="Spotr estimate"
                    color={maxOfferOk ? "var(--tint-text)" : "var(--yellow)"}
                    value={
                      assessment.maxOffer.status === "ok" ? (
                        <AnimatedNumber countUp value={assessment.maxOffer.amount ?? 0} format={(n) => formatCurrency(Math.round(n))} />
                      ) : assessment.maxOffer.status === "below-acquisition-range" ? (
                        "Below min"
                      ) : (
                        "—"
                      )
                    }
                  />
                  <MetricTile
                    label="Your last offer"
                    sub={
                      lastOffer
                        ? `Buyer-recorded · ${new Date(lastOffer.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : "None recorded"
                    }
                    color={lastOffer ? "var(--green)" : "var(--label-secondary)"}
                    value={lastOffer ? formatCurrency(lastOffer.amountUsd) : "—"}
                  />
                  <MetricTile
                    label="Score"
                    sub={`Raw ${assessment.rawScoreBeforeRisk} − risk ${assessment.riskPenalty}`}
                    value={<AnimatedNumber countUp value={assessment.finalOpportunityScore} />}
                    adornment={<ScoreRing score={assessment.finalOpportunityScore} />}
                  />
                  <MetricTile
                    label="Confidence"
                    sub={`${assessment.confidenceTier} · data completeness`}
                    value={<AnimatedNumber countUp value={assessment.confidencePercent} format={(n) => `${Math.round(n)}%`} />}
                    footer={<Meter percent={assessment.confidencePercent} />}
                  />
                  <MetricTile
                    label="Risk"
                    sub={
                      assessment.riskFactors.length > 0
                        ? `${assessment.riskFactors.length} flag${assessment.riskFactors.length === 1 ? "" : "s"}`
                        : "No flags"
                    }
                    color={RISK_COLORS[assessment.riskLevel]}
                    value={assessment.riskLevel}
                  />
                </motion.div>
              )}

              {/* Outcome banner: why this lead was Passed / marked Lost */}
              {lead.outcomeReason && (lead.passedAt || lead.stage === "Lost") && (
                <motion.div
                  variants={listItem}
                  style={{
                    borderRadius: "var(--radius-md)",
                    background: "rgba(var(--red-rgb), 0.1)",
                    boxShadow: "inset 0 0 0 1px rgba(var(--red-rgb), 0.25)",
                    padding: "12px 16px",
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--red)" }}>
                    {lead.passedAt ? "Passed" : "Lost"} — {outcomeReasonLabel(lead.outcomeReason)}
                  </p>
                  {lead.outcomeNote && (
                    <p style={{ fontSize: 12, color: "var(--label-body)", marginTop: 4 }}>“{lead.outcomeNote}”</p>
                  )}
                </motion.div>
              )}

              {/* ── Follow-up + offer logging ────────────────── */}
              <motion.div
                variants={listItem}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}
              >
                <FollowUpPanel lead={lead} onLeadUpdated={handleLeadUpdated} />
                <RecordOfferForm
                  leadId={lead.id}
                  recommendedMaxOfferLabel={maxOfferOk && assessment ? formatCurrency(assessment.maxOffer.amount) : null}
                  onRecorded={() => setActivityReload((value) => value + 1)}
                />
              </motion.div>

              {/* ── Vehicle + provenance ─────────────────────── */}
              <motion.div
                variants={listItem}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}
              >
                <SectionCard title="Vehicle">
                  <DetailRow label="Listing" value={title} />
                  <DetailRow label="VIN" value={lead.vin || "Not supplied"} icon={Hash} />
                  <DetailRow label="Trim" value={lead.trim || "Unknown"} />
                  <DetailRow label="Mileage" value={formatMiles(lead.miles)} icon={Gauge} />
                  <DetailRow label="Location" value={[lead.city, lead.state].filter(Boolean).join(", ") || "Unknown"} icon={MapPin} />
                  <DetailRow label="Distance" value={formatDistance(lead.distanceMiles)} />
                </SectionCard>

                <SectionCard title="Source & freshness">
                  <DetailRow label="Source" value={fixture ? "Synthetic fixture (demo)" : lead.source || "Unknown"} />
                  <DetailRow
                    label="Verification"
                    value={
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          borderRadius: 999,
                          padding: "3px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          background: verified ? "rgba(var(--green-rgb), 0.14)" : "rgba(var(--yellow-rgb), 0.14)",
                          color: verified ? "var(--green)" : "var(--yellow)",
                        }}
                      >
                        <ShieldCheck style={{ width: 12, height: 12 }} />
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
                  {isSafeHttpUrl(lead.vdp_url) && (
                    <a
                      href={lead.vdp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-plain pressable"
                      style={{ marginTop: 12, paddingLeft: 10 }}
                    >
                      View original listing <ExternalLink style={{ width: 13, height: 13 }} />
                    </a>
                  )}
                </SectionCard>
              </motion.div>

              {/* ── Acquisition economics ────────────────────── */}
              <motion.div variants={listItem}>
                {!assessment ? (
                  <SectionCard title="Acquisition economics">
                    <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
                      <span className="t-footnote" style={{ color: "var(--label-secondary)" }}>
                        Economics and risk assessment load once the buy box is available…
                      </span>
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="skeleton" style={{ height: 18, width: `${90 - i * 12}%` }} />
                      ))}
                    </div>
                  </SectionCard>
                ) : (
                  <SectionCard
                    title="Acquisition economics"
                    caption="Planning figures from stated assumptions — not guarantees. Tap any source tag for the assumption behind the number."
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
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
                          <DetailRow label="Est. retail range" value={<span style={{ color: "var(--label-secondary)" }}>Unavailable — no asking price</span>} />
                        )}
                        <MoneyRow label="Reconditioning" sourced={assessment.maxOffer.inputs.recon} />
                        <MoneyRow label="Transport / fees" sourced={assessment.maxOffer.inputs.transport} />
                        <MoneyRow label="Uncertainty buffer" sourced={assessment.maxOffer.inputs.uncertaintyBuffer} />
                        <MoneyRow label="Target gross (planning)" sourced={assessment.maxOffer.inputs.targetGross} />

                        {/* Max offer callout */}
                        <div
                          style={{
                            marginTop: 14,
                            borderRadius: "var(--radius-md)",
                            padding: "14px 16px",
                            background:
                              assessment.maxOffer.status === "ok"
                                ? "rgba(var(--tint-rgb), 0.1)"
                                : assessment.maxOffer.status === "below-acquisition-range"
                                ? "rgba(var(--yellow-rgb), 0.1)"
                                : "var(--fill)",
                            boxShadow: `inset 0 0 0 1px ${
                              assessment.maxOffer.status === "ok"
                                ? "rgba(var(--tint-rgb), 0.28)"
                                : assessment.maxOffer.status === "below-acquisition-range"
                                ? "rgba(var(--yellow-rgb), 0.3)"
                                : "var(--separator)"
                            }`,
                          }}
                        >
                          <p className="t-eyebrow" style={{ color: "var(--label-secondary)", marginBottom: 6 }}>
                            Recommended max offer · Spotr estimate
                          </p>
                          {assessment.maxOffer.status === "unavailable" ? (
                            <p style={{ fontSize: 13, color: "var(--label-secondary)", lineHeight: 1.5 }}>{assessment.maxOffer.reason}</p>
                          ) : assessment.maxOffer.status === "below-acquisition-range" ? (
                            <>
                              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--yellow)" }}>
                                Offer ceiling below your minimum acquisition price — investigate only
                              </p>
                              <p style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 3 }}>
                                Internal estimate of the ceiling: {formatCurrency(assessment.maxOffer.amount)} (under your configured minimum).
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="t-title2 tabular" style={{ color: "var(--tint-text)" }}>
                                {formatCurrency(assessment.maxOffer.amount)}
                                {assessment.maxOffer.cappedByAcquisitionMax && (
                                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--label-secondary)", marginLeft: 8, letterSpacing: 0 }}>
                                    capped at your configured max
                                  </span>
                                )}
                              </p>
                              <p style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                                Conservative retail (low end) − target gross − recon − transport − buffer. Built to protect the gross target under the stated assumptions.
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="t-eyebrow" style={{ color: "var(--label-secondary)", marginBottom: 10 }}>
                          Scenarios (buying at asking)
                        </p>
                        {assessment.scenarios.length === 0 ? (
                          <p style={{ fontSize: 13, color: "var(--label-secondary)" }}>Scenario projections need an asking price.</p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {assessment.scenarios.map((scenario) => {
                              const gross = scenario.projectedGross.value ?? 0;
                              return (
                                <div
                                  key={scenario.name}
                                  style={{ borderRadius: "var(--radius-md)", padding: "12px 14px", background: "var(--fill)" }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>{scenario.name}</span>
                                    <span className="tabular" style={{ fontSize: 15, fontWeight: 700, color: gross >= 0 ? "var(--green)" : "var(--red)" }}>
                                      {gross >= 0 ? "+" : "−"}{formatCurrency(Math.abs(gross))} gross
                                    </span>
                                  </div>
                                  <p style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 4 }}>
                                    Retail {formatCurrency(scenario.retail.value)} · all-in {formatCurrency(scenario.allIn.value)}
                                  </p>
                                  <p style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 2 }}>{scenario.description}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </SectionCard>
                )}
              </motion.div>

              {/* ── Risks & data gaps ────────────────────────── */}
              {assessment && (
                <motion.div variants={listItem}>
                  <SectionCard title="Risks & data gaps" icon={AlertTriangle} iconColor="var(--yellow)">
                    {assessment.riskFactors.length === 0 && assessment.completeness.missing.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--label-body)" }}>
                        No risk flags and no missing key fields. Condition and title status still require inspection — Spotr has no data for either.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {assessment.riskFactors.map((risk) => (
                          <div key={risk.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                            <span style={{ color: "var(--label-body)" }}>
                              <span style={{ fontWeight: 600, color: "var(--red)" }}>{risk.label}.</span> {risk.detail}
                            </span>
                            <span className="tabular" style={{ fontWeight: 600, flexShrink: 0, color: "var(--red)" }}>−{risk.points} pts</span>
                          </div>
                        ))}
                        {assessment.completeness.missing.length > 0 && (
                          <p style={{ fontSize: 13, color: "var(--label-body)" }}>
                            <span style={{ fontWeight: 600, color: "var(--yellow)" }}>Missing data.</span>{" "}
                            {assessment.completeness.missing.join(", ")} — treated as uncertainty, lowering confidence to {assessment.confidencePercent}%.
                          </p>
                        )}
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--label-secondary)" }}>
                          Condition and title status are never inferred — verify by inspection and history report before an offer.
                        </p>
                      </div>
                    )}
                  </SectionCard>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "activity" && (
            <div style={{ maxWidth: 640 }}>
              <ActivityTimeline leadId={lead.id} reloadKey={activityReload} />
            </div>
          )}
          {activeTab === "chat" && <ChatMock key={lead.id} leadId={lead.id} sellerName={lead.sellerName} />}
          {activeTab === "history" && <CarfaxMock vdpUrl={lead.vdp_url} source={lead.source} />}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  );
}

function Dot() {
  return <span aria-hidden="true" style={{ color: "var(--label-tertiary)" }}>·</span>;
}

function SampleBadge() {
  return (
    <span
      style={{
        borderRadius: 999,
        padding: "3px 9px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: "var(--yellow)",
        background: "rgba(var(--yellow-rgb), 0.14)",
        boxShadow: "inset 0 0 0 1px rgba(var(--yellow-rgb), 0.35)",
      }}
    >
      SAMPLE DATA
    </span>
  );
}

function SectionCard({
  title,
  caption,
  icon: Icon,
  iconColor,
  accent,
  children,
}: {
  title?: string;
  caption?: string;
  icon?: LucideIcon;
  iconColor?: string;
  /** Tints the card edge with a semantic color (e.g. the recommendation). */
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: accent ? `linear-gradient(160deg, ${tone(accent, 9)}, transparent 55%), var(--bg-card)` : "var(--bg-card)",
        borderRadius: "var(--radius-lg)",
        padding: "18px 20px",
        border: `1px solid ${accent ? tone(accent, 24) : "var(--separator)"}`,
      }}
    >
      {title && (
        <h3 className="t-headline" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--label)", marginBottom: caption ? 2 : 6 }}>
          {Icon && <Icon style={{ width: 16, height: 16, color: iconColor }} />}
          {title}
        </h3>
      )}
      {caption && (
        <p className="t-footnote" style={{ color: "var(--label-secondary)", marginBottom: 12 }}>
          {caption}
        </p>
      )}
      {children}
    </section>
  );
}

function MetricTile({
  label,
  value,
  sub,
  color = "var(--label)",
  adornment,
  footer,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  color?: string;
  adornment?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: "var(--radius-md)",
        padding: "12px 14px",
        background: "var(--bg-card)",
        border: "1px solid var(--separator)",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p className="t-eyebrow" style={{ color: "var(--label-secondary)", marginBottom: 6 }}>{label}</p>
          <p className="t-title3 tabular" style={{ color, whiteSpace: "nowrap" }}>{value}</p>
        </div>
        {adornment}
      </div>
      <p style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 4 }}>{sub}</p>
      {footer}
    </div>
  );
}

/** Score out of 100 as a ring that draws itself in. */
function ScoreRing({ score }: { score: number }) {
  const color = scoreColor(score);
  const clamped = Math.max(0, Math.min(score, 100)) / 100;
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" aria-hidden="true" style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
      <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(var(--ink-rgb), 0.1)" strokeWidth="4" />
      <motion.circle
        cx="18"
        cy="18"
        r="14"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: clamped }}
        transition={{ ...spring.smooth, duration: 1, delay: 0.15 }}
      />
    </svg>
  );
}

function Meter({ percent }: { percent: number }) {
  const color = percent >= 75 ? "var(--green)" : percent >= 50 ? "var(--yellow)" : "var(--red)";
  return (
    <div aria-hidden="true" style={{ height: 4, borderRadius: 999, background: "rgba(var(--ink-rgb), 0.08)", marginTop: 10, overflow: "hidden" }}>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: Math.max(0, Math.min(percent, 100)) / 100 }}
        transition={{ ...spring.smooth, duration: 0.9, delay: 0.2 }}
        style={{ height: "100%", background: color, borderRadius: 999, transformOrigin: "left" }}
      />
    </div>
  );
}
