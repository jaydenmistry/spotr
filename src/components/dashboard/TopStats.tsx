"use client";

import { Car, DollarSign, TrendingUp } from "lucide-react";
import { formatSignedCurrency, getVehicleAnalytics } from "@/lib/vehicleAnalytics";

interface Lead {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  price: number | null;
  miles: number | null;
  stage: string;
  createdAt: string;
}

export default function TopStats({ leads }: { leads: Lead[] }) {
  const acquiredLeads = leads.filter((l) => l.stage === "Acquired");
  const acquiredValue = acquiredLeads.reduce((sum, l) => sum + (l.price || 0), 0);

  const pipelineLeads = leads.filter((l) => !["Acquired", "Lost"].includes(l.stage));
  const pipelineValue = pipelineLeads.reduce((sum, l) => sum + (l.price || 0), 0);
  const projectedMovement = pipelineLeads.reduce(
    (sum, lead) => sum + getVehicleAnalytics(lead).projectedChangeDollars,
    0
  );

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newThisWeek = leads.filter((l) => new Date(l.createdAt) > oneWeekAgo).length;

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
      name: "Projected Movement",
      value: formatSignedCurrency(projectedMovement),
      icon: TrendingUp,
      subtext: "12-month value outlook",
      color: "#a78bfa",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 14,
        marginBottom: 24,
      }}
    >
      {stats.map((item) => (
        <div
          key={item.name}
          style={{
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
