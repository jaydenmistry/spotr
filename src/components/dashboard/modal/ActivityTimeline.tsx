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
import { EmptyState } from "@/components/ui/EmptyState";

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
      <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="t-footnote" style={{ color: "var(--label-secondary)" }}>Loading activity…</span>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", gap: 12 }}>
            <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 999 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="skeleton" style={{ width: "50%", height: 14 }} />
              <div className="skeleton" style={{ width: "30%", height: 12 }} />
            </div>
          </div>
        ))}
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
          type="button"
          className="btn btn-sm btn-secondary pressable"
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
          aria-label="Internal note"
          className="field"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !savingNote) void submitNote();
          }}
          placeholder="Add an internal note… (no seller contact info)"
          maxLength={500}
          style={{ flex: 1, borderRadius: 999, padding: "0 16px" }}
        />
        <button
          onClick={() => void submitNote()}
          disabled={savingNote || !note.trim()}
          aria-label="Add note"
          type="button"
          className="btn btn-primary pressable"
        >
          <Send style={{ width: 13, height: 13 }} aria-hidden="true" />
          {savingNote ? "Saving…" : "Note"}
        </button>
      </div>
      {noteError && <p role="alert" className="pop-in" style={{ fontSize: 12, color: "var(--red)" }}>{noteError}</p>}

      {/* Empty state */}
      {(activities ?? []).length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No activity yet"
          body="Buyer actions — watching, offers, notes, stage moves, and decisions — will appear here as they happen."
        />
      ) : (
        Array.from(grouped.entries()).map(([day, dayActivities]) => (
          <div key={day}>
            <p className="t-eyebrow" style={{ color: "var(--label-secondary)", marginBottom: 10 }}>
              {day}
            </p>
            {/* A continuous rail behind the icons ties each day's events together. */}
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
              <span aria-hidden="true" style={{ position: "absolute", left: 14, top: 12, bottom: 12, width: 2, borderRadius: 999, background: "var(--separator)" }} />
              {dayActivities.map((activity, index) => {
                const meta = TYPE_ICONS[activity.type] ?? { icon: StickyNote, color: "var(--label-secondary)" };
                const Icon = meta.icon;
                const extra = detailLine(activity);
                return (
                  <div
                    key={activity.id}
                    className="rise-in"
                    style={{ position: "relative", display: "flex", gap: 12, padding: "6px 0", alignItems: "flex-start", animationDelay: `${Math.min(index, 10) * 40}ms` }}
                  >
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        background: `linear-gradient(color-mix(in srgb, ${meta.color} 16%, transparent), color-mix(in srgb, ${meta.color} 16%, transparent)), var(--bg-surface)`,
                        boxShadow: "0 0 0 3px var(--bg-surface)",
                      }}
                    >
                      <Icon style={{ width: 13, height: 13, color: meta.color }} aria-hidden="true" />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, color: "var(--label)", fontWeight: 600, paddingTop: 4 }}>{activity.summary}</p>
                      {extra && (
                        <p style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 2, overflowWrap: "anywhere" }}>{extra}</p>
                      )}
                      <p className="tabular" style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 2 }}>
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
