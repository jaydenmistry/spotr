// Pure Pipeline view helpers: recommendation lookup and the Needs Attention
// grouping/ordering. Kept out of the page component so the ordering rules are
// unit-testable and the board and tests share one implementation. No React,
// no Prisma.
import type { LeadRecord } from "./vehicleAnalytics";
import { getOpportunityAssessment, type Recommendation } from "./opportunity";
import type { BuyBoxConfig } from "./buyBox";
import { getFollowUpStatus, isLeadTerminalForFollowUp } from "./followUp";
import { isTerminalStage } from "./stages";

export interface LeadAssessmentSummary {
  recommendation: Recommendation;
  score: number;
}

// Recommendation + opportunity score per lead, keyed by id. Computed once per
// (leads, buyBox) change by the page in a SINGLE pass — the assessment is the
// expensive call, so cards, the recommendation filter, and the Needs Attention
// score-sort all read from this one map instead of reassessing independently.
export function buildAssessmentMap(
  leads: LeadRecord[],
  buyBox: BuyBoxConfig,
  now: Date = new Date()
): Map<string, LeadAssessmentSummary> {
  const map = new Map<string, LeadAssessmentSummary>();
  for (const lead of leads) {
    const assessment = getOpportunityAssessment(lead, buyBox, now);
    map.set(lead.id, {
      recommendation: assessment.recommendation,
      score: assessment.finalOpportunityScore,
    });
  }
  return map;
}

/**
 * The Pipeline's shared count vocabulary. Every number on the page derives from
 * exactly one of these sets, and which set each surface uses is fixed:
 *
 *   header stats (TopStats)      → active / overdue / dueSoon
 *   control-bar badge            → overdue, or dueSoon while that scope is on
 *   result count ("N of M")      → visible
 *   Board overdue pills          → visible (per column, describes cards shown)
 *   Needs Attention groups       → visible (describes rows shown)
 *
 * The header therefore answers "what does my pipeline look like?" and the views
 * answer "what am I looking at right now?". These intentionally diverge once a
 * follow-up scope is engaged: with followUp="due-soon", `visible` holds only
 * due-soon leads, so every Board overdue pill reads 0 while the header still
 * reports the true overdue load. That is by design, not drift — but because it
 * is surprising, the page renders an explicit scope chip next to the result
 * count whenever a follow-up filter narrows the views, so the difference is
 * never silent.
 *
 * - `base`      — every lead matching the user's explicit NON-follow-up filters
 *                 (search, stage, recommendation, watched, make, price, explicit
 *                 radius). Terminal and passed leads are still included.
 * - `active`    — `base` minus terminal-stage and passed leads. This is the
 *                 "open pipeline" the operational header describes.
 * - `overdue`   — `active` whose follow-up status is overdue.
 * - `dueSoon`   — `active` whose follow-up status is due-soon.
 * - `visible`   — `base` with the selected follow-up filter applied. This, and
 *                 only this, is what the Board and Needs Attention render.
 *
 * `overdue`/`dueSoon` are deliberately computed from `active` rather than from
 * `visible`, so turning the Overdue filter on does not collapse the Due-soon
 * stat to zero. The stats stay meaningful while their own filter is active.
 */
export interface PipelineLeadSets {
  base: LeadRecord[];
  active: LeadRecord[];
  overdue: LeadRecord[];
  dueSoon: LeadRecord[];
  visible: LeadRecord[];
}

export type FollowUpScope = "all" | "overdue" | "due-soon";

/**
 * Derives the five sets above from the already explicitly-filtered `base`.
 * Callers apply search/stage/recommendation/watched/make/price/radius first;
 * this function owns only the follow-up and terminal/passed dimensions, so
 * that logic lives in exactly one place.
 */
export function buildPipelineLeadSets(
  base: LeadRecord[],
  followUp: FollowUpScope,
  now: Date = new Date()
): PipelineLeadSets {
  const active: LeadRecord[] = [];
  const overdue: LeadRecord[] = [];
  const dueSoon: LeadRecord[] = [];

  for (const lead of base) {
    if (isTerminalStage(lead.stage) || lead.passedAt) continue;
    active.push(lead);
    const status = getFollowUpStatus(lead, now);
    if (status === "overdue") overdue.push(lead);
    else if (status === "due-soon") dueSoon.push(lead);
  }

  // The follow-up filter intersects with everything already applied to `base`;
  // it never replaces another filter.
  const visible =
    followUp === "all" ? base : base.filter((lead) => getFollowUpStatus(lead, now) === followUp);

  return { base, active, overdue, dueSoon, visible };
}

export type AttentionGroup = "overdue" | "due-soon" | "unscheduled";

export interface AttentionEntry {
  lead: LeadRecord;
  group: AttentionGroup;
}

/**
 * The Needs Attention list: active, non-terminal, non-passed leads that want a
 * buyer's attention, in three ordered groups.
 *
 * - overdue:      has a next action past due — oldest nextActionAt first
 * - due-soon:     next action due within 48h — earliest nextActionAt first
 * - unscheduled:  no active next action, but watched OR assigned (i.e. the
 *                 buyer already committed to it) — highest opportunity score
 *                 first, then newest listing. Untouched New Leads are excluded.
 *
 * Terminal/passed leads never appear — isLeadTerminalForFollowUp is the gate.
 * `scoreOf` supplies the opportunity score for unscheduled ordering (the page
 * passes a memoized lookup so we don't recompute assessments here).
 */
export function buildNeedsAttention(
  leads: LeadRecord[],
  scoreOf: (lead: LeadRecord) => number,
  now: Date = new Date()
): AttentionEntry[] {
  const overdue: LeadRecord[] = [];
  const dueSoon: LeadRecord[] = [];
  const unscheduled: LeadRecord[] = [];

  for (const lead of leads) {
    if (isLeadTerminalForFollowUp(lead)) continue;
    const status = getFollowUpStatus(lead, now);
    if (status === "overdue") {
      overdue.push(lead);
    } else if (status === "due-soon") {
      dueSoon.push(lead);
    } else if (!lead.nextAction || !lead.nextActionAt) {
      // Genuinely no active next action (never-set or fully cleared). A lead
      // scheduled further than 48h out also reports status "none" but HAS an
      // action, so it's excluded here — it isn't "nothing scheduled". Only
      // surface if the buyer already committed (watched/assigned); untouched
      // New Leads stay off the list.
      if (lead.watchedAt || lead.assignedTo) unscheduled.push(lead);
    }
  }

  // Decorate-sort so scoreOf runs once per lead, not O(m log m) times.
  const dueTime = (lead: LeadRecord) => new Date(lead.nextActionAt ?? 0).getTime();
  overdue.sort((a, b) => dueTime(a) - dueTime(b)); // oldest due first
  dueSoon.sort((a, b) => dueTime(a) - dueTime(b)); // earliest due first
  const rankedUnscheduled = unscheduled
    .map((lead) => ({ lead, score: scoreOf(lead), created: new Date(lead.createdAt).getTime() }))
    .sort((a, b) => b.score - a.score || b.created - a.created) // score desc, then newest
    .map((entry) => entry.lead);

  return [
    ...overdue.map((lead): AttentionEntry => ({ lead, group: "overdue" })),
    ...dueSoon.map((lead): AttentionEntry => ({ lead, group: "due-soon" })),
    ...rankedUnscheduled.map((lead): AttentionEntry => ({ lead, group: "unscheduled" })),
  ];
}
