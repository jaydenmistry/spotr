"use client";

import { tone } from "@/lib/ui/colors";
import { CalendarClock, Clock, Eye, Layers } from "lucide-react";
import type { LeadRecord } from "@/lib/vehicleAnalytics";
import { isTerminalStage } from "@/lib/stages";
import { getFollowUpStatus } from "@/lib/followUp";
import type { FollowUpFilter } from "./PipelineControls";

/**
 * Operational header for the Pipeline. Four action-focused stats — Active
 * pipeline, Overdue, Due soon, Watching — computed from the caller's already
 * non-view-filtered leads, so the numbers describe the same set the board and
 * Needs Attention list render. Overdue / Due soon / Watching double as filter
 * toggles; the counts never change based on which view is selected.
 */
export default function TopStats({
  leads,
  now,
  followUp,
  watchedOnly,
  onToggleFollowUp,
  onToggleWatched,
}: {
  leads: LeadRecord[];
  now?: Date;
  followUp: FollowUpFilter;
  watchedOnly: boolean;
  onToggleFollowUp: (next: FollowUpFilter) => void;
  onToggleWatched: (next: boolean) => void;
}) {
  const activeLeads = leads.filter((l) => !isTerminalStage(l.stage) && !l.passedAt);

  let overdue = 0;
  let dueSoon = 0;
  for (const lead of activeLeads) {
    const status = getFollowUpStatus(lead, now);
    if (status === "overdue") overdue += 1;
    else if (status === "due-soon") dueSoon += 1;
  }

  // Same definition as the feed's Watching tab: shortlisted, not passed,
  // still an open opportunity.
  const watching = activeLeads.filter((l) => l.watchedAt).length;

  const stats: Array<{
    key: string;
    name: string;
    value: number;
    icon: typeof Layers;
    color: string;
    subtext: string;
    pressed?: boolean;
    onClick?: () => void;
  }> = [
    {
      key: "active",
      name: "Active pipeline",
      value: activeLeads.length,
      icon: Layers,
      color: "var(--blue)",
      subtext: "Open, non-terminal leads",
    },
    {
      key: "overdue",
      name: "Overdue",
      value: overdue,
      icon: Clock,
      color: "var(--red)",
      subtext: overdue ? "Follow up now" : "Nothing overdue",
      pressed: followUp === "overdue",
      onClick: () => onToggleFollowUp(followUp === "overdue" ? "all" : "overdue"),
    },
    {
      key: "due-soon",
      name: "Due soon",
      value: dueSoon,
      icon: CalendarClock,
      color: "var(--yellow)",
      subtext: "Due within 48h",
      pressed: followUp === "due-soon",
      onClick: () => onToggleFollowUp(followUp === "due-soon" ? "all" : "due-soon"),
    },
    {
      key: "watching",
      name: "Watching",
      value: watching,
      icon: Eye,
      color: "var(--tint-text)",
      subtext: "Shortlisted opportunities",
      pressed: watchedOnly,
      onClick: () => onToggleWatched(!watchedOnly),
    },
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
      {stats.map((item) => {
        const interactive = Boolean(item.onClick);
        const content = (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-sm)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  background: `color-mix(in srgb, ${item.color} 10%, transparent)`,
                }}
              >
                <item.icon style={{ width: 17, height: 17, color: item.color }} aria-hidden="true" />
              </div>
              <p className="t-eyebrow" style={{ color: "var(--label-secondary)" }}>
                {item.name}
              </p>
            </div>
            {/* Re-keyed on value: a changed count pops in on a spring. */}
            <p
              key={String(item.value)}
              className="t-title1 tabular pop-in"
              style={{ color: "var(--label)", marginBottom: 3, transformOrigin: "left bottom" }}
            >
              {item.value}
            </p>
            <p style={{ fontSize: 12, color: "var(--label-secondary)" }}>{item.subtext}</p>
          </>
        );

        const baseStyle: React.CSSProperties = {
          flex: "1 1 180px",
          textAlign: "left",
          background: item.pressed ? `linear-gradient(160deg, ${tone(item.color, 12)}, transparent 60%), var(--bg-card)` : "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 18px",
          border: `1px solid ${item.pressed ? tone(item.color, 50) : "var(--separator)"}`,
          boxShadow: item.pressed ? `0 0 0 3px ${tone(item.color, 14)}` : "var(--shadow-sm)",
        };

        if (!interactive) {
          return (
            <div key={item.key} style={baseStyle}>
              {content}
            </div>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={item.pressed}
            aria-label={`${item.name}: ${item.value}. ${item.pressed ? "Filter active" : "Click to filter"}`}
            onClick={item.onClick}
            className="pressable hover-lift"
            style={{ ...baseStyle, cursor: "pointer" }}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
