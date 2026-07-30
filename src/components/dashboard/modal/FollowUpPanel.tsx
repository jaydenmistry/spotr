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
  none: { label: "No next action", color: "#8b9ab8" },
  "due-soon": { label: "Due soon", color: "#fbbf24" },
  overdue: { label: "Overdue", color: "#f87171" },
  completed: { label: "Completed", color: "#34d399" },
  "not-applicable": { label: "Not applicable", color: "#8b9ab8" },
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "#f0f4ff",
  width: "100%",
  boxSizing: "border-box",
};

const smallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#f0f4ff",
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
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(8,12,20,0.5)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: "#8b9ab8", textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <CalendarClock style={{ width: 14, height: 14 }} aria-hidden="true" />
          Follow-up
        </p>
        <span
          style={{
            padding: "2px 9px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 800,
            color: meta.color,
            background: `${meta.color}1a`,
            border: `1px solid ${meta.color}44`,
          }}
        >
          {meta.label}
        </span>
      </div>

      {terminal ? (
        <p style={{ fontSize: 12, color: "#8b9ab8" }}>
          This lead is {lead.passedAt ? "passed" : "closed out"} — follow-up tracking doesn&apos;t
          apply. Restore or re-open it to schedule next actions.
        </p>
      ) : editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#8b9ab8" }}>
            What&apos;s the next step? (don&apos;t include seller contact info)
            <input
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, NEXT_ACTION_MAX_LENGTH))}
              placeholder='e.g. "Call seller about service records"'
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#8b9ab8" }}>
            Due
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              style={{ ...inputStyle, colorScheme: "dark" }}
            />
          </label>
          {error && <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={busy || !text.trim() || !dueAt}
              onClick={() => void post({ op: "set-next-action", nextAction: text, dueAt })}
              style={{
                ...smallButtonStyle,
                background: "rgba(255,122,26,0.12)",
                borderColor: "rgba(255,122,26,0.4)",
                color: "#ff9147",
                opacity: busy || !text.trim() || !dueAt ? 0.5 : 1,
              }}
            >
              {busy ? "Saving…" : "Save next action"}
            </button>
            <button disabled={busy} onClick={() => setEditing(false)} style={{ ...smallButtonStyle, color: "#8b9ab8" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : lead.nextAction && lead.nextActionAt ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 13, color: "#f0f4ff", fontWeight: 600 }}>{lead.nextAction}</p>
          <p style={{ fontSize: 12, color: "#8b9ab8" }}>
            Due {dueFormatter.format(new Date(lead.nextActionAt))}
            {lead.nextActionCompletedAt &&
              ` · completed ${dueFormatter.format(new Date(lead.nextActionCompletedAt))}`}
          </p>
          {error && <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {!lead.nextActionCompletedAt && (
              <button
                disabled={busy}
                onClick={() => void post({ op: "complete-next-action" })}
                style={{ ...smallButtonStyle, background: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.4)", color: "#34d399" }}
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
              style={smallButtonStyle}
            >
              <Pencil style={{ width: 13, height: 13 }} aria-hidden="true" />
              Edit
            </button>
            <button
              disabled={busy}
              onClick={() => void post({ op: "clear-next-action" })}
              style={{ ...smallButtonStyle, color: "#8b9ab8" }}
            >
              <Trash2 style={{ width: 13, height: 13 }} aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12, color: "#8b9ab8" }}>
            No next action scheduled. Keep momentum by writing down the next concrete step.
          </p>
          <button
            onClick={() => {
              setText("");
              setDueAt("");
              setEditing(true);
            }}
            style={{ ...smallButtonStyle, alignSelf: "flex-start" }}
          >
            <CalendarClock style={{ width: 13, height: 13 }} aria-hidden="true" />
            Set next action
          </button>
        </div>
      )}
    </div>
  );
}
