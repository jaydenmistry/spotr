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
  BUY: "var(--green)",
  INVESTIGATE: "var(--yellow)",
  WATCH: "var(--blue)",
  PASS: "var(--label-secondary)",
};

const GROUP_META: Record<AttentionGroup, { label: string; color: string; blurb: string }> = {
  overdue: { label: "Overdue", color: "var(--red)", blurb: "Past due — follow up now" },
  "due-soon": { label: "Due soon", color: "var(--yellow)", blurb: "Due within 48 hours" },
  unscheduled: { label: "No next action", color: "var(--label-secondary)", blurb: "Watched or assigned, nothing scheduled" },
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
  borderRadius: "var(--radius-sm)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid var(--separator-strong)",
  background: "var(--fill)",
  color: "var(--label)",
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
          borderRadius: "var(--radius-lg)",
          border: "1px dashed rgba(var(--ink-rgb), 0.12)",
          background: "rgba(var(--ink-rgb), 0.02)",
          textAlign: "center",
        }}
      >
        <CheckCircle2 style={{ width: 30, height: 30, color: "var(--green)" }} aria-hidden="true" />
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--label)" }}>Nothing needs attention</p>
        <p style={{ fontSize: 13, color: "var(--label-secondary)", maxWidth: 380 }}>
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
                <h3 style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {meta.label}
                </h3>
                <span style={{ fontSize: 11.5, color: "var(--label-secondary)" }}>· {meta.blurb}</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-card)",
                border: "1px solid var(--separator)",
                borderLeft: `3px solid ${meta.color}`,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span
                    title={getVehicleTitle(lead)}
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--label)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 320,
                    }}
                  >
                    {getVehicleTitle(lead)}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--label-body)" }}>
                    {lead.price ? formatCurrency(lead.price) : "No asking price"}
                  </span>
                  {rec && (
                    <span
                      title="Spotr heuristic recommendation"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: "var(--radius-xs)",
                        padding: "1px 7px",
                        color: RECOMMENDATION_COLORS[rec],
                        background: `color-mix(in srgb, ${RECOMMENDATION_COLORS[rec]} 10%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${RECOMMENDATION_COLORS[rec]} 27%, transparent)`,
                      }}
                    >
                      {rec}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "var(--label-secondary)",
                      borderRadius: "var(--radius-xs)",
                      padding: "1px 7px",
                      background: "rgba(var(--ink-rgb), 0.05)",
                    }}
                  >
                    {lead.stage}
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: "var(--label-secondary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {hasActiveFollowUp ? (
                    <>
                      <span style={{ color: meta.color, fontWeight: 600 }}>
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
                      background: "rgba(var(--green-rgb), 0.1)",
                      borderColor: "rgba(var(--green-rgb), 0.4)",
                      color: "var(--green)",
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
