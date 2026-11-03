"use client";

import { Suspense, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownWideNarrow, ChevronLeft, ChevronRight, Eye, FilterX, Keyboard, Radar, RefreshCw, Search, ThumbsDown, Undo2 } from "lucide-react";
import OpportunityCard from "@/components/dashboard/feed/OpportunityCard";
import LeadModal from "@/components/dashboard/modal/LeadModal";
import OutcomeReasonDialog from "@/components/dashboard/OutcomeReasonDialog";
import type { FeedAction } from "@/lib/feedActions";
import { assignToggle } from "@/lib/leadAssignee";
import type { OutcomeReasonCode } from "@/lib/followUp";
import type { OpportunityAssessment, Recommendation } from "@/lib/opportunity";
import { type LeadRecord } from "@/lib/vehicleAnalytics";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { listContainer, listItem, spring } from "@/lib/motion";
import { useCommandPalette, useRegisterCommands } from "@/components/command/CommandPaletteProvider";
import type { Command } from "@/components/command/CommandPalette";
import { hasOpenDialog } from "@/components/ui/useDialogFocus";
import { Kbd } from "@/components/ui/Kbd";
import { isPlainKey, singleKeyShortcutsEnabled } from "@/lib/shortcuts";

type FeedView = "active" | "watching" | "passed";
type FeedSort = "score" | "newest" | "margin" | "distance" | "age";

type FeedLead = LeadRecord & { assessment: OpportunityAssessment };

interface FeedResponse {
  leads: FeedLead[];
  total: number;
  matchingTotal: number;
  page: number;
  pageSize: number;
  view: FeedView;
  sort: FeedSort;
  candidateSetCapped: boolean;
  assessedCount: number;
  buyBoxPersisted: boolean;
}

const VIEW_TABS: Array<{ view: FeedView; label: string }> = [
  { view: "active", label: "Opportunities" },
  { view: "watching", label: "Watching" },
  { view: "passed", label: "Passed" },
];

const SORT_OPTIONS: Array<{ value: FeedSort; label: string }> = [
  { value: "score", label: "Opportunity score" },
  { value: "newest", label: "Newest first" },
  { value: "margin", label: "Potential margin" },
  { value: "distance", label: "Distance (nearest)" },
  { value: "age", label: "Listing age (oldest)" },
];

const REC_OPTIONS: Array<{ value: "" | Recommendation; label: string }> = [
  { value: "", label: "All recommendations" },
  { value: "BUY", label: "Buy" },
  { value: "INVESTIGATE", label: "Investigate" },
  { value: "WATCH", label: "Watch" },
  { value: "PASS", label: "Pass" },
];

function loadErrorMessage(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  return "Couldn't load the opportunity feed. Check your connection and try again.";
}

const VIEW_ICONS = { active: Radar, watching: Eye, passed: ThumbsDown } as const;

export default function FeedPage() {
  // useSearchParams needs a Suspense boundary (see Next's use-search-params docs).
  return (
    <Suspense fallback={<div className="page" style={{ maxWidth: 1040 }} />}>
      <FeedPageContent />
    </Suspense>
  );
}

