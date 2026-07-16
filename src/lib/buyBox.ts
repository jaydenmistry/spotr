// Buy Box: the dealership's acquisition criteria and the pure matching logic
// that scores a lead against them (0–25 fit points for the opportunity score).
// Pure module — no DB access here; persistence lives in src/lib/buyBoxStore.ts
// and src/app/api/buybox/route.ts.

export type BuyBoxPriority = "Core" | "Opportunistic" | "Avoid";

export interface MakeRule {
  make: string;
  priority: BuyBoxPriority;
}

export interface BuyBoxConfig {
  yearMin: number | null;
  yearMax: number | null;
  maxMileage: number | null;
  /** Asking-price band the desk buys in (USD). */
  acquisitionMin: number | null;
  acquisitionMax: number | null;
  /** Sanity band for retail estimates (USD). */
  targetRetailMin: number | null;
  targetRetailMax: number | null;
  /** Gross-profit planning target (USD); drives the recommended max offer. */
  targetMinGross: number;
  radiusMiles: number;
  makeRules: MakeRule[];
  excludedKeywords: string[];
}

// Single-tenant v1: one global buy box. The row id is the future tenancy seam.
export const BUY_BOX_ID = "default";

export const DEFAULT_BUY_BOX: BuyBoxConfig = {
  yearMin: null,
  yearMax: null,
  maxMileage: null,
  acquisitionMin: null,
  acquisitionMax: null,
  targetRetailMin: null,
  targetRetailMax: null,
  targetMinGross: 3000,
  radiusMiles: 100,
  makeRules: [],
  excludedKeywords: [],
};

export const BUY_BOX_PRIORITIES: readonly BuyBoxPriority[] = ["Core", "Opportunistic", "Avoid"];

function isMakeRule(value: unknown): value is MakeRule {
  if (!value || typeof value !== "object") return false;
  const rule = value as Partial<MakeRule>;
  return (
    typeof rule.make === "string" &&
    rule.make.trim().length > 0 &&
    typeof rule.priority === "string" &&
    (BUY_BOX_PRIORITIES as readonly string[]).includes(rule.priority)
  );
}

/** Validates an untrusted array (API payloads, parsed JSON) into MakeRules. */
export function sanitizeMakeRules(value: unknown): MakeRule[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const rules: MakeRule[] = [];
  for (const entry of value) {
    if (!isMakeRule(entry)) continue;
    const make = entry.make.trim();
    const key = make.toLowerCase();
    if (seen.has(key)) continue; // first rule per make wins
    seen.add(key);
    rules.push({ make, priority: entry.priority });
  }
  return rules;
}

export function sanitizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const keyword = entry.trim();
    if (keyword.length === 0 || keyword.length > 40) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    keywords.push(keyword);
  }
  return keywords;
}

/** Malformed persisted JSON degrades to an empty list, never a throw. */
export function parseMakeRules(json: string | null | undefined): MakeRule[] {
  if (!json) return [];
  try {
    return sanitizeMakeRules(JSON.parse(json));
  } catch {
    return [];
  }
}

export function parseKeywords(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    return sanitizeKeywords(JSON.parse(json));
  } catch {
    return [];
  }
}

export const MAX_FIT_POINTS = 25;

export interface BuyBoxMatch {
  /** 0–25; the Buy Box Fit band of the opportunity score. */
  fitPoints: number;
  maxFitPoints: number;
  /** Priority from the make rules; null when no rule covers this make. */
  priority: BuyBoxPriority | null;
  /** Avoid-priority make or exclusion-keyword hit → hard exclusion. */
  excluded: boolean;
  reasons: string[];
}

interface MatchableLead {
  year: number | null;
  make: string | null;
  model: string | null;
  trim?: string | null;
  listingTitle: string | null;
  price: number | null;
  miles: number | null;
  distanceMiles: number | null;
}

