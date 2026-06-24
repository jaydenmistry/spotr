"use client";

import { useState } from "react";
import {
  ExternalLink,
  Gauge,
  Hash,
  MapPin,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import Image from "next/image";
import ChatMock from "./ChatMock";
import CarfaxMock from "./CarfaxMock";
import ValueTrendGraph from "../ValueTrendGraph";
import {
  formatCurrency,
  formatDistance,
  formatSignedCurrency,
  formatSignedPercent,
  getVehicleTitle,
  getVehicleAnalytics,
  isVerifiedListing,
} from "@/lib/vehicleAnalytics";

interface Lead {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
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
}

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

/* Stat mini-card */
function StatCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "12px 14px",
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 600, color: "#4a5670", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 800, color: valueColor ?? "#f0f4ff" }}>{value}</p>
    </div>
  );
}

export default function LeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"details" | "chat" | "carfax">("details");
  const analytics = getVehicleAnalytics(lead);
  const isAppreciating = analytics.movement === "Appreciating";
  const verified = isVerifiedListing(lead);
  const TrendIcon = isAppreciating ? TrendingUp : TrendingDown;
  const trendColor = isAppreciating ? "#34d399" : "#ff9147";

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
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: "-0.01em",
                color: "#f0f4ff",
              }}
            >
              {getVehicleTitle(lead)}
            </h2>
            <p style={{ fontSize: 13, color: "#8b9ab8", marginTop: 2 }}>
              {lead.city}, {lead.state} · {formatDistance(lead.distanceMiles)}
            </p>
          </div>
          <button
            onClick={onClose}
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
          {(["details", "chat", "carfax"] as const).map((tab) => {
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
                {tab}
              </button>
            );
          })}
        </div>

        {/* ── Content ────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {/* ── DETAILS TAB ─── */}
          {activeTab === "details" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
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
                  Vehicle Info
                </h3>
                <DetailRow label="Listing" value={getVehicleTitle(lead)} />
                <DetailRow label="VIN" value={lead.vin || "Not supplied"} icon={Hash} />
                <DetailRow
                  label="Mileage"
                  value={lead.miles ? `${new Intl.NumberFormat("en-US").format(lead.miles)} mi` : "Unknown"}
                  icon={Gauge}
                />
                <DetailRow label="Location" value={`${lead.city}, ${lead.state}`} icon={MapPin} />
                <DetailRow label="Distance" value={formatDistance(lead.distanceMiles)} />
                <DetailRow
                  label="Search area"
                  value={`${lead.searchZip || "Unknown"} · ${lead.searchRadius || "?"} mi`}
                />
              </div>

              {/* Listing info panel */}
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
                  Listing Info
                </h3>
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
                  label="Asking Price"
                  value={
                    <span style={{ fontSize: 16, fontWeight: 900, color: "#ff9147" }}>
                      {formatCurrency(lead.price)}
                    </span>
                  }
                />
                <DetailRow label="Seller" value={lead.sellerName || "Private Party"} />
                <DetailRow label="Source" value={lead.source || "Unknown"} />
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

              {/* Analyzer panel — full width */}
              <div
                style={{
                  gridColumn: "1 / -1",
                  background: "var(--bg-card)",
                  borderRadius: 14,
                  padding: "20px 20px",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {/* Analyzer header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 18,
                    gap: 12,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 15,
                        fontWeight: 800,
                        color: "#f0f4ff",
                        marginBottom: 4,
                      }}
                    >
                      <Target style={{ width: 16, height: 16, color: "#ff7a1a" }} />
                      Listing Analyzer
                    </h3>
                    <p style={{ fontSize: 12, color: "#8b9ab8" }}>
                      Mileage-adjusted fair value, deal score, and value signal.
                    </p>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      borderRadius: 100,
                      padding: "5px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      background: isAppreciating ? "rgba(52,211,153,0.15)" : "rgba(255,122,26,0.12)",
                      color: trendColor,
                      flexShrink: 0,
                    }}
                  >
                    <TrendIcon style={{ width: 13, height: 13 }} />
                    {analytics.movement}
                  </span>
                </div>

                {/* Asking + Mileage */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <StatCard label="Asking Price" value={formatCurrency(lead.price)} />
                  <StatCard
                    label="Mileage"
                    value={lead.miles ? `${new Intl.NumberFormat("en-US").format(lead.miles)} mi` : "Unknown"}
                  />
                </div>

                {/* Deal score banner */}
                <div
                  style={{
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 14,
                    background:
                      analytics.dealScore === "Great deal"
                        ? "rgba(52,211,153,0.08)"
                        : "rgba(255,122,26,0.08)",
                    border: `1px solid ${
                      analytics.dealScore === "Great deal"
                        ? "rgba(52,211,153,0.2)"
                        : "rgba(255,122,26,0.2)"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color:
                          analytics.dealScore === "Great deal" ? "#34d399" : "#ff9147",
                        marginBottom: 3,
                      }}
                    >
                      {analytics.dealScore}
                    </p>
                    <p style={{ fontSize: 12, color: "#8b9ab8" }}>
                      {formatSignedCurrency(analytics.fairValueSpread)} vs mileage-adjusted fair value
                    </p>
                    <p style={{ fontSize: 11, color: "#4a5670", marginTop: 4 }}>
                      Based on {analytics.compCount} comparable sales · downside risk: {analytics.downsideRisk}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 11, color: "#4a5670", marginBottom: 3 }}>Fair value</p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: "#f0f4ff" }}>
                      {formatCurrency(analytics.estimatedMarketValue)}
                    </p>
                  </div>
                </div>

                {/* Graph + stat grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 0.8fr",
                    gap: 14,
                  }}
                >
                  {/* Graph */}
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: "rgba(255,255,255,0.02)",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#f0f4ff" }}>
                          {analytics.signalLabel}
                        </p>
                        <p style={{ fontSize: 11, color: "#8b9ab8" }}>
                          Value signal · {analytics.confidence}% confidence
                        </p>
                      </div>
                      <span
                        style={{
                          borderRadius: 100,
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          background: "rgba(255,122,26,0.15)",
                          color: "#ff9147",
                        }}
                      >
                        {analytics.signalAction}
                      </span>
                    </div>
                    <ValueTrendGraph points={analytics.graphPoints} movement={analytics.movement} />
                  </div>

                  {/* Stat grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <StatCard
                      label="Est. Market"
                      value={formatCurrency(analytics.estimatedMarketValue)}
                    />
                    <StatCard
                      label="12-mo Move"
                      value={formatSignedCurrency(analytics.projectedChangeDollars)}
                      valueColor={trendColor}
                    />
                    <StatCard
                      label="Trend %"
                      value={formatSignedPercent(analytics.projectedChangePercent)}
                      valueColor={trendColor}
                    />
                    <StatCard label="Best Month" value={analytics.bestMonth} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "chat" && <ChatMock leadId={lead.id} sellerName={lead.sellerName} />}
          {activeTab === "carfax" && <CarfaxMock vdpUrl={lead.vdp_url} source={lead.source} />}
        </div>
      </div>
    </div>
  );
}
