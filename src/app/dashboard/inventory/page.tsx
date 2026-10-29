"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import LeadCard from "@/components/dashboard/LeadCard";
import { PageHeader } from "@/components/ui/PageHeader";
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

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96] as const;
const DEFAULT_PAGE_SIZE = 24;

const inputStyle: React.CSSProperties = {
  background: "var(--fill)",
  border: "1px solid var(--separator-strong)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 14px",
  fontSize: 13,
  color: "var(--label)",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.2s",
};

function InventoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const initialPage = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const initialPageSize = limitParam && PAGE_SIZE_OPTIONS.includes(Number(limitParam) as typeof PAGE_SIZE_OPTIONS[number])
    ? Number(limitParam)
    : DEFAULT_PAGE_SIZE;

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
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    const p = searchParams.get("page");
    const parsed = p ? Math.max(1, parseInt(p, 10) || 1) : 1;
    setPage(parsed);
  }, [searchParams]);

  const updatePageInUrl = (newPage: number, newSize: number = pageSize) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) {
      params.set("page", newPage.toString());
    } else {
      params.delete("page");
    }
    if (newSize !== DEFAULT_PAGE_SIZE) {
      params.set("limit", newSize.toString());
    } else {
      params.delete("limit");
    }
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updatePageInUrl(newPage);
    const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
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

  // Reset to page 1 whenever any filter/sort/pageSize changes
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setPage(1);
    updatePageInUrl(1);
  }, [searchTerm, selectedMakes, minPrice, maxPrice, maxDistance, movementFilter, sortOrder, pageSize]);

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

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedLeads.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageLeads = filteredAndSortedLeads.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
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
      <div className="page" aria-busy="true">
        <div className="skeleton" style={{ width: 180, height: 36, marginBottom: 10 }} />
        <p className="t-footnote" style={{ color: "var(--label-secondary)", marginBottom: 28 }}>Loading inventory…</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: 300, borderRadius: "var(--radius-lg)", animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: "none" }}>
      <PageHeader title="Inventory" subtitle="Browse, filter, and sort all private party vehicles. Prices shown are listing asking prices." />
      <div className="inventory-layout">
      
      {/* ─── LEFT: MAIN CONTENT AREA ───────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Action bar: Result count + Per Page + Sort dropdown */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--separator)", flexWrap: "wrap", gap: 16 }}>
          <p className="tabular" style={{ fontSize: 13, color: "var(--label-secondary)" }}>
            Showing <span style={{ fontWeight: 600, color: "var(--label)" }}>{(safePage - 1) * pageSize + (filteredAndSortedLeads.length > 0 ? 1 : 0)}–{Math.min(safePage * pageSize, filteredAndSortedLeads.length)}</span> of <span style={{ fontWeight: 600, color: "var(--label)" }}>{filteredAndSortedLeads.length}</span> results
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Items Per Page selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="t-eyebrow" style={{ color: "var(--label-secondary)" }}>Per page</span>
              <div style={{ position: "relative" }}>
                <select
                  aria-label="Results per page"
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    setPage(1);
                    updatePageInUrl(1, newSize);
                  }}
                  style={{
                    ...inputStyle,
                    padding: "6px 28px 6px 12px",
                    appearance: "none",
                    cursor: "pointer",
                    fontWeight: 500,
                    color: "var(--label)",
                    border: "1px solid var(--separator)",
                    borderRadius: 999,
                    background: "var(--fill)",
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size} style={{ background: "var(--bg-surface)" }}>
                      {size}
                    </option>
                  ))}
                </select>
                <ArrowUpDown style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--label-secondary)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Sort dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="t-eyebrow" style={{ color: "var(--label-secondary)" }}>Sort by</span>
              <div style={{ position: "relative" }}>
                <select
                  aria-label="Sort by"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as LeadSortOrder)}
                  style={{
                    ...inputStyle,
                    padding: "6px 32px 6px 12px",
                    appearance: "none",
                    cursor: "pointer",
                    fontWeight: 500,
                    color: "var(--label)",
                    border: "1px solid var(--separator)",
                    borderRadius: 999,
                    background: "var(--fill)",
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option} value={option} style={{ background: "var(--bg-surface)" }}>
                      {option}
                    </option>
                  ))}
                </select>
                <ArrowUpDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--label-secondary)", pointerEvents: "none" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
          {pageLeads.map((lead, index) => (
            <div key={lead.id} className="rise-in" style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}>
              <LeadCard lead={lead} onClick={() => setSelectedLead(lead)} />
            </div>
          ))}
        </div>

        {filteredAndSortedLeads.length === 0 && (
          <div className="pop-in" style={{ padding: "64px 20px", textAlign: "center", color: "var(--label-secondary)", fontSize: 14, background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--separator)" }}>
            No vehicles found matching your specific filters.
          </div>
        )}

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: 24 }}>
            <PaginationControls
              page={safePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* ─── RIGHT: SIDEBAR FILTERS ──────────────────────────────── */}
      <aside className="inventory-filters">
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--separator)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <h2 className="t-headline" style={{ color: "var(--label)", marginBottom: 20 }}>Filters</h2>

          {/* Search */}
          <div style={{ marginBottom: 24 }}>
            <label className="t-eyebrow" style={{ display: "block", color: "var(--label-secondary)", marginBottom: 8 }}>Keyword Search</label>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--label-secondary)", pointerEvents: "none" }} />
              <input
                aria-label="Keyword search"
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
            <label className="t-eyebrow" style={{ display: "block", color: "var(--label-secondary)", marginBottom: 8 }}>Price Range</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                aria-label="Minimum asking price"
                type="number"
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Min $0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <span style={{ color: "var(--label-secondary)", fontSize: 12 }}>to</span>
              <input
                aria-label="Maximum asking price"
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
            <label className="t-eyebrow" style={{ display: "block", color: "var(--label-secondary)", marginBottom: 8 }}>Distance</label>
            <div style={{ position: "relative" }}>
              <input
                aria-label="Maximum distance in miles"
                type="number"
                style={{ ...inputStyle, paddingRight: 40 }}
                placeholder="Max radius"
                value={maxDistance}
                min={1}
                max={500}
                onChange={(e) => setMaxDistance(e.target.value)}
              />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--label-secondary)", pointerEvents: "none" }}>mi</span>
            </div>
          </div>

          {/* Movement Filter */}
          <div style={{ marginBottom: 24 }}>
            <label className="t-eyebrow" style={{ display: "block", color: "var(--label-secondary)", marginBottom: 8 }}>Spotr trend estimate</label>
            <select
              aria-label="Spotr trend estimate"
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value as MovementFilter)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="All" style={{ background: "var(--bg-surface)" }}>All Vehicles</option>
              <option value="Appreciating" style={{ background: "var(--bg-surface)" }}>Appreciating (Buy Watch)</option>
              <option value="Depreciating" style={{ background: "var(--bg-surface)" }}>Depreciating (Sell Risk)</option>
            </select>
          </div>

          {/* Make Checkboxes */}
          <div>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "var(--label-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span>Make</span>
              {selectedMakes.length > 0 && (
                <button 
                  onClick={() => setSelectedMakes([])}
                  style={{ background: "none", border: "none", color: "var(--tint)", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  Clear All
                </button>
              )}
            </label>
            <div style={{ maxHeight: 220, overflowY: "auto", paddingRight: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {makeCounts.map(({ make, count }) => {
                const isSelected = selectedMakes.includes(make);
                return (
                  <button
                    key={make}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleMake(make)}
                    className="hover-fill"
                    style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", width: "100%", padding: "4px 6px", margin: "0 -6px", border: "none", borderRadius: "var(--radius-xs)", background: "transparent", textAlign: "left" }}
                  >
                    <div style={{ 
                      width: 16, height: 16, borderRadius: 4, 
                      border: `1px solid ${isSelected ? "var(--tint)" : "rgba(var(--ink-rgb), 0.15)"}`,
                      background: isSelected ? "var(--tint)" : "rgba(var(--ink-rgb), 0.02)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s"
                    }}>
                      {isSelected && <Check style={{ width: 10, height: 10, color: "#fff", strokeWidth: 4 }} />}
                    </div>
                    <span style={{ fontSize: 13, color: isSelected ? "var(--label)" : "var(--label-secondary)", flex: 1, fontWeight: isSelected ? 600 : 400 }}>{make}</span>
                    <span className="tabular" style={{ fontSize: 12, color: "var(--label-secondary)" }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </aside>

      </div>

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
    display: "grid", placeItems: "center", minWidth: 34, height: 34, borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: "pointer",
    border: "1px solid var(--separator)", background: "var(--fill)", color: "var(--label-secondary)", padding: "0 8px", fontVariantNumeric: "tabular-nums",
  };
  const activeBtnStyle: React.CSSProperties = { ...btnBase, background: "var(--tint)", border: "1px solid transparent", color: "var(--on-tint)", fontWeight: 600 };
  const disabledBtnStyle: React.CSSProperties = { ...btnBase, opacity: 0.3, cursor: "not-allowed" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Previous page" className="pressable" style={page === 1 ? disabledBtnStyle : btnBase}>
        <ChevronLeft style={{ width: 15, height: 15 }} />
      </button>
      {getPageNumbers().map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} style={{ color: "var(--label-secondary)", padding: "0 4px", fontSize: 13 }}>…</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p as number)} className="pressable" aria-current={p === page ? "page" : undefined} style={p === page ? activeBtnStyle : btnBase}>
            {p}
          </button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} aria-label="Next page" className="pressable" style={page === totalPages ? disabledBtnStyle : btnBase}>
        <ChevronRight style={{ width: 15, height: 15 }} />
      </button>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", height: "60vh", alignItems: "center", justifyContent: "center", color: "var(--label-secondary)", fontSize: 15, gap: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(var(--tint-rgb), 0.2)", borderTopColor: "var(--tint)", animation: "spin 0.8s linear infinite" }} />
          Loading inventory…
        </div>
      }
    >
      <InventoryContent />
    </Suspense>
  );
}
