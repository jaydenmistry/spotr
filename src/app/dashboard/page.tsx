"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import TopStats from "@/components/dashboard/TopStats";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import LeadModal from "@/components/dashboard/modal/LeadModal";
import { Database, MapPin, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import {
  EXOTIC_MAKES,
  filterLeads,
  getMakeFilterList,
  MAKE_FILTER_OPTIONS,
  type LeadRecord,
  type MovementFilter,
} from "@/lib/vehicleAnalytics";

interface FetchResponse {
  success: boolean;
  message: string;
  count: number;
  requested: number;
  returned: number;
  zipCode: string;
  radiusMiles: number;
  makes: string[];
  source: string;
}

/* ─── Shared input style ─────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "#f0f4ff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export default function DashboardPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingLeads, setFetchingLeads] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [makeFilter, setMakeFilter] = useState("All Exotics");
  const [minPrice, setMinPrice] = useState("75000");
  const [maxPrice, setMaxPrice] = useState("");
  const [zipCode, setZipCode] = useState("30043");
  const [radiusMiles, setRadiusMiles] = useState(100);
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("All");
  const [fetchLimit, setFetchLimit] = useState(1000);
  const [fetchMessage, setFetchMessage] = useState("");

  const fetchLocalLeads = async () => {
    try {
      const res = await axios.get<LeadRecord[]>("/api/leads");
      setLeads(res.data);
    } catch (error) {
      console.error("Failed to load leads", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadLeads = async () => {
      try {
        const res = await axios.get<LeadRecord[]>("/api/leads");
        if (isActive) {
          setLeads(res.data);
        }
      } catch (error) {
        console.error("Failed to load leads", error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadLeads();

    return () => {
      isActive = false;
    };
  }, []);

  const handleFindNewLeads = async () => {
    setFetchingLeads(true);
    setFetchMessage("");
    try {
      const makes = getMakeFilterList(makeFilter).length > 0 ? getMakeFilterList(makeFilter) : EXOTIC_MAKES;
      const response = await axios.post<FetchResponse>("/api/leads/fetch", {
        limit: fetchLimit,
        makes,
        minPrice: Number(minPrice) || undefined,
        maxPrice: Number(maxPrice) || undefined,
        zipCode,
        radiusMiles,
      });
      setFetchMessage(`${response.data.message} from ${response.data.source} near ${response.data.zipCode} within ${response.data.radiusMiles} mi.`);
      await fetchLocalLeads();
    } catch (error) {
      console.error("Failed to fetch new leads from API", error);
      alert("Failed to fetch leads. Please try again.");
    } finally {
      setFetchingLeads(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return filterLeads(leads, {
      searchTerm,
      makeFilter: getMakeFilterList(makeFilter),
      minPrice,
      maxPrice,
      maxDistance: radiusMiles.toString(),
      movementFilter,
    });
  }, [leads, searchTerm, makeFilter, minPrice, maxPrice, radiusMiles, movementFilter]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "60vh",
          alignItems: "center",
          justifyContent: "center",
          color: "#8b9ab8",
          fontSize: 15,
          gap: 10,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "2px solid rgba(255,122,26,0.2)",
            borderTopColor: "#ff7a1a",
            animation: "spin 0.8s linear infinite",
          }}
        />
        Loading dashboard…
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 28px" }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: "#f0f4ff",
              marginBottom: 4,
            }}
          >
            Pipeline
          </h1>
          <p style={{ fontSize: 13, color: "#8b9ab8" }}>
            Private party acquisition leads with AI scoring and value movement filters.
          </p>
        </div>

        {/* Fetch controls */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 12px",
              borderRadius: 10,
              background: "var(--bg-card)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 13,
              fontWeight: 600,
              color: "#8b9ab8",
              cursor: "pointer",
            }}
          >
            <MapPin style={{ width: 14, height: 14, color: "#ff7a1a", flexShrink: 0 }} />
            ZIP
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              style={{
                width: 56,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 13,
                color: "#f0f4ff",
                outline: "none",
              }}
              placeholder="30043"
            />
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 12px",
              borderRadius: 10,
              background: "var(--bg-card)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 13,
              fontWeight: 600,
              color: "#8b9ab8",
              cursor: "pointer",
            }}
          >
            Radius
            <input
              type="number"
              min={10}
              max={100}
              step={10}
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Math.max(10, Math.min(100, Number(e.target.value) || 100)))}
              style={{
                width: 52,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 13,
                color: "#f0f4ff",
                outline: "none",
              }}
            />
            mi
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 12px",
              borderRadius: 10,
              background: "var(--bg-card)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 13,
              fontWeight: 600,
              color: "#8b9ab8",
              cursor: "pointer",
            }}
          >
            <Database style={{ width: 14, height: 14, color: "#ff7a1a", flexShrink: 0 }} />
            Pull
            <input
              type="number"
              min={100}
              max={1500}
              step={100}
              value={fetchLimit}
              onChange={(e) => setFetchLimit(Math.max(100, Math.min(1500, Number(e.target.value) || 1000)))}
              style={{
                width: 60,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 13,
                color: "#f0f4ff",
                outline: "none",
              }}
            />
          </label>

          <button
            onClick={handleFindNewLeads}
            disabled={fetchingLeads}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 18px",
              borderRadius: 10,
              border: "none",
              cursor: fetchingLeads ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              background: fetchingLeads ? "rgba(255,122,26,0.4)" : "linear-gradient(135deg, #ff7a1a, #f59e0b)",
              boxShadow: fetchingLeads ? "none" : "0 4px 16px rgba(255,122,26,0.35)",
              transition: "opacity 0.15s",
            }}
          >
            <RefreshCw
              style={{
                width: 14,
                height: 14,
                animation: fetchingLeads ? "spin 0.8s linear infinite" : "none",
              }}
            />
            Pull Listings
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "18px 20px",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
            fontSize: 13,
            fontWeight: 700,
            color: "#f0f4ff",
          }}
        >
          <SlidersHorizontal style={{ width: 15, height: 15, color: "#ff7a1a" }} />
          Acquisition Filters
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
          }}
        >
          {/* Search */}
          <div style={{ position: "relative", gridColumn: "span 2" }}>
            <Search
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 14,
                height: 14,
                color: "#4a5670",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              style={{ ...inputStyle, paddingLeft: 34 }}
              placeholder="Search Lamborghini, Ferrari, Porsche, VIN…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={makeFilter}
            onChange={(e) => setMakeFilter(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {MAKE_FILTER_OPTIONS.map((make) => (
              <option key={make} value={make} style={{ background: "#0f1520" }}>
                {make}
              </option>
            ))}
          </select>

          <input
            type="number"
            style={inputStyle}
            placeholder="Min price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />

          <input
            type="number"
            style={inputStyle}
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />

          <select
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value as MovementFilter)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option style={{ background: "#0f1520" }}>All</option>
            <option style={{ background: "#0f1520" }}>Appreciating</option>
            <option style={{ background: "#0f1520" }}>Depreciating</option>
          </select>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#4a5670",
          }}
        >
          <span style={{ fontWeight: 700, color: "#ff9147" }}>{filteredLeads.length}</span>
          <span>of {leads.length} listings shown</span>
          <span style={{ color: "#1e2a3a" }}>·</span>
          <span>ZIP {zipCode || "30043"} · {radiusMiles} mi radius</span>
        </div>

        {fetchMessage && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(255,122,26,0.1)",
              border: "1px solid rgba(255,122,26,0.2)",
              fontSize: 13,
              fontWeight: 600,
              color: "#ff9147",
            }}
          >
            {fetchMessage}
          </div>
        )}
      </div>

      <TopStats leads={filteredLeads} />

      <KanbanBoard
        leads={filteredLeads}
        onLeadClick={(lead) => setSelectedLead(lead)}
        onLeadUpdate={(updatedLeads) => {
          const updatedById = new Map(updatedLeads.map((lead) => [lead.id, lead]));
          setLeads((currentLeads) => currentLeads.map((lead) => updatedById.get(lead.id) || lead));
        }}
      />

      {selectedLead && (
        <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
