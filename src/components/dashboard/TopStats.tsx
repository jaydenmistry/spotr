"use client";

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
      color: "#60a5fa",
      subtext: "Open, non-terminal leads",
    },
    {
      key: "overdue",
      name: "Overdue",
      value: overdue,
      icon: Clock,
      color: "#f87171",
      subtext: overdue ? "Follow up now" : "Nothing overdue",
      pressed: followUp === "overdue",
      onClick: () => onToggleFollowUp(followUp === "overdue" ? "all" : "overdue"),
    },
    {
      key: "due-soon",
      name: "Due soon",
      value: dueSoon,
      icon: CalendarClock,
      color: "#fbbf24",
      subtext: "Due within 48h",
      pressed: followUp === "due-soon",
      onClick: () => onToggleFollowUp(followUp === "due-soon" ? "all" : "due-soon"),
    },
    {
      key: "watching",
      name: "Watching",
      value: watching,
      icon: Eye,
      color: "#ff9147",
      subtext: "Shortlisted opportunities",
      pressed: watchedOnly,
      onClick: () => onToggleWatched(!watchedOnly),
    },
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
      {stats.map((item) => {
        const interactive = Boolean(item.onClick);
        const content = (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  background: `${item.color}1a`,
                }}
              >
                <item.icon style={{ width: 17, height: 17, color: item.color }} aria-hidden="true" />
              </div>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: "#8b9ab8", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                {item.name}
              </p>
            </div>
            <p style={{ fontSize: 26, fontWeight: 900, color: "#f0f4ff", letterSpacing: "-0.02em", marginBottom: 3 }}>
              {item.value}
            </p>
            <p style={{ fontSize: 11.5, color: "#4a5670" }}>{item.subtext}</p>
          </>
        );

        const baseStyle: React.CSSProperties = {
          flex: "1 1 200px",
          textAlign: "left",
          background: "var(--bg-card)",
          borderRadius: 14,
          padding: "16px 18px",
          border: `1px solid ${item.pressed ? `${item.color}80` : "rgba(255,255,255,0.08)"}`,
          boxShadow: item.pressed ? `inset 0 0 0 1px ${item.color}40` : "none",
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
            style={{ ...baseStyle, cursor: "pointer", transition: "border-color 0.15s" }}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