// Fit bands: make priority 10, year 4, mileage 4, asking band 4, distance 3.
// Unset criteria award full points (an unconfigured box excludes nothing);
// missing LEAD data against a configured criterion awards zero — uncertainty
// never counts as fit.
export function matchBuyBox(lead: MatchableLead, box: BuyBoxConfig): BuyBoxMatch {
  const reasons: string[] = [];
  const searchable = [lead.listingTitle, lead.make, lead.model, lead.trim]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const keywordHit = box.excludedKeywords.find((keyword) => searchable.includes(keyword.toLowerCase()));
  const rule = lead.make
    ? box.makeRules.find((candidate) => candidate.make.toLowerCase() === lead.make!.toLowerCase())
    : undefined;
  const priority = rule?.priority ?? null;

  if (keywordHit) {
    return {
      fitPoints: 0,
      maxFitPoints: MAX_FIT_POINTS,
      priority,
      excluded: true,
      reasons: [`Matches excluded keyword "${keywordHit}"`],
    };
  }

  if (priority === "Avoid") {
    return {
      fitPoints: 0,
      maxFitPoints: MAX_FIT_POINTS,
      priority,
      excluded: true,
      reasons: [`${lead.make} is marked Avoid in the buy box`],
    };
  }

  let points = 0;

  // Make priority: 0–10
  if (priority === "Core") {
    points += 10;
    reasons.push(`Core make: ${lead.make}`);
  } else if (priority === "Opportunistic") {
    points += 6;
    reasons.push(`Opportunistic make: ${lead.make}`);
  } else if (!lead.make) {
    reasons.push("Make unknown — cannot check make preferences");
  } else if (box.makeRules.length === 0) {
    points += 5;
    reasons.push("No make preferences configured (neutral)");
  } else {
    points += 5;
    reasons.push(`No buy-box rule for ${lead.make} (neutral)`);
  }

  // Model year: 0–4
  if (box.yearMin === null && box.yearMax === null) {
    points += 4;
  } else if (lead.year === null) {
    reasons.push("Model year unknown — cannot confirm year range");
  } else if ((box.yearMin === null || lead.year >= box.yearMin) && (box.yearMax === null || lead.year <= box.yearMax)) {
    points += 4;
  } else {
    reasons.push(`${lead.year} is outside the ${box.yearMin ?? "any"}–${box.yearMax ?? "any"} year range`);
  }

  // Mileage: 0–4
  if (box.maxMileage === null) {
    points += 4;
  } else if (lead.miles === null) {
    reasons.push("Mileage unknown — cannot confirm mileage cap");
  } else if (lead.miles <= box.maxMileage) {
    points += 4;
  } else {
    reasons.push(`${lead.miles.toLocaleString("en-US")} mi exceeds the ${box.maxMileage.toLocaleString("en-US")} mi cap`);
  }

  // Asking price band: 0–4
  if (box.acquisitionMin === null && box.acquisitionMax === null) {
    points += 4;
  } else if (lead.price === null || lead.price === 0) {
    reasons.push("No asking price — cannot confirm acquisition band");
  } else if (
    (box.acquisitionMin === null || lead.price >= box.acquisitionMin) &&
    (box.acquisitionMax === null || lead.price <= box.acquisitionMax)
  ) {
    points += 4;
  } else if (box.acquisitionMax !== null && lead.price > box.acquisitionMax) {
    reasons.push(`Asking is above the $${box.acquisitionMax.toLocaleString("en-US")} acquisition ceiling`);
  } else {
    reasons.push(`Asking is below the $${(box.acquisitionMin ?? 0).toLocaleString("en-US")} acquisition floor`);
  }

  // Distance: 0–3 (radius always has a value; unknown distance gets 1, not 0 —
  // it is a data gap, not a confirmed miss)
  if (lead.distanceMiles === null || lead.distanceMiles === undefined) {
    points += 1;
    reasons.push("Distance unknown — within-radius unconfirmed");
  } else if (lead.distanceMiles <= box.radiusMiles) {
    points += 3;
  } else {
    reasons.push(`${Math.round(lead.distanceMiles)} mi away exceeds the ${box.radiusMiles} mi radius`);
  }

  return {
    fitPoints: Math.min(points, MAX_FIT_POINTS),
    maxFitPoints: MAX_FIT_POINTS,
    priority,
    excluded: false,
    reasons,
  };
}
