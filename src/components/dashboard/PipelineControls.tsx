"use client";

import { useState } from "react";
import { CalendarClock, Eye, Search, SlidersHorizontal, X } from "lucide-react";
import { MAKE_FILTER_OPTIONS, type MovementFilter } from "@/lib/vehicleAnalytics";
import { STAGES } from "@/lib/stages";
import type { Recommendation } from "@/lib/opportunity";

export type FollowUpFilter = "all" | "overdue" | "due-soon";
export type RecommendationFilter = "All" | Recommendation;

export interface PipelineFilterState {
  searchTerm: string;
  stage: string; // "All" or a STAGES value
  recommendation: RecommendationFilter;
  watchedOnly: boolean;
  followUp: FollowUpFilter;
  makeFilter: string;
  minPrice: string;
  maxPrice: string;
  movementFilter: MovementFilter;
}

export const EMPTY_PIPELINE_FILTERS: PipelineFilterState = {
  searchTerm: "",
  stage: "All",
  recommendation: "All",
  watchedOnly: false,
  followUp: "all",
  makeFilter: "All",
  minPrice: "",
  maxPrice: "",
  movementFilter: "All",
};

// A filter is "active" (worth a Clear-all button, and worth flagging in the
// result copy) when it diverges from the empty baseline. The view toggle is
// deliberately NOT a filter, so Clear-all never touches it.
export function hasActiveFilters(f: PipelineFilterState): boolean {
  return (
    f.searchTerm.trim() !== "" ||
    f.stage !== "All" ||
    f.recommendation !== "All" ||
    f.watchedOnly ||
    f.followUp !== "all" ||
    f.makeFilter !== "All" ||
    f.minPrice !== "" ||
    f.maxPrice !== "" ||
    f.movementFilter !== "All"
  );
}

const RECOMMENDATIONS: RecommendationFilter[] = ["All", "BUY", "INVESTIGATE", "WATCH", "PASS"];

// backgroundColor (not the `background` shorthand) so selects keep the
// global chevron background-image.
const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--fill)",
  border: "1px solid var(--separator)",
  borderRadius: 999,
  height: 36,
  padding: "0 14px",
  fontSize: 13,
  color: "var(--label)",
  width: "100%",
  boxSizing: "border-box",
};

const toggleStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 36,
  padding: "0 14px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  border: `1px solid ${active ? "transparent" : "var(--separator)"}`,
  background: active ? "rgba(var(--tint-rgb), 0.16)" : "var(--fill)",
  color: active ? "var(--tint-text)" : "var(--label-secondary)",
  transition: "background-color 180ms ease, color 180ms ease, transform var(--spring-bouncy-duration) var(--spring-bouncy)",
});

export default function PipelineControls({
  filters,
  onChange,
  onClearAll,
  overdueCount,
}: {
  filters: PipelineFilterState;
  onChange: (next: Partial<PipelineFilterState>) => void;
  onClearAll: () => void;
  /** Active leads currently overdue — shown on the Needs-follow-up toggle so
   *  buyers see the load without turning the filter on. */
  overdueCount: number;
}) {
  const [showMore, setShowMore] = useState(false);
  const active = hasActiveFilters(filters);

  return (
    <section
      aria-label="Pipeline filters"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--separator)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 16px",
        marginBottom: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Primary row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 200 }}>
          <Search
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 14,
              height: 14,
              color: "var(--label-secondary)",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          />
          <input
            type="text"
            aria-label="Search leads"
            style={{ ...inputStyle, paddingLeft: 34 }}
            placeholder="Search make, model, year, VIN…"
            value={filters.searchTerm}
            onChange={(e) => onChange({ searchTerm: e.target.value })}
          />
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, fontWeight: 600, color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Stage
          <select
            aria-label="Filter by stage"
            value={filters.stage}
            onChange={(e) => onChange({ stage: e.target.value })}
            style={{ ...inputStyle, cursor: "pointer", width: "auto" }}
          >
            <option value="All" style={{ background: "var(--bg-surface)" }}>All stages</option>
            {STAGES.map((stage) => (
              <option key={stage} value={stage} style={{ background: "var(--bg-surface)" }}>
                {stage}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, fontWeight: 600, color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Recommendation
          <select
            aria-label="Filter by recommendation"
            value={filters.recommendation}
            onChange={(e) => onChange({ recommendation: e.target.value as RecommendationFilter })}
            style={{ ...inputStyle, cursor: "pointer", width: "auto" }}
          >
            {RECOMMENDATIONS.map((rec) => (
              <option key={rec} value={rec} style={{ background: "var(--bg-surface)" }}>
                {rec === "All" ? "All recs" : rec}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          aria-pressed={filters.watchedOnly}
          onClick={() => onChange({ watchedOnly: !filters.watchedOnly })}
          className="pressable" style={toggleStyle(filters.watchedOnly)}
        >
          <Eye style={{ width: 13, height: 13 }} aria-hidden="true" />
          Watched
        </button>

        <button
          type="button"
          aria-pressed={filters.followUp !== "all"}
          onClick={() => onChange({ followUp: filters.followUp === "overdue" ? "all" : "overdue" })}
          className="pressable" style={toggleStyle(filters.followUp !== "all")}
        >
          <CalendarClock style={{ width: 13, height: 13 }} aria-hidden="true" />
          Needs follow-up
          <span
            style={{
              borderRadius: 999,
              padding: "1px 7px",
              fontSize: 11,
              fontWeight: 700,
              background: filters.followUp !== "all" ? "rgba(var(--tint-rgb), 0.25)" : "rgba(var(--ink-rgb), 0.08)",
            }}
          >
            {overdueCount}
          </span>
        </button>

        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
          className="pressable" style={toggleStyle(false)}
        >
          <SlidersHorizontal style={{ width: 13, height: 13 }} aria-hidden="true" />
          More filters
        </button>

        {active && (
          <button
            type="button"
            onClick={onClearAll}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid rgba(var(--red-rgb), 0.35)",
              background: "rgba(var(--red-rgb), 0.08)",
              color: "var(--red)",
              whiteSpace: "nowrap",
            }}
          >
            <X style={{ width: 13, height: 13 }} aria-hidden="true" />
            Clear all
          </button>
        )}
      </div>

      {/* More filters (price, distance-free legacy filters) */}
      {showMore && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            paddingTop: 10,
            borderTop: "1px solid var(--separator)",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Make
            <select
              aria-label="Filter by make"
              value={filters.makeFilter}
              onChange={(e) => onChange({ makeFilter: e.target.value })}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {MAKE_FILTER_OPTIONS.map((make) => (
                <option key={make} value={make} style={{ background: "var(--bg-surface)" }}>
                  {make}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Min price
            <input
              type="number"
              aria-label="Minimum price"
              style={inputStyle}
              placeholder="No minimum"
              value={filters.minPrice}
              onChange={(e) => onChange({ minPrice: e.target.value })}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Max price
            <input
              type="number"
              aria-label="Maximum price"
              style={inputStyle}
              placeholder="No maximum"
              value={filters.maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Spotr trend estimate
            <select
              aria-label="Filter by value movement"
              value={filters.movementFilter}
              onChange={(e) => onChange({ movementFilter: e.target.value as MovementFilter })}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option style={{ background: "var(--bg-surface)" }}>All</option>
              <option style={{ background: "var(--bg-surface)" }}>Appreciating</option>
              <option style={{ background: "var(--bg-surface)" }}>Depreciating</option>
            </select>
          </label>
        </div>
      )}
    </section>
  );
}
