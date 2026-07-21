"use client";

import { CalendarClock, CheckCircle2, Clock, ListChecks } from "lucide-react";
import {
  formatCurrency,
  formatDistance,
  getVehicleTitle,
  type LeadRecord,
} from "@/lib/vehicleAnalytics";
import type { Recommendation } from "@/lib/opportunity";
import { buildNeedsAttention, type AttentionGroup } from "@/lib/pipeline";

const RECOMMENDATION_COLORS: Record<Recommendation, string> = {
  BUY: "#34d399",
  INVESTIGATE: "#fbbf24",
  WATCH: "#60a5fa",
  PASS: "#8b9ab8",
};

const GROUP_META: Record<AttentionGroup, { label: string; color: string; blurb: string }> = {
  overdue: { label: "Overdue", color: "#f87171", blurb: "Past due — follow up now" },
  "due-soon": { label: "Due soon", color: "#fbbf24", blurb: "Due within 48 hours" },
  unscheduled: { label: "No next action", color: "#8b9ab8", blurb: "Watched or assigned, nothing scheduled" },
};

function dueLabel(iso: string | null | undefined, now: Date) {
  if (!iso) return "";
  const deltaMs = new Date(iso).getTime() - now.getTime();
  if (!Number.isFinite(deltaMs)) return "";
  const abs = Math.abs(deltaMs);
  const minutes = Math.round(abs / 60000);
  const unit =
    minutes < 60
      ? `${Math.max(minutes, 1)}m`
      : minutes < 60 * 24
      ? `${Math.round(minutes / 60)}h`
      : `${Math.round(minutes / (60 * 24))}d`;
  return deltaMs >= 0 ? `due in ${unit}` : `${unit} overdue`;
}

const rowButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "6px 11px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#f0f4ff",
  whiteSpace: "nowrap",
};

/**
 * Needs Attention view: active, non-terminal, non-passed leads that want a
 * buyer's attention, grouped Overdue → Due soon → No next action. Ordering and
 * membership come entirely from buildNeedsAttention (shared helper) so this
 * component never re-derives terminal/overdue logic. Only two safe actions are
 * exposed per row: Open dossier and, when an active follow-up exists, Mark done.
 */
export default function NeedsAttentionList({
  leads,
  now,
  recommendationOf,
  scoreOf,
  onOpen,
  onCompleteNextAction,
  busyLeadId,
}: {
  leads: LeadRecord[];
  now?: Date;
  recommendationOf: (lead: LeadRecord) => Recommendation | undefined;
  scoreOf: (lead: LeadRecord) => number;
  onOpen: (lead: LeadRecord) => void;
  onCompleteNextAction: (lead: LeadRecord) => void;
  busyLeadId?: string | null;
}) {
  const clock = now ?? new Date();
  const entries = buildNeedsAttention(leads, scoreOf, clock);
  // Precompute which rows start a new group so the render map stays pure (no
  // mid-render mutation, which the React Compiler rejects).
  const rows = entries.map((entry, index) => ({
    ...entry,
    showHeader: index === 0 || entries[index - 1].group !== entry.group,
  }));

  if (entries.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "60px 20px",
          borderRadius: 14,
          border: "1px dashed rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.02)",
          textAlign: "center",
        }}
      >
        <CheckCircle2 style={{ width: 30, height: 30, color: "#34d399" }} aria-hidden="true" />
        <p style={{ fontSize: 15, fontWeight: 800, color: "#f0f4ff" }}>Nothing needs attention</p>
        <p style={{ fontSize: 13, color: "#8b9ab8", maxWidth: 380 }}>
          No overdue or due-soon follow-ups, and every watched or assigned lead has a next step.
          Switch to Board to keep working the pipeline.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map(({ lead, group, showHeader }) => {
        const meta = GROUP_META[group];
        const rec = recommendationOf(lead);
        const hasActiveFollowUp =
          Boolean(lead.nextAction && lead.nextActionAt) && !lead.nextActionCompletedAt;
        const busy = busyLeadId === lead.id;

        return (
          <div key={lead.id}>
            {showHeader && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  margin: "14px 2px 8px",
                }}
              >
                {group === "overdue" ? (
                  <Clock style={{ width: 14, height: 14, color: meta.color }} aria-hidden="true" />
                ) : group === "due-soon" ? (
                  <CalendarClock style={{ width: 14, height: 14, color: meta.color }} aria-hidden="true" />
                ) : (
                  <ListChecks style={{ width: 14, height: 14, color: meta.color }} aria-hidden="true" />
                )}
                <h3 style={{ fontSize: 12, fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {meta.label}
                </h3>
                <span style={{ fontSize: 11.5, color: "#4a5670" }}>· {meta.blurb}</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--bg-card)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderLeft: `3px solid ${meta.color}`,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span
                    title={getVehicleTitle(lead)}
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "#f0f4ff",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 320,
                    }}
                  >
                    {getVehicleTitle(lead)}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "#c6d0e2" }}>
                    {lead.price ? formatCurrency(lead.price) : "No asking price"}
                  </span>
                  {rec && (
                    <span
                      title="Spotr heuristic recommendation"
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        borderRadius: 6,
                        padding: "1px 7px",
                        color: RECOMMENDATION_COLORS[rec],
                        background: `${RECOMMENDATION_COLORS[rec]}1a`,
                        border: `1px solid ${RECOMMENDATION_COLORS[rec]}44`,
                      }}
                    >
                      {rec}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "#8b9ab8",
                      borderRadius: 6,
                      padding: "1px 7px",
                      background: "rgba(255,255,255,0.05)",
                    }}
                  >
                    {lead.stage}
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: "#8b9ab8", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {hasActiveFollowUp ? (
                    <>
                      <span style={{ color: meta.color, fontWeight: 700 }}>
                        {dueLabel(lead.nextActionAt, clock)}
                      </span>
                      {" · "}
                      {lead.nextAction}
                    </>
                  ) : (
                    <>
                      No next action · {formatDistance(lead.distanceMiles)}
                      {lead.assignedTo ? " · assigned" : lead.watchedAt ? " · watching" : ""}
                    </>
                  )}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {hasActiveFollowUp && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onCompleteNextAction(lead)}
                    style={{
                      ...rowButtonStyle,
                      background: "rgba(52,211,153,0.1)",
                      borderColor: "rgba(52,211,153,0.4)",
                      color: "#34d399",
                      opacity: busy ? 0.5 : 1,
                    }}
                  >
                    <CheckCircle2 style={{ width: 13, height: 13 }} aria-hidden="true" />
                    {busy ? "Saving…" : "Mark done"}
                  </button>
                )}
                <button type="button" onClick={() => onOpen(lead)} style={rowButtonStyle}>
                  Open dossier
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
