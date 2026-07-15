import { describe, expect, it } from "vitest";
import {
  getDataCompleteness,
  getListingAgeDays,
  getOpportunityAssessment,
  roundEstimate,
} from "./opportunity";
import { DEFAULT_BUY_BOX, type BuyBoxConfig } from "./buyBox";

const NOW = new Date("2026-07-14T12:00:00Z");

const completeLead = {
  vin: "WP0AB2A99KS123456",
  year: 2019,
  make: "Porsche",
  model: "911 Carrera S",
  trim: "Carrera S",
  listingTitle: "2019 Porsche 911 Carrera S Coupe",
  price: 118500,
  miles: 21800,
  distanceMiles: 12.4,
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
  trim: null,
  listingTitle: null,
  price: 148000,
  miles: null,
  distanceMiles: null,
  photo_url: null,
  vdp_url: "#",
  city: null,
  state: null,
  createdAt: "2026-06-20T12:00:00Z",
};

const box = (overrides: Partial<BuyBoxConfig>): BuyBoxConfig => ({ ...DEFAULT_BUY_BOX, ...overrides });
const assess = (lead: Parameters<typeof getOpportunityAssessment>[0], buyBox: BuyBoxConfig = DEFAULT_BUY_BOX) =>
  getOpportunityAssessment(lead, buyBox, NOW);

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

describe("roundEstimate", () => {
  it("rounds to $100 at ≥ $10k and $50 below", () => {
    expect(roundEstimate(112549)).toBe(112500);
    expect(roundEstimate(112550)).toBe(112600);
    expect(roundEstimate(1774)).toBe(1750);
    expect(roundEstimate(1780)).toBe(1800);
  });
});

