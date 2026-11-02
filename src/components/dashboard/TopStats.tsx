"use client";

import { tone } from "@/lib/ui/colors";
import { CalendarClock, Clock, Eye, Layers } from "lucide-react";
import type { FollowUpFilter } from "./PipelineControls";

/**
 * Operational header for the Pipeline. Four action-focused stats — Active
 * pipeline, Overdue, Due soon, Watching.
 *
 * This component derives NOTHING. Every count is supplied by the page from the
 * shared `buildPipelineLeadSets` vocabulary, so the header, the control-bar
 * badge, the Board pills and the Needs Attention groups are guaranteed to be
 * the same numbers. Specifically the caller passes counts computed from
 * `active` — the explicitly-filtered, non-terminal, non-passed set — which is
 * why turning the Overdue filter on does not zero the Due-soon stat, and why
 * switching between Board and Needs Attention never moves these numbers.
 */
export default function TopStats({
  activeCount,
  overdueCount,
  dueSoonCount,
  watchingCount,
  followUp,
  watchedOnly,
  onToggleFollowUp,
  onToggleWatched,
}: {
  activeCount: number;
  overdueCount: number;
  dueSoonCount: number;
  watchingCount: number;
  followUp: FollowUpFilter;
  watchedOnly: boolean;
  onToggleFollowUp: (next: FollowUpFilter) => void;
  onToggleWatched: (next: boolean) => void;
}) {
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
      value: activeCount,
      icon: Layers,
      color: "var(--blue)",
      subtext: "Open, non-terminal leads",
    },
    {
      key: "overdue",
      name: "Overdue",
      value: overdueCount,
      icon: Clock,
      color: "var(--red)",
      subtext: overdueCount ? "Follow up now" : "Nothing overdue",
      pressed: followUp === "overdue",
      onClick: () => onToggleFollowUp(followUp === "overdue" ? "all" : "overdue"),
    },
    {
      key: "due-soon",
      name: "Due soon",
      value: dueSoonCount,
      icon: CalendarClock,
      color: "var(--yellow)",
      subtext: "Due within 48h",
      pressed: followUp === "due-soon",
      onClick: () => onToggleFollowUp(followUp === "due-soon" ? "all" : "due-soon"),
    },
    {
      key: "watching",
      name: "Watching",
      value: watchingCount,
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
