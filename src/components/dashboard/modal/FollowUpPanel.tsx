"use client";

import { useState } from "react";
import axios from "axios";
import { CalendarClock, Check, Pencil, Trash2 } from "lucide-react";
import {
  getFollowUpStatus,
  isLeadTerminalForFollowUp,
  NEXT_ACTION_MAX_LENGTH,
  type FollowUpStatus,
} from "@/lib/followUp";
import type { LeadRecord } from "@/lib/vehicleAnalytics";

const STATUS_META: Record<FollowUpStatus, { label: string; color: string }> = {
  none: { label: "No next action", color: "var(--label-secondary)" },
  "due-soon": { label: "Due soon", color: "var(--yellow)" },
  overdue: { label: "Overdue", color: "var(--red)" },
  completed: { label: "Completed", color: "var(--green)" },
  "not-applicable": { label: "Not applicable", color: "var(--label-secondary)" },
};


const dueFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function FollowUpPanel({
  lead,
  onLeadUpdated,
}: {
  lead: LeadRecord;
  onLeadUpdated: (lead: LeadRecord) => void;
}) {
  const status = getFollowUpStatus(lead);
  const terminal = isLeadTerminalForFollowUp(lead);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(lead.nextAction ?? "");
  const [dueAt, setDueAt] = useState(toLocalInputValue(lead.nextActionAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await axios.post<{ lead: LeadRecord }>("/api/leads/followup", {
        leadId: lead.id,
        ...payload,
      });
      onLeadUpdated(res.data.lead);
      setEditing(false);
    } catch (err) {
      console.error("Follow-up update failed", err);
      setError(
        axios.isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Couldn't save. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const meta = STATUS_META[status];

  return (
    <section
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--separator)",
        background: "var(--bg-card)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <h3 className="t-headline" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--label)" }}>
          <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", color: "var(--orange)", background: "rgba(var(--orange-rgb), 0.14)" }}>
            <CalendarClock style={{ width: 15, height: 15 }} />
          </span>
          Follow-up
        </h3>
        <span
          key={meta.label}
          className="pop-in"
          style={{
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            color: meta.color,
            background: `color-mix(in srgb, ${meta.color} 13%, transparent)`,
          }}
        >
          {meta.label}
        </span>
      </div>

      {terminal ? (
        <p className="t-footnote" style={{ color: "var(--label-secondary)" }}>
          This lead is {lead.passedAt ? "passed" : "closed out"} — follow-up tracking doesn&apos;t
          apply. Restore or re-open it to schedule next actions.
        </p>
      ) : editing ? (
        <div className="pop-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--label-secondary)" }}>
            What&apos;s the next step?
            <input
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, NEXT_ACTION_MAX_LENGTH))}
              placeholder='e.g. "Call seller about service records"'
              className="field"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--label-secondary)" }}>
            Due
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              className="field tabular"
            />
          </label>
          {error && <p role="alert" className="pop-in" style={{ fontSize: 12, color: "var(--red)" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={busy || !text.trim() || !dueAt}
              onClick={() => void post({ op: "set-next-action", nextAction: text, dueAt })}
              className="btn btn-sm btn-primary pressable"
            >
              {busy ? "Saving…" : "Save next action"}
            </button>
            <button type="button" disabled={busy} onClick={() => setEditing(false)} className="btn btn-sm btn-secondary pressable">
              Cancel
            </button>
          </div>
        </div>
      ) : lead.nextAction && lead.nextActionAt ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 14, color: "var(--label)", fontWeight: 600 }}>{lead.nextAction}</p>
          <p className="t-footnote tabular" style={{ color: "var(--label-secondary)" }}>
            Due {dueFormatter.format(new Date(lead.nextActionAt))}
            {lead.nextActionCompletedAt &&
              ` · completed ${dueFormatter.format(new Date(lead.nextActionCompletedAt))}`}
          </p>
          {error && <p role="alert" className="pop-in" style={{ fontSize: 12, color: "var(--red)" }}>{error}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {!lead.nextActionCompletedAt && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void post({ op: "complete-next-action" })}
                className="btn btn-sm pressable"
                style={{ background: "rgba(var(--green-rgb), 0.14)", color: "var(--green)" }}
              >
                <Check style={{ width: 13, height: 13 }} aria-hidden="true" />
                Mark done
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => {
                setText(lead.nextAction ?? "");
                setDueAt(toLocalInputValue(lead.nextActionAt));
                setEditing(true);
              }}
              className="btn btn-sm btn-secondary pressable"
            >
              <Pencil style={{ width: 13, height: 13 }} aria-hidden="true" />
              Edit
            </button>
            <button
              disabled={busy}
              onClick={() => void post({ op: "clear-next-action" })}
              className="btn btn-sm pressable hover-danger"
              style={{ color: "var(--label-secondary)" }}
            >
              <Trash2 style={{ width: 13, height: 13 }} aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="t-footnote" style={{ color: "var(--label-secondary)" }}>
            No next action scheduled. Keep momentum by writing down the next concrete step.
          </p>
          <button
            onClick={() => {
              setText("");
              setDueAt("");
              setEditing(true);
            }}
            type="button"
            className="btn btn-sm btn-secondary pressable"
            style={{ alignSelf: "flex-start" }}
          >
            <CalendarClock style={{ width: 13, height: 13 }} aria-hidden="true" />
            Set next action
          </button>
        </div>
      )}
    </section>
  );
}