describe("score structure", () => {
  it("exposes raw score, risk penalty, and final score with clamp only after penalty", () => {
    for (const lead of [completeLead, sparseLead]) {
      const a = assess(lead);
      expect(a.finalOpportunityScore).toBe(Math.max(0, Math.min(100, a.rawScoreBeforeRisk - a.riskPenalty)));
      expect(a.riskPenalty).toBeGreaterThanOrEqual(0);
      expect(a.riskPenalty).toBeLessThanOrEqual(20);
      expect(a.finalOpportunityScore).toBeGreaterThanOrEqual(0);
      expect(a.finalOpportunityScore).toBeLessThanOrEqual(100);
    }
  });

  it("has five bands whose points never exceed their max and always explain themselves", () => {
    const a = assess(sparseLead);
    expect(a.bands.map((b) => b.key)).toEqual(["fit", "margin", "priceAdvantage", "confidence", "freshness"]);
    for (const band of a.bands) {
      expect(band.points).toBeGreaterThanOrEqual(0);
      expect(band.points).toBeLessThanOrEqual(band.max);
      expect(band.detail.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic for a fixed now", () => {
    expect(assess(completeLead)).toEqual(assess(completeLead));
  });

  it("missing data lowers score and confidence, never raises them", () => {
    const complete = assess(completeLead);
    const degraded = assess({ ...completeLead, vin: null, photo_url: null, miles: null });
    expect(degraded.confidencePercent).toBeLessThan(complete.confidencePercent);
    expect(degraded.finalOpportunityScore).toBeLessThan(complete.finalOpportunityScore);
  });

  it("derives confidence purely from data completeness", () => {
    const complete = assess(completeLead);
    expect(complete.confidencePercent).toBe(95);
    expect(complete.confidenceTier).toBe("High");
    const sparse = assess(sparseLead);
    expect(sparse.confidencePercent).toBe(95 - sparse.completeness.missing.length * 7);
    expect(sparse.confidenceTier).toBe("Low");
  });
});

describe("recommendation boundaries", () => {
  it("recommends BUY for a strong, complete, in-box lead", () => {
    const a = assess(completeLead);
    expect(a.finalOpportunityScore).toBeGreaterThanOrEqual(70);
    expect(a.confidenceTier).toBe("High");
    expect(a.maxOffer.status).toBe("ok");
    expect(a.recommendation).toBe("BUY");
  });

  it("always PASSes an Avoid make regardless of score", () => {
    const a = assess(completeLead, box({ makeRules: [{ make: "Porsche", priority: "Avoid" }] }));
    expect(a.recommendation).toBe("PASS");
    expect(a.buyBoxMatch.excluded).toBe(true);
    expect(a.riskPenalty).toBe(20);
    expect(a.recommendationReason.toLowerCase()).toContain("buy box");
  });

  it("PASSes when projected base-case gross is negative", () => {
    const a = assess(sparseLead);
    expect(a.baseProjectedGross).not.toBeNull();
    expect(a.baseProjectedGross!).toBeLessThan(0);
    expect(a.recommendation).toBe("PASS");
    expect(a.recommendationReason).toContain("negative");
  });

  it("never recommends BUY at Low confidence", () => {
    const variants = [
      { ...completeLead, vin: null, miles: null, photo_url: null, vdp_url: null, city: null, state: null },
      { ...completeLead, vin: null, year: null, photo_url: null, vdp_url: "#", city: null, state: null },
    ];
    for (const lead of variants) {
      const a = assess(lead);
      expect(a.confidenceTier).toBe("Low");
      expect(a.recommendation).not.toBe("BUY");
    }
  });

  it("demotes BUY to INVESTIGATE when the offer ceiling is below the acquisition range", () => {
    const a = assess(completeLead, box({ acquisitionMin: 150000 }));
    expect(a.maxOffer.status).toBe("below-acquisition-range");
    expect(a.recommendation).toBe("INVESTIGATE");
    expect(a.recommendationReason.toLowerCase()).toContain("acquisition range");
  });
});

describe("recommended max offer", () => {
  it("computes a rounded, positive ceiling below the conservative retail estimate", () => {
    const a = assess(completeLead);
    expect(a.maxOffer.status).toBe("ok");
    expect(a.maxOffer.amount).not.toBeNull();
    expect(a.maxOffer.amount! % 50).toBe(0);
    expect(a.maxOffer.amount!).toBeLessThan(a.estimatedRange!.low);
    expect(a.maxOffer.cappedByAcquisitionMax).toBe(false);
  });

  it("is unavailable with an exact reason when there is no asking price", () => {
    const a = assess({ ...completeLead, price: null });
    expect(a.maxOffer.status).toBe("unavailable");
    expect(a.maxOffer.amount).toBeNull();
    expect(a.maxOffer.reason).toContain("No asking price");
    expect(a.askingPrice.source).toBe("unavailable");
  });

  it("is unavailable with the arithmetic spelled out when the ceiling is ≤ $0", () => {
    const a = assess(completeLead, box({ targetMinGross: 500000 }));
    expect(a.maxOffer.status).toBe("unavailable");
    expect(a.maxOffer.amount).toBeNull();
    expect(a.maxOffer.reason).toContain("≤ $0");
    expect(a.maxOffer.reason).toContain("target gross");
  });

  it("caps the offer at acquisitionMax and flags the cap", () => {
    const uncapped = assess(completeLead);
    const capped = assess(completeLead, box({ acquisitionMax: uncapped.maxOffer.amount! - 10000 }));
    expect(capped.maxOffer.cappedByAcquisitionMax).toBe(true);
    expect(capped.maxOffer.amount).toBeLessThan(uncapped.maxOffer.amount!);
  });

  it("labels every offer input with a source and note", () => {
    const a = assess(completeLead);
    for (const input of Object.values(a.maxOffer.inputs)) {
      expect(["provider", "heuristic", "fixture-assumption", "unavailable"]).toContain(input.source);
      expect(input.note.length).toBeGreaterThan(0);
    }
    expect(a.maxOffer.inputs.recon.source).toBe("fixture-assumption");
    expect(a.maxOffer.inputs.conservativeRetail.source).toBe("heuristic");
  });
});

describe("economics scenarios", () => {
  it("produces conservative/base/upside with gross ordered accordingly", () => {
    const a = assess(completeLead);
    expect(a.scenarios.map((s) => s.name)).toEqual(["Conservative", "Base", "Upside"]);
    const [cons, base, up] = a.scenarios.map((s) => s.projectedGross.value!);
    expect(cons).toBeLessThan(base);
    expect(base).toBeLessThan(up);
  });

  it("rounds every scenario money value to estimate precision", () => {
    const a = assess(completeLead);
    for (const s of a.scenarios) {
      for (const v of [s.retail, s.recon, s.allIn, s.projectedGross]) {
        expect(Math.abs(v.value!) % 50).toBe(0);
      }
    }
  });

  it("emits no scenarios without an asking price", () => {
    expect(assess({ ...completeLead, price: null }).scenarios).toEqual([]);
  });
});

describe("source metadata", () => {
  it("marks real-listing asking price as provider data", () => {
    expect(assess(completeLead).askingPrice.source).toBe("provider");
  });

  it("marks fixture leads' asking price as a demo assumption", () => {
    const a = assess({ ...completeLead, vin: "SPOTR-FEED-9999" });
    expect(a.askingPrice.source).toBe("fixture-assumption");
  });

  it("always labels the estimate band as heuristic, not comps", () => {
    const a = assess(completeLead);
    expect(a.estimatedRange!.source).toBe("heuristic");
    expect(a.estimatedRange!.note).toContain("not market comps");
  });
});