function FeedPageContent() {
  // Deep links from the command palette: ?q=<vin or title>&open=<lead id>.
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const linkedQuery = (searchParams.get("q") ?? "").trim().slice(0, 60);
  const linkedOpen = searchParams.get("open");
  const { openHelp, shortcutsEnabled } = useCommandPalette();
  // Decides which assign action the cards offer; the API enforces the same rule.
  const viewer = useSession().data?.user;
  const [leads, setLeads] = useState<FeedLead[]>([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<{ candidateSetCapped: boolean; assessedCount: number; matchingTotal: number; buyBoxPersisted: boolean } | null>(null);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [lastPassed, setLastPassed] = useState<LeadRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<FeedView>("active");
  const [sort, setSort] = useState<FeedSort>("score");
  const [recFilter, setRecFilter] = useState<"" | Recommendation>("");
  const [searchInput, setSearchInput] = useState(linkedQuery);
  const [q, setQ] = useState(linkedQuery);
  const [dossierLead, setDossierLead] = useState<FeedLead | null>(null);
  const [pendingPass, setPendingPass] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingOpen, setPendingOpen] = useState<string | null>(linkedOpen);
  const [appliedLink, setAppliedLink] = useState(searchParams.toString());
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // After a keyboard pass: the passed card, and the neighbour to focus once it's gone.
  const refocusAfterPass = useRef<{ passedId: string; nextId: string | null } | null>(null);

  // A new palette link while already on the feed: apply it during render
  // (not in an effect) so the stale list never flashes.
  const linkKey = searchParams.toString();
  if (linkKey !== appliedLink) {
    setAppliedLink(linkKey);
    if (linkedQuery || linkedOpen) {
      setSearchInput(linkedQuery);
      setQ(linkedQuery);
      setRecFilter("");
      setView("active");
      setPage(1);
      setLoading(true);
      // Force a fetch even if the link matches the current filters, so
      // `loading` always resolves.
      setReloadKey((value) => value + 1);
      setPendingOpen(linkedOpen);
    }
  }

  // Strip the link params once read so a reload doesn't reopen the dossier.
  useEffect(() => {
    if (searchParams.has("q") || searchParams.has("open")) window.history.replaceState(null, "", pathname);
  }, [searchParams, pathname]);

  // Open the linked dossier once its results have loaded.
  if (pendingOpen && !loading) {
    const match = leads.find((lead) => lead.id === pendingOpen);
    setPendingOpen(null);
    if (match) setDossierLead(match);
    else if (!loadError) setActionError("That vehicle is no longer in Opportunities — it may have been passed or moved to a closed stage.");
  }

  // Debounce search input into the applied query.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    const fetchFeed = async () => {
      setRefreshing(true);
      try {
        const res = await axios.get<FeedResponse>("/api/leads/feed", {
          params: { page, view, sort, q: q || undefined, recommendation: recFilter || undefined },
        });
        if (cancelled) return;
        setLeads(res.data.leads);
        setTotal(res.data.total);
        setPageSize(res.data.pageSize);
        setMeta({
          candidateSetCapped: res.data.candidateSetCapped,
          assessedCount: res.data.assessedCount,
          matchingTotal: res.data.matchingTotal,
          buyBoxPersisted: res.data.buyBoxPersisted,
        });
        setLoadError(null);
        // If actions emptied the current page (e.g. passed the last card),
        // fall back to the last page that still has results.
        if (res.data.leads.length === 0 && res.data.total > 0 && page > 1) {
          setPage(Math.max(1, Math.ceil(res.data.total / res.data.pageSize)));
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load opportunity feed", error);
        setLoadError(loadErrorMessage(error));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void fetchFeed();
    return () => {
      cancelled = true;
    };
  }, [page, view, sort, q, recFilter, reloadKey]);

  const refetch = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  const retryLoad = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    refetch();
  }, [refetch]);

  const switchView = useCallback((nextView: FeedView) => {
    setView(nextView);
    setPage(1);
    setLoading(true);
  }, []);

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
        const updated = res.data;
        if (action === "pass") {
          setLastPassed(updated);
          setDossierLead((prev) => (prev?.id === leadId ? null : prev));
          refetch();
        } else if (action === "unpass") {
          setLastPassed((prev) => (prev?.id === leadId ? null : prev));
          refetch();
        } else if (action === "unwatch" && view === "watching") {
          refetch();
        } else {
          setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, ...updated } : lead)));
          // Keep an open dossier's watch/assign state in sync with the action.
          setDossierLead((prev) => (prev?.id === leadId ? { ...prev, ...updated } : prev));
        }
      } catch (error) {
        console.error("Feed action failed", error);
        refocusAfterPass.current = null;
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
    [refetch, view]
  );

  // Passing requires a standardized reason — intercept and ask first.
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const hasFilters = Boolean(q || recFilter);

  // ── Keyboard shortcuts (single keys; guarded so typing and dialogs win) ──
  const cardElements = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-lead-id]") ?? []);
  const focusCard = (card: HTMLElement | undefined) => {
    const target = card?.querySelector<HTMLElement>("[data-card-focus]");
    if (!target) return;
    target.focus({ preventScroll: true });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.closest("[data-lead-id]")?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  };

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (!singleKeyShortcutsEnabled() || hasOpenDialog() || !isPlainKey(event)) return;
    const key = event.key;
    const cards = cardElements();
    const currentIndex = cards.findIndex((card) => card.contains(document.activeElement));
    const currentLead = currentIndex >= 0 ? leads.find((lead) => lead.id === cards[currentIndex].dataset.leadId) : undefined;
    const claim = () => event.preventDefault();

    if (key === "j" || key === "k") {
      if (cards.length === 0) return;
      claim();
      const next = currentIndex === -1 ? 0 : Math.min(Math.max(currentIndex + (key === "j" ? 1 : -1), 0), cards.length - 1);
      focusCard(cards[next]);
    } else if (key === "o" && currentLead) {
      claim();
      setDossierLead(currentLead);
    } else if (key === "/") {
      claim();
      searchRef.current?.focus();
      searchRef.current?.select();
    } else if (key === "[" && safePage > 1) {
      claim();
      setPage(safePage - 1);
    } else if (key === "]" && safePage < totalPages) {
      claim();
      setPage(safePage + 1);
    } else if (key === "z" && lastPassed && view !== "passed") {
      claim();
      void handleAction(lastPassed.id, "unpass");
    } else if (currentLead && view !== "passed" && busyLeadId !== currentLead.id) {
      if (key === "w") {
        claim();
        handleAction(currentLead.id, currentLead.watchedAt ? "unwatch" : "watch");
      } else if (key === "a") {
        claim();
        const assign = assignToggle(currentLead.assignedTo, viewer);
        if (assign) handleAction(currentLead.id, assign.action);
      } else if (key === "p") {
        claim();
        const nextId = (leads[currentIndex + 1] ?? leads[currentIndex - 1])?.id ?? null;
        refocusAfterPass.current = { passedId: currentLead.id, nextId };
        handleAction(currentLead.id, "pass");
      }
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onShortcut(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // After a keyboard pass, keep the buyer's place: focus whichever card
  // slid into the passed card's slot.
  // Waits until the refetched list no longer contains the passed card, and
  // targets by id so the card still animating out is never chosen.
  useEffect(() => {
    const target = refocusAfterPass.current;
    if (!target || loading || refreshing || pendingPass) return;
    if (leads.some((lead) => lead.id === target.passedId)) return;
    refocusAfterPass.current = null;
    const cards = cardElements().filter((card) => card.dataset.leadId !== target.passedId);
    focusCard(cards.find((card) => card.dataset.leadId === target.nextId) ?? cards[0]);
  }, [leads, loading, refreshing, pendingPass]);

  // ── Page commands for the ⌘K palette ──
  const feedCommands = useMemo<Command[]>(() => {
    const list: Command[] = VIEW_TABS.filter((tab) => tab.view !== view).map((tab) => ({
      id: `feed-view-${tab.view}`,
      group: "This page",
      label: `Show ${tab.label}`,
      icon: VIEW_ICONS[tab.view],
      keywords: ["feed", "view", "tab"],
      run: () => switchView(tab.view),
    }));
    for (const option of SORT_OPTIONS) {
      if (option.value === sort) continue;
      list.push({
        id: `feed-sort-${option.value}`,
        group: "This page",
        label: `Sort by ${option.label.toLowerCase()}`,
        icon: ArrowDownWideNarrow,
        keywords: ["order", "rank"],
        run: () => {
          setSort(option.value);
          setPage(1);
        },
      });
    }
    for (const rec of ["BUY", "INVESTIGATE"] as const) {
      if (recFilter === rec) continue;
      list.push({
        id: `feed-rec-${rec}`,
        group: "This page",
        label: `Show only ${rec === "BUY" ? "Buy" : "Investigate"} recommendations`,
        hint: "Spotr estimate — filters the feed",
        icon: Radar,
        keywords: ["filter", "recommendation", rec.toLowerCase()],
        run: () => {
          setRecFilter(rec);
          setPage(1);
        },
      });
    }
    if (hasFilters) {
      list.push({
        id: "feed-clear-filters",
        group: "This page",
        label: "Clear search and filters",
        icon: FilterX,
        keywords: ["reset"],
        run: () => {
          setSearchInput("");
          setQ("");
          setRecFilter("");
          setPage(1);
        },
      });
    }
    list.push({
      id: "feed-search",
      group: "This page",
      label: "Search the feed",
      icon: Search,
      shortcut: ["/"],
      keywords: ["find", "filter"],
      // By id: the React Compiler treats ref reads inside memoized values as render-time reads.
      run: () => document.getElementById("feed-search")?.focus(),
    });
    return list;
  }, [view, sort, recFilter, hasFilters, switchView]);
  useRegisterCommands(feedCommands);

  const viewNoun = view === "passed" ? "passed vehicles" : view === "watching" ? "watched opportunities" : "opportunities";

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      {/* Pass requires a standardized reason */}
      {pendingPass && (
        <OutcomeReasonDialog
          title="Pass on this vehicle"
          description="A standardized reason keeps the pipeline honest about why opportunities were rejected."
          confirmLabel="Pass"
          busy={busyLeadId === pendingPass}
          onCancel={() => {
            refocusAfterPass.current = null;
            setPendingPass(null);
          }}
          onConfirm={(reason, note) => {
            void performAction(pendingPass, "pass", { reason, note }).finally(() =>
              setPendingPass(null)
            );
          }}
        />
      )}

      <PageHeader
        title="Opportunity Feed"
        subtitle={
          <>
            Ranked against your{" "}
            <Link href="/dashboard/buybox" className="hover-tint" style={{ color: "var(--tint-text)", fontWeight: 600, textDecoration: "none" }}>
              buy box
            </Link>{" "}
            by a transparent heuristic. Scores and values are Spotr estimates, not market quotes.
            {meta && !meta.buyBoxPersisted && " Using default buy-box settings — save yours to personalize ranking."}
          </>
        }
      />

      {/* View + search / sort / filter */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <SegmentedControl
          role="tabs"
          ariaLabel="Feed view"
          segments={VIEW_TABS.map(({ view: value, label }) => ({ value, label }))}
          value={view}
          onChange={switchView}
        />
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--label-tertiary)", pointerEvents: "none" }} />
          <input
            ref={searchRef}
            id="feed-search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search make, model, trim, VIN…"
            aria-label="Search opportunities"
            aria-keyshortcuts={shortcutsEnabled ? "/" : undefined}
            className="field"
            style={{ paddingLeft: 36, borderRadius: 999 }}
          />
        </div>
        <label style={{ display: "inline-flex", alignItems: "center" }}>
          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Sort by</span>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as FeedSort); setPage(1); }}
            className="field"
            style={{ width: "auto", borderRadius: 999 }}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <select
          value={recFilter}
          onChange={(e) => { setRecFilter(e.target.value as "" | Recommendation); setPage(1); }}
          aria-label="Filter by recommendation"
          className="field"
          style={{ width: "auto", borderRadius: 999 }}
        >
          {REC_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Undo after passing — a floating toast, not a layout-shifting bar */}
      <Toast show={Boolean(lastPassed) && view !== "passed"}>
        {lastPassed && (
          <>
            <span>
              Passed on{" "}
              <span style={{ fontWeight: 600, color: "var(--label)" }}>
                {lastPassed.listingTitle || [lastPassed.year, lastPassed.make, lastPassed.model].filter(Boolean).join(" ")}
              </span>
              <span className="hide-compact"> · it&apos;s under the Passed tab</span>
            </span>
            <button
              type="button"
              onClick={() => void handleAction(lastPassed.id, "unpass")}
              className="btn btn-sm btn-primary pressable"
            >
              <Undo2 style={{ width: 13, height: 13 }} />
              Undo
            </button>
          </>
        )}
      </Toast>

      {/* Action error */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.snappy}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                marginBottom: 16,
                padding: "11px 16px",
                borderRadius: "var(--radius-md)",
                background: "rgba(var(--red-rgb), 0.1)",
                boxShadow: "inset 0 0 0 1px rgba(var(--red-rgb), 0.28)",
                fontSize: 13,
                color: "var(--red)",
              }}
            >
              {actionError}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {loading && (
        <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="t-footnote" style={{ color: "var(--label-secondary)" }}>Loading opportunities…</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 196, borderRadius: "var(--radius-lg)", animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && loadError && (
        <EmptyState
          icon={RefreshCw}
          tone="var(--red)"
          title={loadError}
          action={
            <button type="button" onClick={retryLoad} className="btn btn-secondary pressable">
              <RefreshCw style={{ width: 14, height: 14 }} />
              Retry
            </button>
          }
        />
      )}

      {/* Empty state */}
      {!loading && !loadError && leads.length === 0 && (
        <EmptyState
          icon={Radar}
          title={
            hasFilters
              ? "Nothing matches these filters"
              : view === "active"
              ? "No opportunities yet"
              : view === "watching"
              ? "Not watching anything yet"
              : "No passed vehicles"
          }
          body={
            hasFilters ? (
              "Try clearing the search or recommendation filter."
            ) : view === "active" ? (
              <>
                Pull fresh listings from the{" "}
                <Link href="/dashboard" style={{ color: "var(--tint-text)", fontWeight: 600, textDecoration: "none" }}>
                  Pipeline
                </Link>{" "}
                page, or check the Passed tab to restore a vehicle.
              </>
            ) : view === "watching" ? (
              "Click Watch on any opportunity to build your shortlist here."
            ) : (
              "Vehicles you pass on will collect here and can be restored to the feed."
            )
          }
        />
      )}

      {/* Feed */}
      {!loading && !loadError && leads.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <p className="t-footnote" style={{ color: "var(--label-secondary)" }}>
            Showing{" "}
            <span className="tabular" style={{ fontWeight: 600, color: "var(--label)" }}>
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, total)}
            </span>{" "}
            of <span className="tabular" style={{ fontWeight: 600, color: "var(--label)" }}>{total}</span> {viewNoun}
            {meta?.candidateSetCapped
              ? ` · ranked across the ${meta.assessedCount} newest of ${meta.matchingTotal} matching listings — not exhaustive`
              : ""}
          </p>
          <button
            type="button"
            onClick={openHelp}
            className="t-footnote pressable hover-label keyboard-only hide-compact"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, border: "none", background: "transparent", padding: 0, color: "var(--label-secondary)", cursor: "pointer" }}
          >
            <Keyboard size={14} aria-hidden="true" />
            Shortcuts {shortcutsEnabled ? <Kbd keys={["?"]} /> : "(off)"}
          </button>
          </div>

          {/* Cards reflow on springs; a passed card slides out and the rest
              close the gap. The list dims while a refetch is in flight. */}
          <motion.div
            ref={listRef}
            variants={listContainer}
            initial="hidden"
            animate="show"
            style={{ display: "flex", flexDirection: "column", gap: 12, opacity: refreshing ? 0.55 : 1, transition: "opacity 0.2s" }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {leads.map((lead) => (
                <motion.div
                  key={lead.id}
                  layout
                  variants={listItem}
                  exit={{ opacity: 0, x: -60, scale: 0.96, transition: spring.smooth }}
                  transition={spring.layout}
                >
                  <OpportunityCard
                    lead={lead}
                    assessment={lead.assessment}
                    onAction={(leadId, action) => void handleAction(leadId, action)}
                    onOpenDossier={() => setDossierLead(lead)}
                    busy={busyLeadId === lead.id}
                    passedView={view === "passed"}
                    viewer={viewer}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 28 }}>
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={safePage <= 1}
                className="btn btn-secondary pressable"
              >
                <ChevronLeft style={{ width: 15, height: 15 }} />
                Prev
              </button>
              <span className="t-footnote tabular" style={{ color: "var(--label-secondary)" }}>
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={safePage >= totalPages}
                className="btn btn-secondary pressable"
              >
                Next
                <ChevronRight style={{ width: 15, height: 15 }} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Acquisition dossier */}
      {dossierLead && (
        <LeadModal
          lead={dossierLead}
          assessment={dossierLead.assessment}
          buyBoxPersisted={meta?.buyBoxPersisted}
          onAction={(leadId, action) => handleAction(leadId, action)}
          actionBusy={busyLeadId === dossierLead.id}
          viewer={viewer}
          onClose={() => setDossierLead(null)}
          onLeadUpdated={(updated) => {
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
            setDossierLead((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
          }}
        />
      )}
    </div>
  );
}
