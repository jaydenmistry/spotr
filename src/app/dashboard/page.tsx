"use client";

import { AnimatePresence, motion } from "motion/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { spring } from "@/lib/motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import TopStats from "@/components/dashboard/TopStats";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import NeedsAttentionList from "@/components/dashboard/NeedsAttentionList";
import PipelineControls, {
  EMPTY_PIPELINE_FILTERS,
  hasActiveFilters,
  type PipelineFilterState,
} from "@/components/dashboard/PipelineControls";
import OutcomeReasonDialog from "@/components/dashboard/OutcomeReasonDialog";
import LeadModal from "@/components/dashboard/modal/LeadModal";
import { Database, LayoutGrid, ListChecks, MapPin, RefreshCw } from "lucide-react";
import {
  filterLeads,
  getMakeFilterList,
  type LeadRecord,
} from "@/lib/vehicleAnalytics";
import { FOLLOW_UP_TICK_MS, getFollowUpStatus } from "@/lib/followUp";
import { isTerminalStage } from "@/lib/stages";
import type { Recommendation } from "@/lib/opportunity";
import { buildAssessmentMap } from "@/lib/pipeline";
import { DEFAULT_BUY_BOX, type BuyBoxConfig } from "@/lib/buyBox";
import type { FeedAction } from "@/lib/feedActions";
import type { OutcomeReasonCode } from "@/lib/followUp";

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

type ViewMode = "attention" | "board";

const toolbarFieldStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  height: 36,
  padding: "0 6px 0 12px",
  borderRadius: 999,
  background: "var(--fill)",
  border: "1px solid var(--separator)",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--label-secondary)",
};

const toolbarInputStyle: React.CSSProperties = {
  height: 26,
  background: "var(--bg-card)",
  border: "1px solid var(--separator)",
  borderRadius: 999,
  padding: "0 9px",
  fontSize: 13,
  color: "var(--label)",
};

const bannerStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: "11px 16px",
  borderRadius: "var(--radius-md)",
  fontSize: 13,
  fontWeight: 500,
  overflow: "hidden",
};

const bannerMotion = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: spring.snappy,
} as const;

