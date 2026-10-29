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

const inputStyle: React.CSSProperties = {
  background: "var(--fill)",
  border: "1px solid var(--separator-strong)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--label)",
  width: "100%",
  boxSizing: "border-box",
};

const smallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: "var(--radius-sm)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid var(--separator-strong)",
  background: "var(--fill)",
  color: "var(--label)",
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
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--separator)",
        background: "rgba(var(--base-rgb), 0.5)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <CalendarClock style={{ width: 14, height: 14 }} aria-hidden="true" />
          Follow-up
        </p>
        <span
          style={{
            padding: "2px 9px",
            borderRadius: "var(--radius-xs)",
            fontSize: 11,
            fontWeight: 700,
            color: meta.color,
            background: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${meta.color} 27%, transparent)`,
          }}
        >
          {meta.label}
        </span>
      </div>

      {terminal ? (
        <p style={{ fontSize: 12, color: "var(--label-secondary)" }}>
          This lead is {lead.passedAt ? "passed" : "closed out"} — follow-up tracking doesn&apos;t
          apply. Restore or re-open it to schedule next actions.
        </p>
      ) : editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--label-secondary)" }}>
            What&apos;s the next step?
            <input
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, NEXT_ACTION_MAX_LENGTH))}
              placeholder='e.g. "Call seller about service records"'
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--label-secondary)" }}>
            Due
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              style={{ ...inputStyle, colorScheme: "dark" }}
            />
          </label>
          {error && <p style={{ fontSize: 12, color: "var(--red)" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={busy || !text.trim() || !dueAt}
              onClick={() => void post({ op: "set-next-action", nextAction: text, dueAt })}
              style={{
                ...smallButtonStyle,
                background: "rgba(var(--tint-rgb), 0.12)",
                borderColor: "rgba(var(--tint-rgb), 0.4)",
                color: "var(--tint-text)",
                opacity: busy || !text.trim() || !dueAt ? 0.5 : 1,
              }}
            >
              {busy ? "Saving…" : "Save next action"}
            </button>
            <button disabled={busy} onClick={() => setEditing(false)} style={{ ...smallButtonStyle, color: "var(--label-secondary)" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : lead.nextAction && lead.nextActionAt ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 13, color: "var(--label)", fontWeight: 600 }}>{lead.nextAction}</p>
          <p style={{ fontSize: 12, color: "var(--label-secondary)" }}>
            Due {dueFormatter.format(new Date(lead.nextActionAt))}
            {lead.nextActionCompletedAt &&
              ` · completed ${dueFormatter.format(new Date(lead.nextActionCompletedAt))}`}
          </p>
          {error && <p style={{ fontSize: 12, color: "var(--red)" }}>{error}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {!lead.nextActionCompletedAt && (
              <button
                disabled={busy}
                onClick={() => void post({ op: "complete-next-action" })}
                style={{ ...smallButtonStyle, background: "rgba(var(--green-rgb), 0.1)", borderColor: "rgba(var(--green-rgb), 0.4)", color: "var(--green)" }}
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
              style={{ ...smallButtonStyle, color: "var(--label-secondary)" }}
            >
              <Trash2 style={{ width: 13, height: 13 }} aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12, color: "var(--label-secondary)" }}>
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
