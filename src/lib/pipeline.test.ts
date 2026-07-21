import { describe, expect, it } from "vitest";
import { buildNeedsAttention, buildAssessmentMap } from "./pipeline";
import { DEFAULT_BUY_BOX } from "./buyBox";
import type { LeadRecord } from "./vehicleAnalytics";

const NOW = new Date("2026-07-21T12:00:00.000Z");
const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * 3600_000).toISOString();

function lead(overrides: Partial<LeadRecord> & { id: string }): LeadRecord {
  return {
    vin: `VIN-${overrides.id}`,
    year: 2021,
    make: "Porsche",
    model: "911",
    listingTitle: "2021 Porsche 911",
    price: 120000,
    miles: 10000,
    distanceMiles: 20,
    searchZip: "30043",
    searchRadius: 100,
    city: "Duluth",
    state: "GA",
    source: "marketcheck",
    vdp_url: "https://example.com/x",
    photo_url: "https://example.com/x.jpg",
    stage: "Contacted",
    sellerName: null,
    watchedAt: null,
    passedAt: null,
    assignedTo: null,
    nextAction: null,
    nextActionAt: null,
    nextActionCompletedAt: null,
    outcomeReason: null,
    outcomeNote: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

const noScore = () => 0;

describe("buildNeedsAttention", () => {
  it("orders groups overdue → due-soon → unscheduled", () => {
    const leads = [
      lead({ id: "watched-unscheduled", watchedAt: hoursFromNow(-100) }),
      lead({ id: "due-soon", nextAction: "call", nextActionAt: hoursFromNow(6) }),
      lead({ id: "overdue", nextAction: "call", nextActionAt: hoursFromNow(-6) }),
    ];
    const result = buildNeedsAttention(leads, noScore, NOW);
    expect(result.map((e) => e.group)).toEqual(["overdue", "due-soon", "unscheduled"]);
    expect(result.map((e) => e.lead.id)).toEqual(["overdue", "due-soon", "watched-unscheduled"]);
  });

  it("sorts overdue oldest-due first and due-soon earliest-due first", () => {
    const leads = [
      lead({ id: "overdue-recent", nextAction: "a", nextActionAt: hoursFromNow(-1) }),
      lead({ id: "overdue-old", nextAction: "a", nextActionAt: hoursFromNow(-48) }),
      lead({ id: "due-later", nextAction: "a", nextActionAt: hoursFromNow(40) }),
      lead({ id: "due-sooner", nextAction: "a", nextActionAt: hoursFromNow(2) }),
    ];
    const result = buildNeedsAttention(leads, noScore, NOW);
    expect(result.map((e) => e.lead.id)).toEqual([
      "overdue-old",
      "overdue-recent",
      "due-sooner",
      "due-later",
    ]);
  });

  it("orders unscheduled by score desc, then newest listing", () => {
    const leads = [
      lead({ id: "low", watchedAt: hoursFromNow(-10), createdAt: "2026-07-10T00:00:00.000Z" }),
      lead({ id: "high", assignedTo: "buyer@x", createdAt: "2026-07-05T00:00:00.000Z" }),
      lead({ id: "mid-newer", watchedAt: hoursFromNow(-10), createdAt: "2026-07-20T00:00:00.000Z" }),
      lead({ id: "mid-older", watchedAt: hoursFromNow(-10), createdAt: "2026-07-02T00:00:00.000Z" }),
    ];
    const scores: Record<string, number> = { high: 90, low: 10, "mid-newer": 50, "mid-older": 50 };
    const result = buildNeedsAttention(leads, (l) => scores[l.id] ?? 0, NOW);
    // high (90) → mid-newer (50, newer) → mid-older (50) → low (10)
    expect(result.map((e) => e.lead.id)).toEqual(["high", "mid-newer", "mid-older", "low"]);
  });

  it("excludes untouched leads that are neither watched nor assigned", () => {
    const leads = [lead({ id: "untouched" })]; // no next action, not watched, not assigned
    expect(buildNeedsAttention(leads, noScore, NOW)).toEqual([]);
  });

  it("excludes terminal-stage and passed leads even if overdue", () => {
    const leads = [
      lead({ id: "lost", stage: "Lost", nextAction: "a", nextActionAt: hoursFromNow(-6) }),
      lead({ id: "acquired", stage: "Acquired", nextAction: "a", nextActionAt: hoursFromNow(-6), watchedAt: hoursFromNow(-9) }),
      lead({ id: "passed", passedAt: hoursFromNow(-3), nextAction: "a", nextActionAt: hoursFromNow(-6) }),
    ];
    expect(buildNeedsAttention(leads, noScore, NOW)).toEqual([]);
  });

  it("excludes completed follow-ups from attention", () => {
    const leads = [
      lead({
        id: "done",
        watchedAt: hoursFromNow(-20),
        nextAction: "a",
        nextActionAt: hoursFromNow(-6),
        nextActionCompletedAt: hoursFromNow(-1),
      }),
    ];
    // Completed → status "completed", not overdue, and not unscheduled.
    expect(buildNeedsAttention(leads, noScore, NOW)).toEqual([]);
  });

  it("excludes watched leads with a future action beyond the due-soon window", () => {
    // Status is "none" (not due within 48h) but the lead HAS a scheduled
    // action, so it is not "nothing scheduled" and must not appear.
    const leads = [
      lead({ id: "future", watchedAt: hoursFromNow(-20), nextAction: "call", nextActionAt: hoursFromNow(72) }),
    ];
    expect(buildNeedsAttention(leads, noScore, NOW)).toEqual([]);
  });
});

describe("buildAssessmentMap", () => {
  it("produces one recommendation and score per lead", () => {
    const leads = [lead({ id: "a" }), lead({ id: "b" })];
    const map = buildAssessmentMap(leads, DEFAULT_BUY_BOX, NOW);
    expect(map.size).toBe(2);
    for (const id of ["a", "b"]) {
      const summary = map.get(id);
      expect(["BUY", "INVESTIGATE", "WATCH", "PASS"]).toContain(summary?.recommendation);
      expect(typeof summary?.score).toBe("number");
    }
  });
});
