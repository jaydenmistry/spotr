// Acquisition follow-up domain logic: activity types, outcome reasons,
// follow-up status classification, and input validation. Pure module — no
// Prisma, no Next — so routes stay thin and everything here is unit-testable.
//
// Honesty rules encoded here:
// - Activities describe INTERNAL BUYER ACTIONS, never provider data.
// - Activity `detail` payloads are built exclusively by the builders below
//   from validated scalars (per-type allowlist); raw client JSON never
//   reaches the database.
// - Summaries and details must never contain seller PII (name/phone).
import { isTerminalStage } from "./stages";
import type { LeadRecord } from "./vehicleAnalytics";

/* ── Activity types ──────────────────────────────────────────── */

export const ACTIVITY_TYPES = [
  "watched",
  "unwatched",
  "passed",
  "restored",
  "assigned",
  "unassigned",
  "stage_changed",
  "marked_lost",
  "note_added",
  "next_action_set",
  "next_action_completed",
  "next_action_cleared",
  "offer_recorded",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export function isActivityType(value: unknown): value is ActivityType {
  return typeof value === "string" && (ACTIVITY_TYPES as readonly string[]).includes(value);
}

/* ── Outcome reasons (Pass / Lost) ───────────────────────────── */

export const OUTCOME_REASONS = [
  { code: "price_too_high", label: "Price too high" },
  { code: "insufficient_margin", label: "Insufficient margin" },
  { code: "condition_concern", label: "Condition / history concern" },
  { code: "outside_buy_box", label: "Outside buy box" },
  { code: "seller_unavailable", label: "Seller unavailable" },
  { code: "duplicate_or_stale", label: "Duplicate / stale listing" },
  { code: "unverifiable_data", label: "Unable to verify data" },
  { code: "purchased_elsewhere", label: "Purchased elsewhere" },
  { code: "other", label: "Other" },
] as const;

export type OutcomeReasonCode = (typeof OUTCOME_REASONS)[number]["code"];

export function isOutcomeReason(value: unknown): value is OutcomeReasonCode {
  return (
    typeof value === "string" && OUTCOME_REASONS.some((reason) => reason.code === value)
  );
}

export function outcomeReasonLabel(code: string): string {
  return OUTCOME_REASONS.find((reason) => reason.code === code)?.label ?? code;
}

/* ── Follow-up status ────────────────────────────────────────── */

export type FollowUpStatus = "none" | "due-soon" | "overdue" | "completed" | "not-applicable";

export const DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000;

// Follow-up status is time-dependent: a lead becomes overdue with no user
// interaction and no new server data. Surfaces that display it must re-evaluate
// on a timer against ONE shared `now`, or the badge, the count, and the filter
// drift apart. One minute is well below the granularity buyers schedule at.
export const FOLLOW_UP_TICK_MS = 60 * 1000;

type FollowUpLead = Pick<
  LeadRecord,
  "stage" | "passedAt" | "nextAction" | "nextActionAt" | "nextActionCompletedAt"
>;

// The single source of truth for "this lead is done — never nag about it".
// Passed lives on passedAt (feed decision), terminal on the kanban stage.
export function isLeadTerminalForFollowUp(
  lead: Pick<LeadRecord, "stage" | "passedAt">
): boolean {
  return isTerminalStage(lead.stage) || Boolean(lead.passedAt);
}

export function getFollowUpStatus(lead: FollowUpLead, now: Date = new Date()): FollowUpStatus {
  if (isLeadTerminalForFollowUp(lead)) {
    return "not-applicable";
  }

  if (!lead.nextAction || !lead.nextActionAt) {
    return "none";
  }

  if (lead.nextActionCompletedAt) {
    return "completed";
  }

  const due = new Date(lead.nextActionAt).getTime();
  if (!Number.isFinite(due)) {
    return "none";
  }

  if (due < now.getTime()) {
    return "overdue";
  }

  return due - now.getTime() <= DUE_SOON_WINDOW_MS ? "due-soon" : "none";
}

/* ── Input validation ────────────────────────────────────────── */

export const NEXT_ACTION_MAX_LENGTH = 200;
export const NOTE_MAX_LENGTH = 500;
// Sane ceiling for a single-vehicle offer; guards typos like an extra zero
// on an already-expensive exotic. Whole dollars only.
export const OFFER_MAX_USD = 5_000_000;

export function validateNextActionText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > NEXT_ACTION_MAX_LENGTH) return null;
  return trimmed;
}

export function validateNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > NOTE_MAX_LENGTH) return null;
  return trimmed;
}

// Accepts an ISO-ish datetime string (what datetime-local submits) and
// returns a valid Date, or null. Rejects anything that parses to NaN.
export function validateDueDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

// Whole positive dollars, capped. Rejects floats, negatives, NaN, strings.
export function validateOfferAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value <= 0 || value > OFFER_MAX_USD) return null;
  return value;
}

/* ── Activity detail builders (server-side allowlist) ────────── */
// Each builder returns the ONLY detail shape its activity type may carry.
// Values are validated scalars; callers must never pass client JSON through.

export function buildOfferDetail(amountUsd: number, note: string | null) {
  return JSON.stringify(note ? { amountUsd, note } : { amountUsd });
}

export function buildOutcomeDetail(reason: OutcomeReasonCode, note: string | null) {
  return JSON.stringify(note ? { reason, note } : { reason });
}

export function buildStageDetail(fromStage: string, toStage: string) {
  return JSON.stringify({ from: fromStage, to: toStage });
}

export function buildNextActionDetail(nextAction: string, dueAt: Date) {
  return JSON.stringify({ nextAction, dueAt: dueAt.toISOString() });
}

export function buildNoteDetail(note: string) {
  return JSON.stringify({ note });
}

/* ── Timeline record shape shared with the client ────────────── */

export interface ActivityRecord {
  id: string;
  type: string;
  summary: string;
  detail: string | null;
  actor: string | null;
  leadId: string;
  createdAt: string;
}

export function parseActivityDetail(detail: string | null): Record<string, unknown> | null {
  if (!detail) return null;
  try {
    const parsed = JSON.parse(detail);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
