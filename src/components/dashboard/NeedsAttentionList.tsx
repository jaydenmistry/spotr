"use client";

import { CalendarClock, CheckCircle2, Clock, ListChecks } from "lucide-react";
import {
  formatCurrency,
  formatDistance,
  getVehicleTitle,
  type LeadRecord,
} from "@/lib/vehicleAnalytics";
import type { Recommendation } from "@/lib/opportunity";
import type { AttentionEntry, AttentionGroup } from "@/lib/pipeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { RECOMMENDATION_COLORS } from "@/lib/ui/colors";


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


/**
 * Needs Attention view: active, non-terminal, non-passed leads that want a
 * buyer's attention, grouped Overdue → Due soon → No next action.
 *
 * Membership and ordering come entirely from buildNeedsAttention, which the
 * page now calls — it passes the resulting entries straight in, so the count it
 * shows in the result summary and the rows rendered here are the same array and
 * cannot disagree. This component never re-derives terminal/overdue logic.
 * Only two safe actions are exposed per row: Open dossier and, when an active
 * follow-up exists, Mark done.
 */
export default function NeedsAttentionList({
  entries,
  now,
  recommendationOf,
  onOpen,
  onCompleteNextAction,
  busyLeadId,
}: {
  entries: AttentionEntry[];
  now?: Date;
  recommendationOf: (lead: LeadRecord) => Recommendation | undefined;
  onOpen: (lead: LeadRecord) => void;
  onCompleteNextAction: (lead: LeadRecord) => void;
  busyLeadId?: string | null;
}) {
  const clock = now ?? new Date();
  // Precompute which rows start a new group so the render map stays pure (no
  // mid-render mutation, which the React Compiler rejects).
  const rows = entries.map((entry, index) => ({
    ...entry,
    showHeader: index === 0 || entries[index - 1].group !== entry.group,
  }));

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        tone="var(--green)"
        title="Nothing needs attention"
        body="No overdue or due-soon follow-ups, and every watched or assigned lead has a next step. Switch to Board to keep working the pipeline."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map(({ lead, group, showHeader }, index) => {
        const meta = GROUP_META[group];
        const rec = recommendationOf(lead);
        const hasActiveFollowUp =
          Boolean(lead.nextAction && lead.nextActionAt) && !lead.nextActionCompletedAt;
        const busy = busyLeadId === lead.id;

        return (
          <div key={lead.id} className="rise-in" style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
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
                <h3 className="t-eyebrow" style={{ color: meta.color }}>
                  {meta.label}
                </h3>
                <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>· {meta.blurb}</span>
              </div>
            )}

            <div
              className="hover-lift attention-row"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 14,
                padding: "12px 16px",
                borderRadius: "var(--radius-lg)",
                background: "var(--bg-card)",
                border: "1px solid var(--separator)",
                boxShadow: `inset 3px 0 0 ${meta.color}, var(--shadow-sm)`,
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span
                    title={getVehicleTitle(lead)}
                    style={{
                      fontSize: 14,
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
                  <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: "var(--label-body)" }}>
                    {lead.price ? <><span style={{ fontWeight: 500, color: "var(--label-secondary)" }}>Asking </span>{formatCurrency(lead.price)}</> : "No asking price"}
                  </span>
                  {rec && (
                    <span
                      title="Spotr heuristic recommendation — an estimate, not market data"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 999,
                        padding: "2px 8px",
                        color: RECOMMENDATION_COLORS[rec],
                        background: `color-mix(in srgb, ${RECOMMENDATION_COLORS[rec]} 13%, transparent)`,
                      }}
                    >
                      {rec}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--label-secondary)",
                      borderRadius: 999,
                      padding: "2px 8px",
                      background: "var(--fill)",
                    }}
                  >
                    {lead.stage}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                    className="btn btn-sm pressable"
                    style={{ background: "rgba(var(--green-rgb), 0.14)", color: "var(--green)" }}
                  >
                    <CheckCircle2 style={{ width: 13, height: 13 }} aria-hidden="true" />
                    {busy ? "Saving…" : "Mark done"}
                  </button>
                )}
                <button type="button" onClick={() => onOpen(lead)} className="btn btn-sm btn-secondary pressable">
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
