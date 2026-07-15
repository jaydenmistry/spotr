import { describe, expect, it } from "vitest";
import {
  BASE_SCORE,
  getDataCompleteness,
  getListingAgeDays,
  getOpportunityAssessment,
} from "./opportunity";

const NOW = new Date("2026-07-14T12:00:00Z");

const completeLead = {
  vin: "WP0AB2A99KS123456",
  year: 2019,
  make: "Porsche",
  model: "911 Carrera S",
  price: 118500,
  miles: 21800,
  photo_url: "https://example.com/photo.jpg",
  vdp_url: "https://example.com/listing",
  city: "Lawrenceville",
  state: "GA",
  createdAt: "2026-07-13T12:00:00Z",
};

const sparseLead = {
  vin: null,
  year: null,
  make: "Rolls-Royce",
  model: "Ghost",
  price: 148000,
  miles: null,
  photo_url: null,
  vdp_url: "#",
  city: null,
  state: null,
  createdAt: "2026-06-20T12:00:00Z",
};

describe("getDataCompleteness", () => {
  it("reports a complete lead as having all data points", () => {
    const completeness = getDataCompleteness(completeLead);
    expect(completeness.present).toBe(completeness.total);
    expect(completeness.missing).toEqual([]);
  });

  it("lists each missing field by human-readable name", () => {
    const completeness = getDataCompleteness(sparseLead);
    expect(completeness.missing).toEqual(
      expect.arrayContaining(["VIN", "year", "mileage", "photo", "listing link", "location"])
    );
    expect(completeness.present).toBe(completeness.total - completeness.missing.length);
  });

  it("counts location as present when only state exists", () => {
    const completeness = getDataCompleteness({ ...sparseLead, state: "GA" });
    expect(completeness.missing).not.toContain("location");
  });

  it("treats '#' vdp_url as a missing listing link", () => {
    const completeness = getDataCompleteness({ ...completeLead, vdp_url: "#" });
    expect(completeness.missing).toContain("listing link");
  });
});

describe("getListingAgeDays", () => {
  it("computes whole days since createdAt", () => {
    expect(getListingAgeDays("2026-07-13T12:00:00Z", NOW)).toBe(1);
    expect(getListingAgeDays("2026-07-14T06:00:00Z", NOW)).toBe(0);
    expect(getListingAgeDays("2026-05-14T12:00:00Z", NOW)).toBe(61);
  });

  it("never returns a negative age and tolerates bad dates", () => {
    expect(getListingAgeDays("2027-01-01T00:00:00Z", NOW)).toBe(0);
    expect(getListingAgeDays("not-a-date", NOW)).toBe(0);
  });
});

describe("getOpportunityAssessment", () => {
  it("is deterministic for the same input", () => {
    const first = getOpportunityAssessment(completeLead, NOW);
    const second = getOpportunityAssessment(completeLead, NOW);
    expect(first).toEqual(second);
  });

  it("keeps the score within 0-100", () => {
    for (const lead of [completeLead, sparseLead, { ...completeLead, price: null }]) {
      const { score } = getOpportunityAssessment(lead, NOW);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("makes the factor breakdown sum exactly to the score (before clamping)", () => {
    const assessment = getOpportunityAssessment(completeLead, NOW);
    const factorSum = assessment.factors.reduce((sum, factor) => sum + factor.points, 0);
    expect(assessment.score).toBe(
      Math.max(0, Math.min(100, BASE_SCORE + factorSum))
    );
  });

  it("penalizes missing data via an explicit factor", () => {
    const assessment = getOpportunityAssessment(sparseLead, NOW);
    const missingFactor = assessment.factors.find((factor) => factor.label === "Incomplete listing data");
    expect(missingFactor).toBeDefined();
    expect(missingFactor!.points).toBe(-3 * assessment.completeness.missing.length);
  });

  it("does not double-penalize a missing asking price", () => {
    const assessment = getOpportunityAssessment({ ...completeLead, price: null }, NOW);
    expect(assessment.factors.some((factor) => factor.label === "No asking price listed")).toBe(true);
    const missingFactor = assessment.factors.find((factor) => factor.label === "Incomplete listing data");
    expect(missingFactor?.detail ?? "").not.toContain("asking price");
  });

  it("derives confidence purely from data completeness", () => {
    const complete = getOpportunityAssessment(completeLead, NOW);
    expect(complete.completeness.missing).toEqual([]);
    expect(complete.confidencePercent).toBe(95);
    expect(complete.confidenceTier).toBe("High");

    const oneGap = getOpportunityAssessment({ ...completeLead, photo_url: null }, NOW);
    expect(oneGap.confidencePercent).toBe(88);

    const sparse = getOpportunityAssessment(sparseLead, NOW);
    expect(sparse.completeness.missing.length).toBeGreaterThanOrEqual(3);
    expect(sparse.confidencePercent).toBe(95 - sparse.completeness.missing.length * 7);
    expect(sparse.confidenceTier).toBe("Low");
  });

  it("produces an estimated range bracketing the heuristic value only when a price exists", () => {
    const withPrice = getOpportunityAssessment(completeLead, NOW);
    expect(withPrice.estimatedRange).not.toBeNull();
    expect(withPrice.estimatedRange!.low).toBeLessThan(withPrice.estimatedRange!.high);
    expect(withPrice.estimatedRange!.low).toBeGreaterThan(0);

    const withoutPrice = getOpportunityAssessment({ ...completeLead, price: null }, NOW);
    expect(withoutPrice.estimatedRange).toBeNull();
  });

  it("adds a no-asking-price factor when price is missing", () => {
    const assessment = getOpportunityAssessment({ ...completeLead, price: null }, NOW);
    expect(assessment.factors.some((factor) => factor.label === "No asking price listed")).toBe(true);
  });

  it("flags aging listings and rewards fresh ones", () => {
    const fresh = getOpportunityAssessment(completeLead, NOW);
    expect(fresh.factors.some((factor) => factor.label === "Recently surfaced")).toBe(true);

    const stale = getOpportunityAssessment({ ...completeLead, createdAt: "2026-05-01T12:00:00Z" }, NOW);
    expect(stale.factors.some((factor) => factor.label === "Aging listing")).toBe(true);
  });
});
