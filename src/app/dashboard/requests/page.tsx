"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Inbox, Lock, Mail, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState } from "@/components/ui/EmptyState";
import { ACCESS_REQUEST_STATUSES, ARCHIVE_RETENTION_DAYS, type AccessRequestStatus } from "@/lib/accessRequest";
import { tone } from "@/lib/ui/colors";

interface AccessRequestRow {
  id: string;
  name: string;
  email: string;
  dealership: string;
  role: string;
  message: string | null;
  status: AccessRequestStatus;
  createdAt: string;
}

const STATUS_META: Record<AccessRequestStatus, { label: string; color: string }> = {
  new: { label: "New", color: "var(--tint-text)" },
  contacted: { label: "Contacted", color: "var(--green)" },
  archived: { label: "Archived", color: "var(--label-secondary)" },
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequestRow[] | null>(null);
  const [error, setError] = useState<"failed" | "forbidden" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [view, setView] = useState<AccessRequestStatus>("new");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Deletion is permanent, so it takes a second, explicit click.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    axios
      .get<{ requests: AccessRequestRow[] }>("/api/access-requests")
      .then((res) => {
        if (!active) return;
        setRequests(res.data.requests);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          setError("forbidden");
          return;
        }
        console.error("Failed to load access requests", err);
        setError("failed");
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const setStatus = async (id: string, status: AccessRequestStatus) => {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await axios.patch<{ request: AccessRequestRow }>("/api/access-requests", { id, status });
      setRequests((prev) => prev?.map((row) => (row.id === id ? res.data.request : row)) ?? prev);
    } catch (err) {
      console.error("Failed to update access request", err);
      setActionError("Couldn't update that request. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    setActionError(null);
    try {
      await axios.delete("/api/access-requests", { params: { id } });
      setRequests((prev) => prev?.filter((row) => row.id !== id) ?? prev);
    } catch (err) {
      console.error("Failed to delete access request", err);
      setActionError("Couldn't delete that request. Please try again.");
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  };

  const counts = Object.fromEntries(
    ACCESS_REQUEST_STATUSES.map((status) => [status, requests?.filter((row) => row.status === status).length ?? 0])
  ) as Record<AccessRequestStatus, number>;
  const visible = requests?.filter((row) => row.status === view) ?? [];

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <PageHeader
        title="Access requests"
        subtitle={`Dealers who asked for a Spotr workspace from the public site. Archived requests are deleted automatically after ${ARCHIVE_RETENTION_DAYS} days.`}
      />

      <div style={{ marginBottom: 18 }}>
        <SegmentedControl
          role="tabs"
          ariaLabel="Request status"
          value={view}
          onChange={setView}
          segments={ACCESS_REQUEST_STATUSES.map((status) => ({
            value: status,
            label: (
              <>
                {STATUS_META[status].label}
                <span className="tabular" style={{ fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: "var(--fill)" }}>
                  {counts[status]}
                </span>
              </>
            ),
            ariaLabel: `${STATUS_META[status].label} (${counts[status]})`,
          }))}
        />
      </div>

      {actionError && (
        <p role="alert" className="pop-in" style={{ marginBottom: 14, padding: "11px 16px", borderRadius: "var(--radius-md)", background: "rgba(var(--red-rgb), 0.1)", color: "var(--red)", fontSize: 13 }}>
          {actionError}
        </p>
      )}

      {error === "forbidden" ? (
        <EmptyState
          icon={Lock}
          title="Admins only"
          body="Access requests include prospects' contact details, so only admins can see them. Ask an admin if you need access."
        />
      ) : error ? (
        <EmptyState
          icon={RefreshCw}
          tone="var(--red)"
          title="Couldn't load access requests"
          action={
            <button type="button" className="btn btn-secondary pressable" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw style={{ width: 14, height: 14 }} /> Retry
            </button>
          }
        />
      ) : requests === null ? (
        <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="t-footnote" style={{ color: "var(--label-secondary)" }}>Loading access requests…</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 110, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={view === "new" ? "No new requests" : `Nothing ${STATUS_META[view].label.toLowerCase()}`}
          body={view === "new" ? "Requests from the public “Request access” form will show up here." : undefined}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((row, index) => {
            const meta = STATUS_META[row.status];
            return (
              <article
                key={row.id}
                className="rise-in"
                style={{ animationDelay: `${Math.min(index, 10) * 35}ms`, padding: "18px 20px", borderRadius: "var(--radius-lg)", background: "var(--bg-card)", border: "1px solid var(--separator)", opacity: busyId === row.id ? 0.6 : 1 }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 className="t-headline" style={{ color: "var(--label)" }}>
                      {row.name} <span style={{ fontWeight: 400, color: "var(--label-secondary)" }}>· {row.dealership}</span>
                    </h3>
                    <p className="t-footnote" style={{ color: "var(--label-secondary)", marginTop: 3 }}>
                      {row.role} · <span className="tabular">{dateFormatter.format(new Date(row.createdAt))}</span>
                    </p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, color: meta.color, background: tone(meta.color, 13) }}>
                    {meta.label}
                  </span>
                </div>
                {row.message && (
                  <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, color: "var(--label-body)", whiteSpace: "pre-wrap" }}>{row.message}</p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                  <a href={`mailto:${encodeURIComponent(row.email).replace("%40", "@")}`} className="btn btn-sm btn-primary pressable">
                    <Mail style={{ width: 14, height: 14 }} /> {row.email}
                  </a>
                  {row.status !== "contacted" && (
                    <button type="button" disabled={busyId === row.id} onClick={() => void setStatus(row.id, "contacted")} className="btn btn-sm btn-secondary pressable">
                      Mark contacted
                    </button>
                  )}
                  {row.status !== "archived" ? (
                    <button type="button" disabled={busyId === row.id} onClick={() => void setStatus(row.id, "archived")} className="btn btn-sm pressable hover-fill" style={{ color: "var(--label-secondary)" }}>
                      Archive
                    </button>
                  ) : (
                    <button type="button" disabled={busyId === row.id} onClick={() => void setStatus(row.id, "new")} className="btn btn-sm pressable hover-fill" style={{ color: "var(--label-secondary)" }}>
                      Restore
                    </button>
                  )}
                  {confirmDeleteId === row.id ? (
                    <span className="pop-in" style={{ display: "inline-flex", gap: 6, marginLeft: "auto" }}>
                      <button type="button" disabled={busyId === row.id} onClick={() => void remove(row.id)} className="btn btn-sm btn-destructive pressable">
                        Delete permanently
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(null)} className="btn btn-sm btn-secondary pressable">
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => setConfirmDeleteId(row.id)}
                      className="btn btn-sm pressable hover-danger"
                      style={{ marginLeft: "auto", color: "var(--label-secondary)" }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
