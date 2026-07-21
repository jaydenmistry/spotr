"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import LeadCard from "@/components/dashboard/LeadCard";
import LeadModal from "@/components/dashboard/modal/LeadModal";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Check } from "lucide-react";
import {
  EXOTIC_MAKES,
  filterLeads,
  SORT_OPTIONS,
  sortLeads,
  type LeadRecord,
  type LeadSortOrder,
  type MovementFilter,
} from "@/lib/vehicleAnalytics";

const PAGE_SIZE = 24;

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 13,
  color: "#f0f4ff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

function InventoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const pageParam = searchParams.get("page");
  const initialPage = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMakes, setSelectedMakes] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDistance, setMaxDistance] = useState("100");
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("All");
  
  // Sort and pagination
  const [sortOrder, setSortOrder] = useState<LeadSortOrder>("Distance (Nearest)");
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    const p = searchParams.get("page");
    const parsed = p ? Math.max(1, parseInt(p, 10) || 1) : 1;
    setPage(parsed);
  }, [searchParams]);

  const updatePageInUrl = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) {
      params.set("page", newPage.toString());
    } else {
      params.delete("page");
    }
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updatePageInUrl(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await axios.get<LeadRecord[]>("/api/leads");
        setLeads(res.data);
      } catch (error) {
        console.error("Failed to load inventory leads", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchLeads();
  }, []);

  // Reset to page 1 whenever any filter/sort changes
  const filterKey = JSON.stringify([searchTerm, selectedMakes, minPrice, maxPrice, maxDistance, movementFilter, sortOrder]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
    updatePageInUrl(1);
  }

  const filteredAndSortedLeads = useMemo(() => {
    const filtered = filterLeads(leads, {
      searchTerm,
      makeFilter: selectedMakes,
      minPrice,
      maxPrice,
      maxDistance,
      movementFilter,
    });

    return sortLeads(filtered, sortOrder);
  }, [leads, searchTerm, selectedMakes, minPrice, maxPrice, maxDistance, movementFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedLeads.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageLeads = filteredAndSortedLeads.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const makeCounts = useMemo(() => {
    const makeMap = new Map<string, number>();
    leads.forEach((lead) => {
      const make = lead.make;
      if (make) {
        makeMap.set(make, (makeMap.get(make) || 0) + 1);
      }
    });

    return Array.from(makeMap.entries())
      .map(([make, count]) => ({ make, count }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const toggleMake = (make: string) => {
    setSelectedMakes(prev => 
      prev.includes(make) 
        ? prev.filter(m => m !== make)
        : [...prev, make]
    );
  };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "60vh", alignItems: "center", justifyContent: "center", color: "#8b9ab8", fontSize: 15, gap: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,122,26,0.2)", borderTopColor: "#ff7a1a", animation: "spin 0.8s linear infinite" }} />
        Loading inventory…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 32, padding: "32px 28px", alignItems: "flex-start" }}>
      
      {/* ─── LEFT: MAIN CONTENT AREA ───────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Page header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", color: "#f0f4ff", marginBottom: 4 }}>
            Inventory
          </h1>
          <p style={{ fontSize: 13, color: "#8b9ab8" }}>
            Browse, filter, and sort all private party vehicles.
          </p>
        </div>

        {/* Action bar: Result count + Sort dropdown */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)", flexWrap: "wrap", gap: 16 }}>
          <p style={{ fontSize: 13, color: "#4a5670" }}>
            Showing <span style={{ fontWeight: 700, color: "#ff9147" }}>{(safePage - 1) * PAGE_SIZE + (filteredAndSortedLeads.length > 0 ? 1 : 0)}–{Math.min(safePage * PAGE_SIZE, filteredAndSortedLeads.length)}</span> of <span style={{ fontWeight: 700, color: "#f0f4ff" }}>{filteredAndSortedLeads.length}</span> results
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#4a5670", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sort by:</span>
            <div style={{ position: "relative" }}>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as LeadSortOrder)}
                style={{
                  ...inputStyle,
                  padding: "6px 32px 6px 12px",
                  appearance: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "#f0f4ff",
                  border: "none",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option} value={option} style={{ background: "#0f1520" }}>
                    {option}
                  </option>
                ))}
              </select>
              <ArrowUpDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#8b9ab8", pointerEvents: "none" }} />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
          {pageLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
          ))}
        </div>

        {filteredAndSortedLeads.length === 0 && (
          <div style={{ padding: "64px 20px", textAlign: "center", color: "#4a5670", fontSize: 14, background: "rgba(255,255,255,0.01)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.05)" }}>
            No vehicles found matching your specific filters.
          </div>
        )}

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: 24 }}>
            <PaginationControls
              page={safePage}
              totalPages={totalPages}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        )}
      </div>

      {/* ─── RIGHT: SIDEBAR FILTERS ──────────────────────────────── */}
      <aside style={{ width: 280, flexShrink: 0, position: "sticky", top: 32 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#f0f4ff", marginBottom: 20 }}>Filters</h2>

          {/* Search */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8b9ab8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Keyword Search</label>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5670", pointerEvents: "none" }} />
              <input
                type="text"
                style={{ ...inputStyle, paddingLeft: 34 }}
                placeholder="Make, model, VIN…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Price Range */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8b9ab8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Price Range</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Min $0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <span style={{ color: "#4a5670", fontSize: 12 }}>to</span>
              <input
                type="number"
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Distance */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8b9ab8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Distance</label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                style={{ ...inputStyle, paddingRight: 40 }}
                placeholder="Max radius"
                value={maxDistance}
                min={1}
                max={500}
                onChange={(e) => setMaxDistance(e.target.value)}
              />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#4a5670", pointerEvents: "none" }}>mi</span>
            </div>
          </div>

          {/* Movement Filter */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8b9ab8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Market Trend</label>
            <select
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value as MovementFilter)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="All" style={{ background: "#0f1520" }}>All Vehicles</option>
              <option value="Appreciating" style={{ background: "#0f1520" }}>Appreciating (Buy Watch)</option>
              <option value="Depreciating" style={{ background: "#0f1520" }}>Depreciating (Sell Risk)</option>
            </select>
          </div>

          {/* Make Checkboxes */}
          <div>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#8b9ab8", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span>Make</span>
              {selectedMakes.length > 0 && (
                <button 
                  onClick={() => setSelectedMakes([])}
                  style={{ background: "none", border: "none", color: "#ff7a1a", fontSize: 10, fontWeight: 700, cursor: "pointer", padding: 0 }}
                >
                  Clear All
                </button>
              )}
            </label>
            <div style={{ maxHeight: 220, overflowY: "auto", paddingRight: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {makeCounts.map(({ make, count }) => {
                const isSelected = selectedMakes.includes(make);
                return (
                  <div key={make} onClick={() => toggleMake(make)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <div style={{ 
                      width: 16, height: 16, borderRadius: 4, 
                      border: `1px solid ${isSelected ? "#ff7a1a" : "rgba(255,255,255,0.15)"}`,
                      background: isSelected ? "#ff7a1a" : "rgba(255,255,255,0.02)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s"
                    }}>
                      {isSelected && <Check style={{ width: 10, height: 10, color: "#fff", strokeWidth: 4 }} />}
                    </div>
                    <span style={{ fontSize: 13, color: isSelected ? "#f0f4ff" : "#8b9ab8", flex: 1, fontWeight: isSelected ? 600 : 400 }}>{make}</span>
                    <span style={{ fontSize: 11, color: "#4a5670" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </aside>

      {/* Modal */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onLeadUpdated={(updated) => {
            setLeads((current) => current.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
            setSelectedLead((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
          }}
        />
      )}
    </div>
  );
}

/* ─── Pagination Controls Component ──────────────────────────── */
function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [];
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
    }
    return pages;
  };

  const btnBase: React.CSSProperties = {
    display: "grid", placeItems: "center", minWidth: 34, height: 34, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#8b9ab8", transition: "all 0.15s", padding: "0 6px",
  };
  const activeBtnStyle: React.CSSProperties = { ...btnBase, background: "rgba(255,122,26,0.18)", border: "1px solid #ff7a1a", color: "#ff9147" };
  const disabledBtnStyle: React.CSSProperties = { ...btnBase, opacity: 0.3, cursor: "not-allowed" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} style={page === 1 ? disabledBtnStyle : btnBase}>
        <ChevronLeft style={{ width: 15, height: 15 }} />
      </button>
      {getPageNumbers().map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} style={{ color: "#4a5670", padding: "0 4px", fontSize: 13 }}>…</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p as number)} style={p === page ? activeBtnStyle : btnBase}>
            {p}
          </button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} style={page === totalPages ? disabledBtnStyle : btnBase}>
        <ChevronRight style={{ width: 15, height: 15 }} />
      </button>
    </div>
  );
}
