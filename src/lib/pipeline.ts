// Pure Pipeline view helpers: recommendation lookup and the Needs Attention
// grouping/ordering. Kept out of the page component so the ordering rules are
// unit-testable and the board and tests share one implementation. No React,
// no Prisma.
import type { LeadRecord } from "./vehicleAnalytics";
import { getOpportunityAssessment, type Recommendation } from "./opportunity";
import type { BuyBoxConfig } from "./buyBox";
import { getFollowUpStatus, isLeadTerminalForFollowUp } from "./followUp";

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
