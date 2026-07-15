"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Radar, RefreshCw, Undo2 } from "lucide-react";
import OpportunityCard from "@/components/dashboard/feed/OpportunityCard";
import type { FeedAction } from "@/lib/feedActions";
import { type LeadRecord } from "@/lib/vehicleAnalytics";

type FeedView = "active" | "watching" | "passed";

interface FeedResponse {
  leads: LeadRecord[];
  total: number;
  page: number;
  pageSize: number;
  view: FeedView;
}

const VIEW_TABS: Array<{ view: FeedView; label: string }> = [
  { view: "active", label: "Opportunities" },
  { view: "watching", label: "Watching" },
  { view: "passed", label: "Passed" },
];

const pagerButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "8px 14px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#f0f4ff",
  cursor: "pointer",
};

function loadErrorMessage(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  return "Couldn't load the opportunity feed. Check your connection and try again.";
}

export default function FeedPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [lastPassed, setLastPassed] = useState<LeadRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<FeedView>("active");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchFeed = async () => {
      try {
        const res = await axios.get<FeedResponse>("/api/leads/feed", { params: { page, view } });
        if (cancelled) return;
        setLeads(res.data.leads);
        setTotal(res.data.total);
        setPageSize(res.data.pageSize);
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
        }
      }
    };

    void fetchFeed();
    return () => {
      cancelled = true;
    };
  }, [page, view, reloadKey]);

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

  const handleAction = useCallback(
    async (leadId: string, action: FeedAction) => {
      setBusyLeadId(leadId);
      setActionError(null);
      try {
        const res = await axios.post<LeadRecord>("/api/leads/action", { leadId, action });
        const updated = res.data;
        if (action === "pass") {
          setLastPassed(updated);
          refetch();
        } else if (action === "unpass") {
          setLastPassed((prev) => (prev?.id === leadId ? null : prev));
          refetch();
        } else if (action === "unwatch" && view === "watching") {
          refetch();
        } else {
          setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, ...updated } : lead)));
        }
      } catch (error) {
        console.error("Feed action failed", error);
        setActionError(
          axios.isAxiosError(error) && error.response?.status === 401
            ? "Your session has expired. Please sign in again."
            : "That action didn't save. Please try again."
        );
      } finally {
        setBusyLeadId(null);
      }
    },
    [refetch, view]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <div style={{ padding: "32px 28px", maxWidth: 980 }}>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", color: "#f0f4ff", marginBottom: 4 }}>
          <Radar style={{ width: 26, height: 26, color: "#ff7a1a" }} />
          Opportunity Feed
        </h1>
        <p style={{ fontSize: 13, color: "#8b9ab8" }}>
          Newest opportunities first, each scored by a transparent heuristic. Estimates are
          internal Spotr heuristics, not market quotes.
        </p>
      </div>

      {/* View tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {VIEW_TABS.map(({ view: tabView, label }) => (
          <button
            key={tabView}
            onClick={() => switchView(tabView)}
            style={{
              ...pagerButtonStyle,
              padding: "7px 14px",
              fontSize: 12,
              ...(view === tabView
                ? { background: "rgba(255,122,26,0.15)", borderColor: "rgba(255,122,26,0.5)", color: "#ff9147" }
                : { color: "#8b9ab8" }),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Undo bar after passing */}
      {lastPassed && view !== "passed" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            fontSize: 13,
            color: "#8b9ab8",
          }}
        >
          <span>
            Passed on{" "}
            <span style={{ fontWeight: 700, color: "#f0f4ff" }}>
              {lastPassed.listingTitle || [lastPassed.year, lastPassed.make, lastPassed.model].filter(Boolean).join(" ")}
            </span>
            . Find it any time under the Passed tab.
          </span>
          <button
            onClick={() => void handleAction(lastPassed.id, "unpass")}
            style={{ ...pagerButtonStyle, padding: "6px 12px", fontSize: 12, color: "#ff9147", flexShrink: 0 }}
          >
            <Undo2 style={{ width: 13, height: 13 }} />
            Undo
          </button>
        </div>
      )}

      {/* Action error */}
      {actionError && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(248,113,113,0.35)",
            background: "rgba(248,113,113,0.08)",
            fontSize: 13,
            color: "#f87171",
          }}
        >
          {actionError}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ display: "flex", height: "50vh", alignItems: "center", justifyContent: "center", color: "#8b9ab8", fontSize: 15, gap: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,122,26,0.2)", borderTopColor: "#ff7a1a", animation: "spin 0.8s linear infinite" }} />
          Loading opportunities…
        </div>
      )}

      {/* Error state */}
      {!loading && loadError && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            padding: "60px 20px",
            borderRadius: 12,
            border: "1px solid rgba(248,113,113,0.25)",
            background: "rgba(248,113,113,0.05)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, color: "#f87171", fontWeight: 600 }}>{loadError}</p>
          <button onClick={retryLoad} style={pagerButtonStyle}>
            <RefreshCw style={{ width: 14, height: 14 }} />
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !loadError && leads.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "70px 20px",
            borderRadius: 12,
            border: "1px dashed rgba(255,255,255,0.12)",
            textAlign: "center",
          }}
        >
          <Radar style={{ width: 34, height: 34, color: "#8b9ab8" }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "#f0f4ff" }}>
            {view === "active" ? "No opportunities yet" : view === "watching" ? "Not watching anything yet" : "No passed vehicles"}
          </p>
          <p style={{ fontSize: 13, color: "#8b9ab8", maxWidth: 400 }}>
            {view === "active" ? (
              <>
                Pull fresh listings from the{" "}
                <Link href="/dashboard" style={{ color: "#ff9147", fontWeight: 700 }}>
                  Pipeline
                </Link>{" "}
                page, or check the Passed tab to restore a vehicle.
              </>
            ) : view === "watching" ? (
              "Click Watch on any opportunity to build your shortlist here."
            ) : (
              "Vehicles you pass on will collect here and can be restored to the feed."
            )}
          </p>
        </div>
      )}

      {/* Feed */}
      {!loading && !loadError && leads.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: "#8b9ab8", marginBottom: 14 }}>
            Showing{" "}
            <span style={{ fontWeight: 700, color: "#ff9147" }}>
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, total)}
            </span>{" "}
            of <span style={{ fontWeight: 700, color: "#f0f4ff" }}>{total}</span>{" "}
            {view === "passed" ? "passed vehicles" : view === "watching" ? "watched opportunities" : "opportunities"} · newest first
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {leads.map((lead) => (
              <OpportunityCard
                key={lead.id}
                lead={lead}
                onAction={(leadId, action) => void handleAction(leadId, action)}
                busy={busyLeadId === lead.id}
                passedView={view === "passed"}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 24 }}>
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={safePage <= 1}
                style={{ ...pagerButtonStyle, opacity: safePage <= 1 ? 0.4 : 1 }}
              >
                <ChevronLeft style={{ width: 15, height: 15 }} />
                Prev
              </button>
              <span style={{ fontSize: 13, color: "#8b9ab8" }}>
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={safePage >= totalPages}
                style={{ ...pagerButtonStyle, opacity: safePage >= totalPages ? 0.4 : 1 }}
              >
                Next
                <ChevronRight style={{ width: 15, height: 15 }} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
