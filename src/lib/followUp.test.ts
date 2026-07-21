import { describe, expect, it } from "vitest";
import {
  ACTIVITY_TYPES,
  buildNextActionDetail,
  buildNoteDetail,
  buildOfferDetail,
  buildOutcomeDetail,
  buildStageDetail,
  DUE_SOON_WINDOW_MS,
  getFollowUpStatus,
  isActivityType,
  isLeadTerminalForFollowUp,
  isOutcomeReason,
  OFFER_MAX_USD,
  outcomeReasonLabel,
  parseActivityDetail,
  validateDueDate,
  validateNextActionText,
  validateNote,
  validateOfferAmount,
} from "./followUp";

const NOW = new Date("2026-07-17T12:00:00Z");

const baseLead = {
  stage: "Contacted",
  passedAt: null,
  nextAction: "Call seller",
  nextActionAt: "2026-07-19T12:00:00Z",
  nextActionCompletedAt: null,
};

describe("isLeadTerminalForFollowUp", () => {
  it("is terminal for Acquired/Lost stages", () => {
    expect(isLeadTerminalForFollowUp({ stage: "Acquired", passedAt: null })).toBe(true);
    expect(isLeadTerminalForFollowUp({ stage: "Lost", passedAt: null })).toBe(true);
  });

  it("is terminal when passed, even in a non-terminal stage", () => {
    expect(isLeadTerminalForFollowUp({ stage: "New Leads", passedAt: "2026-07-01T00:00:00Z" })).toBe(true);
  });

  it("is not terminal for active, unpassed leads", () => {
    expect(isLeadTerminalForFollowUp({ stage: "Offer Made", passedAt: null })).toBe(false);
  });
});

describe("getFollowUpStatus", () => {
  it("returns not-applicable for terminal leads even with an overdue action", () => {
    expect(
      getFollowUpStatus(
        { ...baseLead, stage: "Lost", nextActionAt: "2026-07-01T00:00:00Z" },
        NOW
      )
    ).toBe("not-applicable");
    expect(
      getFollowUpStatus(
        { ...baseLead, passedAt: "2026-07-10T00:00:00Z", nextActionAt: "2026-07-01T00:00:00Z" },
        NOW
      )
    ).toBe("not-applicable");
  });

  it("returns none without a next action", () => {
    expect(getFollowUpStatus({ ...baseLead, nextAction: null, nextActionAt: null }, NOW)).toBe("none");
  });

  it("returns overdue when the due time has passed", () => {
    expect(getFollowUpStatus({ ...baseLead, nextActionAt: "2026-07-17T11:59:00Z" }, NOW)).toBe("overdue");
  });

  it("returns due-soon inside the 48h window and none outside it", () => {
    const insideWindow = new Date(NOW.getTime() + DUE_SOON_WINDOW_MS - 60_000).toISOString();
    const outsideWindow = new Date(NOW.getTime() + DUE_SOON_WINDOW_MS + 60_000).toISOString();
    expect(getFollowUpStatus({ ...baseLead, nextActionAt: insideWindow }, NOW)).toBe("due-soon");
    expect(getFollowUpStatus({ ...baseLead, nextActionAt: outsideWindow }, NOW)).toBe("none");
  });

  it("returns completed once completedAt is set, regardless of due date", () => {
    expect(
      getFollowUpStatus(
        { ...baseLead, nextActionAt: "2026-07-01T00:00:00Z", nextActionCompletedAt: "2026-07-02T00:00:00Z" },
        NOW
      )
    ).toBe("completed");
  });

  it("treats an unparseable due date as none rather than Invalid Date behavior", () => {
    expect(getFollowUpStatus({ ...baseLead, nextActionAt: "not-a-date" }, NOW)).toBe("none");
  });
});

