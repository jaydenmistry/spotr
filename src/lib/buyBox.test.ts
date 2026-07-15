import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUY_BOX,
  MAX_FIT_POINTS,
  matchBuyBox,
  parseKeywords,
  parseMakeRules,
  sanitizeKeywords,
  sanitizeMakeRules,
  type BuyBoxConfig,
} from "./buyBox";

const lead = {
  year: 2019,
  make: "Porsche",
  model: "911 Carrera S",
  trim: "Carrera S",
  listingTitle: "2019 Porsche 911 Carrera S Coupe",
  price: 118500,
  miles: 21800,
  distanceMiles: 12.4,
};

const box = (overrides: Partial<BuyBoxConfig>): BuyBoxConfig => ({ ...DEFAULT_BUY_BOX, ...overrides });

describe("parseMakeRules / sanitizeMakeRules", () => {
  it("returns [] for malformed JSON instead of throwing", () => {
    expect(parseMakeRules("{not json")).toEqual([]);
    expect(parseMakeRules('{"make":"Porsche"}')).toEqual([]);
    expect(parseMakeRules(null)).toEqual([]);
  });

  it("drops invalid entries and keeps valid ones", () => {
    const rules = sanitizeMakeRules([
      { make: "Porsche", priority: "Core" },
      { make: "", priority: "Core" },
      { make: "Ferrari", priority: "Sometimes" },
      { make: "BMW", priority: "Avoid" },
      42,
      null,
    ]);
    expect(rules).toEqual([
      { make: "Porsche", priority: "Core" },
      { make: "BMW", priority: "Avoid" },
    ]);
  });

  it("dedupes makes case-insensitively, first rule wins", () => {
    const rules = sanitizeMakeRules([
      { make: "Porsche", priority: "Core" },
      { make: "porsche", priority: "Avoid" },
    ]);
    expect(rules).toEqual([{ make: "Porsche", priority: "Core" }]);
  });
});

describe("parseKeywords / sanitizeKeywords", () => {
  it("handles malformed JSON and junk entries safely", () => {
    expect(parseKeywords("not json")).toEqual([]);
    expect(sanitizeKeywords(["salvage", "", "x".repeat(41), 7, "Salvage"])).toEqual(["salvage"]);
  });
});

describe("matchBuyBox", () => {
  it("awards full fit for a complete lead against the default (unconfigured) box", () => {
    const match = matchBuyBox(lead, DEFAULT_BUY_BOX);
    // 5 (no make prefs) + 4 + 4 + 4 + 3 = 20
    expect(match.fitPoints).toBe(20);
    expect(match.excluded).toBe(false);
    expect(match.priority).toBeNull();
  });

  it("awards maximum fit for a Core make meeting every criterion", () => {
    const match = matchBuyBox(
      lead,
      box({
        makeRules: [{ make: "Porsche", priority: "Core" }],
        yearMin: 2015,
        yearMax: 2024,
        maxMileage: 50000,
        acquisitionMin: 50000,
        acquisitionMax: 200000,
      })
    );
    expect(match.fitPoints).toBe(MAX_FIT_POINTS);
    expect(match.priority).toBe("Core");
  });

  it("hard-excludes Avoid makes with zero fit", () => {
    const match = matchBuyBox(lead, box({ makeRules: [{ make: "porsche", priority: "Avoid" }] }));
    expect(match.excluded).toBe(true);
    expect(match.fitPoints).toBe(0);
    expect(match.reasons[0]).toContain("Avoid");
  });

  it("hard-excludes on exclusion keywords across title/make/model/trim", () => {
    const match = matchBuyBox(
      { ...lead, listingTitle: "2019 Porsche 911 — rebuilt title" },
      box({ excludedKeywords: ["rebuilt title"] })
    );
    expect(match.excluded).toBe(true);
    expect(match.reasons[0]).toContain("rebuilt title");
  });

  it("treats missing lead data against a configured criterion as zero points, not fit", () => {
    const configured = box({ yearMin: 2015, yearMax: 2024, maxMileage: 50000 });
    const unknownYear = matchBuyBox({ ...lead, year: null }, configured);
    const knownYear = matchBuyBox(lead, configured);
    expect(unknownYear.fitPoints).toBeLessThan(knownYear.fitPoints);
    expect(unknownYear.reasons.join(" ")).toContain("year unknown");
  });

  it("scores out-of-range year, over-cap mileage, and out-of-band price as misses", () => {
    const match = matchBuyBox(
      lead,
      box({ yearMin: 2021, maxMileage: 10000, acquisitionMax: 100000 })
    );
    // make 5 + year 0 + mileage 0 + price 0 + distance 3
    expect(match.fitPoints).toBe(8);
    expect(match.reasons.join(" ")).toContain("outside");
    expect(match.reasons.join(" ")).toContain("exceeds");
    expect(match.reasons.join(" ")).toContain("ceiling");
  });

  it("gives unknown distance partial credit as a data gap", () => {
    const unknown = matchBuyBox({ ...lead, distanceMiles: null }, DEFAULT_BUY_BOX);
    const known = matchBuyBox(lead, DEFAULT_BUY_BOX);
    const beyond = matchBuyBox({ ...lead, distanceMiles: 400 }, DEFAULT_BUY_BOX);
    expect(unknown.fitPoints).toBe(known.fitPoints - 2);
    expect(beyond.fitPoints).toBe(known.fitPoints - 3);
  });
});