export default function DashboardPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyBox, setBuyBox] = useState<BuyBoxConfig>(DEFAULT_BUY_BOX);
  const [fetchingLeads, setFetchingLeads] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);

  const [filters, setFilters] = useState<PipelineFilterState>(EMPTY_PIPELINE_FILTERS);
  const [zipCode, setZipCode] = useState("30043");
  const [radiusMiles, setRadiusMiles] = useState(100);
  const [fetchLimit, setFetchLimit] = useState(1000);
  const [fetchMessage, setFetchMessage] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [pendingPass, setPendingPass] = useState<string | null>(null);

  // View is user-owned once resolved: default is decided a single time after
  // the first load, then never auto-changed by follow-up edits, filters, or
  // stage moves.
  const [viewMode, setViewMode] = useState<ViewMode | null>(null);
  const viewResolved = useRef(false);

  // One shared clock for every follow-up readout on this page (badge, stats,
  // filter, needs-attention ordering), so they can never disagree.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), FOLLOW_UP_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const fetchLocalLeads = useCallback(async () => {
    try {
      const res = await axios.get<LeadRecord[]>("/api/leads");
      setLeads(res.data);
    } catch (error) {
      console.error("Failed to load leads", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const [leadsRes, buyBoxRes] = await Promise.all([
          axios.get<LeadRecord[]>("/api/leads"),
          axios
            .get<{ config: BuyBoxConfig }>("/api/buybox")
            .catch(() => ({ data: { config: DEFAULT_BUY_BOX } })),
        ]);
        if (!isActive) return;
        setLeads(leadsRes.data);
        setBuyBox(buyBoxRes.data.config ?? DEFAULT_BUY_BOX);
      } catch (error) {
        console.error("Failed to load leads", error);
      } finally {
        if (isActive) setLoading(false);
      }
    };
    void load();
    return () => {
      isActive = false;
    };
  }, []);

  const handleFindNewLeads = async () => {
    setFetchingLeads(true);
    setFetchMessage("");
    try {
      const response = await axios.post<FetchResponse>("/api/leads/fetch", {
        limit: fetchLimit,
        makes: [],
        zipCode,
        radiusMiles,
      });
      setFetchMessage(
        `${response.data.message} from ${response.data.source} near ${response.data.zipCode} within ${response.data.radiusMiles} mi.`
      );
      await fetchLocalLeads();
    } catch (error) {
      console.error("Failed to fetch new leads from API", error);
      setFetchMessage("Failed to fetch leads. Please try again.");
    } finally {
      setFetchingLeads(false);
    }
  };

  // Recommendation + score per lead id, computed in ONE assessment pass and
  // recomputed only when leads or the buy box change. Shared by the board
  // chips, the needs-attention list (both its score-sort and card chips), and
  // the recommendation filter, so nothing drifts and nothing reassesses on the
  // 60s tick.
  const assessmentMap = useMemo(
    () => buildAssessmentMap(leads, buyBox, now),
    // now intentionally excluded: scoring isn't meaningfully time-sensitive
    // (day-level listing age), and re-running the assessment every tick would
    // be wasteful.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads, buyBox]
  );
  const recommendationOf = useCallback(
    (lead: LeadRecord): Recommendation | undefined => assessmentMap.get(lead.id)?.recommendation,
    [assessmentMap]
  );
  const scoreOf = useCallback(
    (lead: LeadRecord) => assessmentMap.get(lead.id)?.score ?? 0,
    [assessmentMap]
  );

  // Non-view filters applied to the full lead set. Stats and both views all
  // read from this, so header counts describe the same set the views render.
  const filteredLeads = useMemo(() => {
    const base = filterLeads(leads, {
      searchTerm: filters.searchTerm,
      makeFilter: getMakeFilterList(filters.makeFilter),
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      // Distance is NOT filtered here: the pipeline shows every eligible lead
      // regardless of how far it is. The pull radius is an ingestion setting,
      // never a hidden view filter that silently drops far-away leads.
      maxDistance: "",
      movementFilter: filters.movementFilter,
    });
    return base.filter((lead) => {
      if (filters.stage !== "All" && lead.stage !== filters.stage) return false;
      if (filters.recommendation !== "All" && assessmentMap.get(lead.id)?.recommendation !== filters.recommendation) {
        return false;
      }
      if (filters.watchedOnly && !lead.watchedAt) return false;
      if (filters.followUp !== "all") {
        // Follow-up filters intersect with everything else (never replace).
        if (getFollowUpStatus(lead, now) !== filters.followUp) return false;
      }
      return true;
    });
  }, [leads, filters, assessmentMap, now]);

  // Count of active leads whose follow-up is overdue — drives the control-bar
  // badge. Independent of whether the follow-up filter is currently on.
  const overdueActiveCount = useMemo(
    () =>
      leads.filter(
        (l) => !isTerminalStage(l.stage) && !l.passedAt && getFollowUpStatus(l, now) === "overdue"
      ).length,
    [leads, now]
  );

  // Resolve the default view once, after the first real load: Needs Attention
  // only if something is overdue or due soon among active leads.
  useEffect(() => {
    if (loading || viewResolved.current) return;
    viewResolved.current = true;
    const hasAttention = leads.some((l) => {
      if (isTerminalStage(l.stage) || l.passedAt) return false;
      const s = getFollowUpStatus(l, now);
      return s === "overdue" || s === "due-soon";
    });
    setViewMode(hasAttention ? "attention" : "board");
    // Only the initial resolution matters; deps kept minimal on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, leads]);

  const updateFilters = useCallback((next: Partial<PipelineFilterState>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);
  const clearAllFilters = useCallback(() => setFilters(EMPTY_PIPELINE_FILTERS), []);

  const applyLeadUpdate = useCallback((updated: LeadRecord) => {
    setLeads((current) => current.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    setSelectedLead((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  }, []);

  // Watch / Assign / Pass / unpass from the dossier — same validated flow the
  // feed uses. Pass is intercepted for a reason; nothing bypasses it.
  const performAction = useCallback(
    async (leadId: string, action: FeedAction, extra?: { reason: OutcomeReasonCode; note: string | null }) => {
      setBusyLeadId(leadId);
      setActionError(null);
      try {
        const res = await axios.post<LeadRecord>("/api/leads/action", {
          leadId,
          action,
          ...(extra ? { reason: extra.reason, note: extra.note ?? undefined } : {}),
        });
        applyLeadUpdate(res.data);
      } catch (error) {
        console.error("Pipeline action failed", error);
        setActionError(
          axios.isAxiosError(error) && error.response?.status === 401
            ? "Your session has expired. Please sign in again."
            : axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
            ? error.response.data.error
            : "That action didn't save. Please try again."
        );
      } finally {
        setBusyLeadId(null);
      }
    },
    [applyLeadUpdate]
  );

  const handleAction = useCallback(
    (leadId: string, action: FeedAction) => {
      if (action === "pass") {
        setPendingPass(leadId);
        return;
      }
      void performAction(leadId, action);
    },
    [performAction]
  );

  // Mark done from a Needs Attention row — completes the active next action.
  const completeNextAction = useCallback(
    async (lead: LeadRecord) => {
      setBusyLeadId(lead.id);
      setActionError(null);
      try {
        const res = await axios.post<{ lead: LeadRecord }>("/api/leads/followup", {
          leadId: lead.id,
          op: "complete-next-action",
        });
        applyLeadUpdate(res.data.lead);
      } catch (error) {
        console.error("Complete next action failed", error);
        setActionError("Couldn't mark that done. Please try again.");
      } finally {
        setBusyLeadId(null);
      }
    },
    [applyLeadUpdate]
  );

  if (loading || viewMode === null) {
    return (
      <div className="page" aria-busy="true">
        <div className="skeleton" style={{ width: 180, height: 36, marginBottom: 10 }} />
        <p className="t-footnote" style={{ color: "var(--label-secondary)", marginBottom: 28 }}>Loading pipeline…</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 320, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      </div>
    );
  }

  const filtersActive = hasActiveFilters(filters);
  const priceFilterActive = filters.minPrice !== "" || filters.maxPrice !== "";

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 40px)", maxWidth: "none" }}>
      {/* Pass requires a standardized reason */}
      {pendingPass && (
        <OutcomeReasonDialog
          title="Pass on this vehicle"
          description="A standardized reason keeps the pipeline honest about why opportunities were rejected."
          confirmLabel="Pass"
          busy={busyLeadId === pendingPass}
          onCancel={() => setPendingPass(null)}
          onConfirm={(reason, note) => {
            const id = pendingPass;
            void performAction(id, "pass", { reason, note }).finally(() => setPendingPass(null));
          }}
        />
      )}

      <PageHeader
        title="Pipeline"
        subtitle="Your acquisition command center — what needs action, what's worth pursuing, and what happened last."
        actions={
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <label style={toolbarFieldStyle}>
            <MapPin style={{ width: 14, height: 14, color: "var(--tint)", flexShrink: 0 }} aria-hidden="true" />
            ZIP
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              aria-label="ZIP code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className="tabular" style={{ ...toolbarInputStyle, width: 66 }}
              placeholder="30043"
            />
          </label>
          <label style={toolbarFieldStyle}>
            {/* Ingestion radius for Pull Listings only — it does NOT filter the
                board/attention views (every eligible lead is always shown). */}
            Radius
            <input
              type="number"
              min={10}
              max={100}
              step={10}
              aria-label="Pull radius in miles"
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Math.max(10, Math.min(100, Number(e.target.value) || 100)))}
              className="tabular" style={{ ...toolbarInputStyle, width: 58 }}
            />
            mi
          </label>
          <label style={toolbarFieldStyle}>
            <Database style={{ width: 14, height: 14, color: "var(--tint)", flexShrink: 0 }} aria-hidden="true" />
            Pull
            <input
              type="number"
              min={100}
              max={1500}
              step={100}
              aria-label="Number of listings to pull"
              value={fetchLimit}
              onChange={(e) => setFetchLimit(Math.max(100, Math.min(1500, Number(e.target.value) || 1000)))}
              className="tabular" style={{ ...toolbarInputStyle, width: 70 }}
            />
          </label>
          <button
            type="button"
            onClick={handleFindNewLeads}
            disabled={fetchingLeads}
            className="btn btn-primary pressable"
          >
            <RefreshCw style={{ width: 14, height: 14, animation: fetchingLeads ? "spin 0.8s linear infinite" : "none" }} aria-hidden="true" />
            {fetchingLeads ? "Pulling…" : "Pull listings"}
          </button>
        </div>
        }
      />

      <TopStats
        leads={filteredLeads}
        now={now}
        followUp={filters.followUp}
        watchedOnly={filters.watchedOnly}
        onToggleFollowUp={(next) => updateFilters({ followUp: next })}
        onToggleWatched={(next) => updateFilters({ watchedOnly: next })}
      />

      <PipelineControls
        filters={filters}
        onChange={updateFilters}
        onClearAll={clearAllFilters}
        overdueCount={overdueActiveCount}
      />

      {/* View toggle + result summary */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <SegmentedControl
          role="tabs"
          ariaLabel="Pipeline view"
          value={viewMode}
          onChange={setViewMode}
          segments={[
            { value: "attention", label: <><ListChecks style={{ width: 14, height: 14 }} aria-hidden="true" />Needs attention</> },
            { value: "board", label: <><LayoutGrid style={{ width: 14, height: 14 }} aria-hidden="true" />Board</> },
          ]}
        />

        <div aria-live="polite" className="tabular" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 12, color: "var(--label-secondary)" }}>
          <span style={{ fontWeight: 600, color: "var(--label)" }}>{filteredLeads.length}</span>
          <span>of {leads.length} shown</span>
          {filtersActive && (
            <>
              <span style={{ color: "var(--label-tertiary)" }}>·</span>
              <span style={{ color: "var(--yellow)", fontWeight: 600 }}>
                filtered{priceFilterActive ? " (price filter active)" : ""}
              </span>
            </>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {actionError && (
          <motion.div key="error" role="alert" {...bannerMotion} style={{ ...bannerStyle, background: "rgba(var(--red-rgb), 0.1)", boxShadow: "inset 0 0 0 1px rgba(var(--red-rgb), 0.28)", color: "var(--red)" }}>
            {actionError}
          </motion.div>
        )}
        {fetchMessage && (
          <motion.div key="fetch" role="status" {...bannerMotion} style={{ ...bannerStyle, background: "rgba(var(--tint-rgb), 0.1)", boxShadow: "inset 0 0 0 1px rgba(var(--tint-rgb), 0.22)", color: "var(--tint-text)" }}>
            {fetchMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === "attention" ? (
        <NeedsAttentionList
          leads={filteredLeads}
          now={now}
          recommendationOf={recommendationOf}
          scoreOf={scoreOf}
          onOpen={(lead) => setSelectedLead(lead)}
          onCompleteNextAction={completeNextAction}
          busyLeadId={busyLeadId}
        />
      ) : (
        <KanbanBoard
          leads={filteredLeads}
          now={now}
          recommendationOf={recommendationOf}
          onLeadClick={(lead) => setSelectedLead(lead)}
          onLeadUpdate={(updatedLeads) => {
            const updatedById = new Map(updatedLeads.map((lead) => [lead.id, lead]));
            setLeads((currentLeads) => currentLeads.map((lead) => updatedById.get(lead.id) || lead));
          }}
        />
      )}

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onAction={(leadId, action) => handleAction(leadId, action)}
          actionBusy={busyLeadId === selectedLead.id}
          onLeadUpdated={applyLeadUpdate}
        />
      )}
    </div>
  );
}