describe("validators", () => {
  it("validates next-action text length and trims", () => {
    expect(validateNextActionText("  Call seller  ")).toBe("Call seller");
    expect(validateNextActionText("")).toBeNull();
    expect(validateNextActionText("   ")).toBeNull();
    expect(validateNextActionText("x".repeat(201))).toBeNull();
    expect(validateNextActionText(42)).toBeNull();
  });

  it("validates notes up to 500 chars", () => {
    expect(validateNote("fine")).toBe("fine");
    expect(validateNote("x".repeat(501))).toBeNull();
    expect(validateNote({})).toBeNull();
  });

  it("rejects invalid dates instead of producing Invalid Date", () => {
    expect(validateDueDate("2026-07-20T10:30")).toBeInstanceOf(Date);
    expect(validateDueDate("not-a-date")).toBeNull();
    expect(validateDueDate("")).toBeNull();
    expect(validateDueDate(1234)).toBeNull();
  });

  it("accepts only positive whole-dollar offers under the ceiling", () => {
    expect(validateOfferAmount(92500)).toBe(92500);
    expect(validateOfferAmount(OFFER_MAX_USD)).toBe(OFFER_MAX_USD);
    expect(validateOfferAmount(OFFER_MAX_USD + 1)).toBeNull();
    expect(validateOfferAmount(0)).toBeNull();
    expect(validateOfferAmount(-500)).toBeNull();
    expect(validateOfferAmount(99.99)).toBeNull();
    expect(validateOfferAmount("92500")).toBeNull();
    expect(validateOfferAmount({ amount: 1 })).toBeNull();
  });
});

describe("outcome reasons", () => {
  it("accepts every standardized code and rejects everything else", () => {
    expect(isOutcomeReason("price_too_high")).toBe(true);
    expect(isOutcomeReason("purchased_elsewhere")).toBe(true);
    expect(isOutcomeReason("other")).toBe(true);
    expect(isOutcomeReason("because")).toBe(false);
    expect(isOutcomeReason(null)).toBe(false);
  });

  it("maps codes to labels with a safe fallback", () => {
    expect(outcomeReasonLabel("insufficient_margin")).toBe("Insufficient margin");
    expect(outcomeReasonLabel("legacy_code")).toBe("legacy_code");
  });
});

describe("activity detail builders (allowlist)", () => {
  it("emits exactly the allowlisted keys per type", () => {
    expect(JSON.parse(buildOfferDetail(92500, null))).toEqual({ amountUsd: 92500 });
    expect(JSON.parse(buildOfferDetail(92500, "contingent"))).toEqual({ amountUsd: 92500, note: "contingent" });
    expect(JSON.parse(buildOutcomeDetail("price_too_high", null))).toEqual({ reason: "price_too_high" });
    expect(JSON.parse(buildStageDetail("Contacted", "Appraisal"))).toEqual({ from: "Contacted", to: "Appraisal" });
    expect(JSON.parse(buildNoteDetail("hello"))).toEqual({ note: "hello" });
    const nextAction = JSON.parse(buildNextActionDetail("Call", new Date("2026-07-20T00:00:00Z")));
    expect(nextAction).toEqual({ nextAction: "Call", dueAt: "2026-07-20T00:00:00.000Z" });
  });

  it("never includes seller PII fields", () => {
    for (const payload of [
      buildOfferDetail(1000, "note"),
      buildOutcomeDetail("other", "note"),
      buildStageDetail("A", "B"),
      buildNextActionDetail("x", new Date("2026-01-01T00:00:00Z")),
      buildNoteDetail("y"),
    ]) {
      const parsed = JSON.parse(payload);
      expect(parsed).not.toHaveProperty("sellerName");
      expect(parsed).not.toHaveProperty("sellerPhone");
    }
  });
});

describe("parseActivityDetail", () => {
  it("parses objects and rejects everything else", () => {
    expect(parseActivityDetail('{"amountUsd":1}')).toEqual({ amountUsd: 1 });
    expect(parseActivityDetail("[1,2]")).toBeNull();
    expect(parseActivityDetail("not json")).toBeNull();
    expect(parseActivityDetail(null)).toBeNull();
  });
});

describe("activity types", () => {
  it("guards the closed set", () => {
    for (const type of ACTIVITY_TYPES) {
      expect(isActivityType(type)).toBe(true);
    }
    expect(isActivityType("deleted")).toBe(false);
  });
});
