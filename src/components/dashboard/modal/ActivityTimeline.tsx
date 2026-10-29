"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowRight,
  Ban,
  CalendarClock,
  CircleCheck,
  DollarSign,
  Eye,
  EyeOff,
  ListChecks,
  RefreshCw,
  Send,
  StickyNote,
  Undo2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { parseActivityDetail, type ActivityRecord } from "@/lib/followUp";
import type { LucideIcon } from "lucide-react";

const TYPE_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  watched: { icon: Eye, color: "var(--tint-text)" },
  unwatched: { icon: EyeOff, color: "var(--label-secondary)" },
  passed: { icon: Ban, color: "var(--red)" },
  restored: { icon: Undo2, color: "var(--green)" },
  assigned: { icon: UserPlus, color: "var(--blue)" },
  unassigned: { icon: UserCheck, color: "var(--label-secondary)" },
  stage_changed: { icon: ArrowRight, color: "var(--purple)" },
  marked_lost: { icon: Ban, color: "var(--red)" },
  note_added: { icon: StickyNote, color: "var(--yellow)" },
  next_action_set: { icon: CalendarClock, color: "var(--blue)" },
  next_action_completed: { icon: CircleCheck, color: "var(--green)" },
  next_action_cleared: { icon: ListChecks, color: "var(--label-secondary)" },
  offer_recorded: { icon: DollarSign, color: "var(--green)" },
};

const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const dayFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function dayKey(iso: string) {
  return dayFormatter.format(new Date(iso));
}

/** Extra line rendered under the summary for types whose detail adds value. */
function detailLine(activity: ActivityRecord): string | null {
  const detail = parseActivityDetail(activity.detail);
  if (!detail) return null;
  if (typeof detail.note === "string") return `“${detail.note}”`;
  if (activity.type === "next_action_set" && typeof detail.dueAt === "string") {
    const due = new Date(detail.dueAt);
    return Number.isFinite(due.getTime())
      ? `Due ${dayFormatter.format(due)}, ${timeFormatter.format(due)}`
      : null;
  }
  return null;
}

export default function ActivityTimeline({
  leadId,
  reloadKey = 0,
  onNoteAdded,
}: {
  leadId: string;
  reloadKey?: number;
  onNoteAdded?: () => void;
}) {
  const [activities, setActivities] = useState<ActivityRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [localReload, setLocalReload] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchActivities = async () => {
      try {
        const res = await axios.get<{ activities: ActivityRecord[] }>("/api/leads/activity", {
          params: { leadId },
        });
        if (cancelled) return;
        setActivities(res.data.activities);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load activity timeline", err);
        setError("Couldn't load the activity timeline.");
      }
    };

    void fetchActivities();
    return () => {
      cancelled = true;
    };
  }, [leadId, reloadKey, localReload]);

  const submitNote = useCallback(async () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    setSavingNote(true);
    setNoteError(null);
    try {
      await axios.post("/api/leads/followup", { leadId, op: "add-note", note: trimmed });
      setNote("");
      setLocalReload((value) => value + 1);
      onNoteAdded?.();
    } catch (err) {
      console.error("Failed to add note", err);
      setNoteError("Couldn't save the note. Please try again.");
    } finally {
      setSavingNote(false);
    }
  }, [leadId, note, onNoteAdded]);

  // Loading
  if (!activities && !error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "40px 0", color: "var(--label-secondary)", fontSize: 13 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(var(--tint-rgb), 0.2)", borderTopColor: "var(--tint)", animation: "spin 0.8s linear infinite" }} />
        Loading activity…
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "32px 0", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--red)", fontWeight: 600 }}>{error}</p>
        <button
          onClick={() => {
            setError(null);
            setActivities(null);
            setLocalReload((value) => value + 1);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 12px",
            borderRadius: "var(--radius-sm)",
            fontSize: 12,
            fontWeight: 600,
            border: "1px solid var(--separator-strong)",
            background: "var(--fill)",
            color: "var(--label)",
            cursor: "pointer",
          }}
        >
          <RefreshCw style={{ width: 13, height: 13 }} aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  const grouped = new Map<string, ActivityRecord[]>();
  for (const activity of activities ?? []) {
    const key = dayKey(activity.createdAt);
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(activity);
    } else {
      grouped.set(key, [activity]);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Add note */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !savingNote) void submitNote();
          }}
          placeholder="Add an internal note… (no seller contact info)"
          maxLength={500}
          style={{
            flex: 1,
            background: "var(--fill)",
            border: "1px solid var(--separator-strong)",
            borderRadius: "var(--radius-sm)",
            padding: "9px 12px",
            fontSize: 13,
            color: "var(--label)",
          }}
        />
        <button
          onClick={() => void submitNote()}
          disabled={savingNote || !note.trim()}
          aria-label="Add note"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: 12,
            fontWeight: 600,
            border: "1px solid rgba(var(--tint-rgb), 0.4)",
            background: "rgba(var(--tint-rgb), 0.12)",
            color: "var(--tint-text)",
            cursor: savingNote || !note.trim() ? "default" : "pointer",
            opacity: savingNote || !note.trim() ? 0.5 : 1,
          }}
        >
          <Send style={{ width: 13, height: 13 }} aria-hidden="true" />
          {savingNote ? "Saving…" : "Note"}
        </button>
      </div>
      {noteError && <p style={{ fontSize: 12, color: "var(--red)" }}>{noteError}</p>}

      {/* Empty state */}
      {(activities ?? []).length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "28px 0", textAlign: "center" }}>
          <StickyNote style={{ width: 26, height: 26, color: "var(--label-secondary)" }} aria-hidden="true" />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--label)" }}>No activity yet</p>
          <p style={{ fontSize: 12, color: "var(--label-secondary)", maxWidth: 320 }}>
            Buyer actions — watching, offers, notes, stage moves, and decisions — will appear here
            as they happen.
          </p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([day, dayActivities]) => (
          <div key={day}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {day}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {dayActivities.map((activity) => {
                const meta = TYPE_ICONS[activity.type] ?? { icon: StickyNote, color: "var(--label-secondary)" };
                const Icon = meta.icon;
                const extra = detailLine(activity);
                return (
                  <div
                    key={activity.id}
                    style={{ display: "flex", gap: 10, padding: "8px 10px", borderRadius: "var(--radius-sm)", alignItems: "flex-start" }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "var(--radius-sm)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        background: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                        marginTop: 1,
                      }}
                    >
                      <Icon style={{ width: 13, height: 13, color: meta.color }} aria-hidden="true" />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: "var(--label)", fontWeight: 600 }}>{activity.summary}</p>
                      {extra && (
                        <p style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 2, overflowWrap: "anywhere" }}>{extra}</p>
                      )}
                      <p style={{ fontSize: 11, color: "var(--label-secondary)", marginTop: 2 }}>
                        {timeFormatter.format(new Date(activity.createdAt))}
                        {activity.actor ? ` · ${activity.actor}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
