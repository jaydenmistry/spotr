"use client";

import { CalendarClock, Car, DollarSign, Eye, TrendingUp } from "lucide-react";
import { formatSignedCurrency, getVehicleAnalytics, type LeadRecord } from "@/lib/vehicleAnalytics";
import { isTerminalStage } from "@/lib/stages";
import { getFollowUpStatus } from "@/lib/followUp";

export default function TopStats({
  leads,
  now,
}: {
  leads: LeadRecord[];
  /** Shared clock from the page, so this count can't disagree with the
   *  board's overdue badges or the needs-follow-up filter. */
  now?: Date;
}) {
  const acquiredLeads = leads.filter((l) => l.stage === "Acquired");
  const acquiredValue = acquiredLeads.reduce((sum, l) => sum + (l.price || 0), 0);

  const pipelineLeads = leads.filter((l) => !isTerminalStage(l.stage));
  const pipelineValue = pipelineLeads.reduce((sum, l) => sum + (l.price || 0), 0);
  const projectedMovement = pipelineLeads.reduce(
    (sum, lead) => sum + getVehicleAnalytics(lead).projectedChangeDollars,
    0
  );

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newThisWeek = leads.filter((l) => new Date(l.createdAt) > oneWeekAgo).length;

  // Same definition as the feed's Watching tab: shortlisted, not passed,
  // still an open opportunity.
  const watchingCount = leads.filter(
    (l) => l.watchedAt && !l.passedAt && !isTerminalStage(l.stage)
  ).length;

  // Shared helper — must stay in lockstep with the pipeline's
  // "Needs follow-up only" filter so the count matches the filtered view.
  const needsFollowUpCount = leads.filter((l) => getFollowUpStatus(l, now) === "overdue").length;

  const stats = [
    {
      name: "Acquired Value",
      value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(acquiredValue),
      icon: DollarSign,
      subtext: `${acquiredLeads.length} vehicles acquired`,
      color: "#34d399",
    },
    {
      name: "Pipeline Value",
      value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(pipelineValue),
      icon: TrendingUp,
      subtext: `${pipelineLeads.length} active leads`,
      color: "#ff9147",
    },
    {
      name: "New This Week",
      value: newThisWeek.toString(),
      icon: Car,
      subtext: "Fresh leads imported",
      color: "#60a5fa",
    },
    {
      name: "Watching",
      value: watchingCount.toString(),
      icon: Eye,
      subtext: "Feed shortlist · matches current filters",
      color: "#ff9147",
    },
    {
      name: "Needs Follow-up",
      value: needsFollowUpCount.toString(),
      icon: CalendarClock,
      subtext: "Overdue next actions · matches current filters",
      color: "#f87171",
    },
    {
      name: "Projected Movement",
      value: formatSignedCurrency(projectedMovement),
      icon: TrendingUp,
      subtext: "12-month value outlook",
      color: "#a78bfa",
    },
  ];

  return (
    // Flex-wrap (not grid auto-fit) so a trailing card stretches to fill its
    // row instead of sitting beside empty tracks at mid laptop widths.
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 14,
        marginBottom: 24,
      }}
    >
      {stats.map((item) => (
        <div
          key={item.name}
          style={{
            flex: "1 1 200px",
            background: "var(--bg-card)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                background: `${item.color}1a`,
              }}
            >
              <item.icon style={{ width: 18, height: 18, color: item.color }} aria-hidden="true" />
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#8b9ab8", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {item.name}
            </p>
          </div>
          <p style={{ fontSize: 24, fontWeight: 900, color: "#f0f4ff", letterSpacing: "-0.02em", marginBottom: 4 }}>
            {item.value}
          </p>
          <p style={{ fontSize: 12, color: "#4a5670" }}>{item.subtext}</p>
        </div>
      ))}
    </div>
  );
}
