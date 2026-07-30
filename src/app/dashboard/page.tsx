"use client";

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
import { buildAssessmentMap, buildNeedsAttention, buildPipelineLeadSets } from "@/lib/pipeline";
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

  // baseOperationalLeads — every lead matching the user's explicit
  // NON-follow-up filters: search, make, price, explicit radius, projected
  // movement, stage, recommendation, watched. Terminal/passed leads are still
  // in here; buildPipelineLeadSets owns that dimension. This is the single
  // root every Pipeline number descends from.
  const baseOperationalLeads = useMemo(() => {
    const base = filterLeads(leads, {
      searchTerm: filters.searchTerm,
      makeFilter: getMakeFilterList(filters.makeFilter),
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      // Explicit user-supplied radius ONLY. Blank means no distance filtering.
      // The Buy Box radius and the ingestion pull radius are deliberately not
      // consulted here — neither may silently hide farther leads.
      maxDistance: filters.maxDistance,
      movementFilter: filters.movementFilter,
    });
    return base.filter((lead) => {
      if (filters.stage !== "All" && lead.stage !== filters.stage) return false;
      if (filters.recommendation !== "All" && assessmentMap.get(lead.id)?.recommendation !== filters.recommendation) {
        return false;
      }
      if (filters.watchedOnly && !lead.watchedAt) return false;
      return true;
    });
  }, [leads, filters, assessmentMap]);

  // active / overdue / dueSoon / visible, all derived from that one root.
  // Header stats read `active`, `overdue`, `dueSoon`; the control badge reads
  // `overdue`; the result count and both views read `visible`.
  const leadSets = useMemo(
    () => buildPipelineLeadSets(baseOperationalLeads, filters.followUp, now),
    [baseOperationalLeads, filters.followUp, now]
  );
  const visibleLeads = leadSets.visible;

  // Same definition the feed's Watching tab uses: shortlisted, not passed,
  // still open. Derived from `active` so it agrees with the other stats.
  const watchingCount = useMemo(
    () => leadSets.active.filter((l) => l.watchedAt).length,
    [leadSets]
  );

  // The Needs Attention rows, built once here and handed to the list, so the
  // count in the result summary is literally the set that gets rendered rather
  // than a second derivation that could drift from it. Grouping and ordering
  // still live entirely in buildNeedsAttention.
  const attentionEntries = useMemo(
    () => buildNeedsAttention(visibleLeads, scoreOf, now),
    [visibleLeads, scoreOf, now]
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
      <div style={{ display: "flex", height: "60vh", alignItems: "center", justifyContent: "center", color: "#8b9ab8", fontSize: 15, gap: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,122,26,0.2)", borderTopColor: "#ff7a1a", animation: "spin 0.8s linear infinite" }} />
        Loading pipeline…
      </div>
    );
  }

  const filtersActive = hasActiveFilters(filters);
  // Name the constraints that are easy to forget because they live under
  // "More filters" — radius above all, since it silently removes leads.
  const activeConstraints = [
    filters.minPrice !== "" || filters.maxPrice !== "" ? "price" : null,
    filters.maxDistance.trim() !== "" ? `within ${filters.maxDistance.trim()} mi` : null,
    filters.movementFilter !== "All" ? "projected movement" : null,
  ].filter((label): label is string => label !== null);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 40px)", padding: "28px 28px 20px" }}>
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

      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em", color: "#f0f4ff", marginBottom: 4 }}>
            Pipeline
          </h1>
          <p style={{ fontSize: 13, color: "#8b9ab8" }}>
            Your acquisition command center — what needs action, what&apos;s worth pursuing, and what happened last.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, fontWeight: 600, color: "#8b9ab8" }}>
            <MapPin style={{ width: 14, height: 14, color: "#ff7a1a", flexShrink: 0 }} aria-hidden="true" />
            ZIP
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              aria-label="ZIP code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              style={{ width: 56, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px", fontSize: 13, color: "#f0f4ff", outline: "none" }}
              placeholder="30043"
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, fontWeight: 600, color: "#8b9ab8" }}>
            {/* Ingestion radius for Pull Listings only — it does NOT filter the
                board/attention views (every eligible lead is always shown).
                Named "Pull radius" so it can't be confused with the explicit
                "Within radius" view filter under More filters. */}
            Pull radius
            <input
              type="number"
              min={10}
              max={100}
              step={10}
              aria-label="Pull radius in miles — applies to new listing pulls only, not to what is shown below"
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Math.max(10, Math.min(100, Number(e.target.value) || 100)))}
              style={{ width: 52, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px", fontSize: 13, color: "#f0f4ff", outline: "none" }}
            />
            mi
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, fontWeight: 600, color: "#8b9ab8" }}>
            <Database style={{ width: 14, height: 14, color: "#ff7a1a", flexShrink: 0 }} aria-hidden="true" />
            Pull
            <input
              type="number"
              min={100}
              max={1500}
              step={100}
              aria-label="Number of listings to pull"
              value={fetchLimit}
              onChange={(e) => setFetchLimit(Math.max(100, Math.min(1500, Number(e.target.value) || 1000)))}
              style={{ width: 60, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px", fontSize: 13, color: "#f0f4ff", outline: "none" }}
            />
          </label>
          <button
            onClick={handleFindNewLeads}
            disabled={fetchingLeads}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", cursor: fetchingLeads ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, color: "#fff", background: fetchingLeads ? "rgba(255,122,26,0.4)" : "linear-gradient(135deg, #ff7a1a, #f59e0b)", boxShadow: fetchingLeads ? "none" : "0 4px 16px rgba(255,122,26,0.35)" }}
          >
            <RefreshCw style={{ width: 14, height: 14, animation: fetchingLeads ? "spin 0.8s linear infinite" : "none" }} aria-hidden="true" />
            Pull Listings
          </button>
        </div>
      </div>

      <TopStats
        activeCount={leadSets.active.length}
        overdueCount={leadSets.overdue.length}
        dueSoonCount={leadSets.dueSoon.length}
        watchingCount={watchingCount}
        followUp={filters.followUp}
        watchedOnly={filters.watchedOnly}
        onToggleFollowUp={(next) => updateFilters({ followUp: next })}
        onToggleWatched={(next) => updateFilters({ watchedOnly: next })}
      />

      <PipelineControls
        filters={filters}
        onChange={updateFilters}
        onClearAll={clearAllFilters}
        overdueCount={leadSets.overdue.length}
        dueSoonCount={leadSets.dueSoon.length}
      />

      {/* View toggle + result summary */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div role="tablist" aria-label="Pipeline view" style={{ display: "inline-flex", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", padding: 3, gap: 3 }}>
          {([
            { key: "attention", label: "Needs attention", icon: ListChecks },
            { key: "board", label: "Board", icon: LayoutGrid },
          ] as const).map((tab) => {
            const active = viewMode === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                onClick={() => setViewMode(tab.key)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none", background: active ? "rgba(255,122,26,0.15)" : "transparent", color: active ? "#ff9147" : "#8b9ab8" }}
              >
                <tab.icon style={{ width: 14, height: 14 }} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Result count describes exactly what the view below renders: on the
            Board that is `visible`; in Needs Attention it is the curated
            attention rows, which are a subset of `visible` — quoting the
            `visible` total there would claim hundreds of rows beside a
            handful. Header stats above always describe `active`. */}
        <div aria-live="polite" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 12, color: "#4a5670" }}>
          {viewMode === "attention" ? (
            // Zero is left to the list's own empty state, which explains the
            // situation far better than a bare count could.
            attentionEntries.length > 0 && (
              // One text node on purpose: this sits in an aria-live region, and
              // splitting the number into its own element makes assistive tech
              // read "1lead needs attention".
              <span style={{ fontWeight: 700, color: "#ff9147" }}>
                {attentionEntries.length === 1
                  ? "1 lead needs attention"
                  : `${attentionEntries.length} leads need attention`}
              </span>
            )
          ) : (
            <>
              <span style={{ fontWeight: 700, color: "#ff9147" }}>{visibleLeads.length}</span>
              <span>of {leads.length} shown</span>
            </>
          )}
          {/* A follow-up scope narrows the views but deliberately not the
              header stats, so name it here — otherwise "Overdue: 2" beside a
              board with no overdue cards reads as a bug. */}
          {filters.followUp !== "all" && (
            <>
              <span style={{ color: "#1e2a3a" }}>·</span>
              <span style={{ color: "#ff9147", fontWeight: 700 }}>
                showing {filters.followUp === "overdue" ? "overdue" : "due soon"} only
              </span>
            </>
          )}
          {filtersActive && (
            <>
              <span style={{ color: "#1e2a3a" }}>·</span>
              <span style={{ color: "#fbbf24", fontWeight: 700 }}>
                filtered
                {activeConstraints.length > 0 ? ` (${activeConstraints.join(", ")})` : ""}
              </span>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div role="alert" style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", fontSize: 13, fontWeight: 600, color: "#f87171" }}>
          {actionError}
        </div>
      )}

      {fetchMessage && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(255,122,26,0.1)", border: "1px solid rgba(255,122,26,0.2)", fontSize: 13, fontWeight: 600, color: "#ff9147" }}>
          {fetchMessage}
        </div>
      )}

      {viewMode === "attention" ? (
        <NeedsAttentionList
          entries={attentionEntries}
          now={now}
          recommendationOf={recommendationOf}
          onOpen={(lead) => setSelectedLead(lead)}
          onCompleteNextAction={completeNextAction}
          busyLeadId={busyLeadId}
        />
      ) : (
        <KanbanBoard
          leads={visibleLeads}
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
