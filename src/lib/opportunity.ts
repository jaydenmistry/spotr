// Opportunity Feed assessment. Everything here is a deterministic heuristic
// built on getVehicleAnalytics() — an internal synthesized estimate, NOT a
// market quote or a trained model. UI surfaces must label it as such.
import { getVehicleAnalytics, type LeadRecord } from "./vehicleAnalytics";

export interface ScoreFactor {
  label: string;
  detail: string;
  points: number;
}

export interface DataCompleteness {
  present: number;
  total: number;
  missing: string[];
}

export type ConfidenceTier = "Low" | "Medium" | "High";

export interface OpportunityAssessment {
  score: number;
  baseScore: number;
  factors: ScoreFactor[];
  // Internal heuristic band around the synthesized market value; null when
  // the listing has no asking price to anchor on.
  estimatedRange: { low: number; high: number } | null;
  confidencePercent: number;
  confidenceTier: ConfidenceTier;
  completeness: DataCompleteness;
  listingAgeDays: number;
}

export const BASE_SCORE = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

type CompletenessLead = Pick<
  LeadRecord,
  "vin" | "year" | "make" | "model" | "price" | "miles" | "photo_url" | "vdp_url" | "city" | "state"
>;

// Fields a manager needs before acting on an opportunity. Location counts
// once (city or state present).
const COMPLETENESS_CHECKS: Array<{ label: string; has: (lead: CompletenessLead) => boolean }> = [
  { label: "VIN", has: (lead) => Boolean(lead.vin) },
  { label: "year", has: (lead) => Boolean(lead.year) },
  { label: "make", has: (lead) => Boolean(lead.make) },
  { label: "model", has: (lead) => Boolean(lead.model) },
  { label: "asking price", has: (lead) => Boolean(lead.price) },
  { label: "mileage", has: (lead) => Boolean(lead.miles) },
  { label: "photo", has: (lead) => Boolean(lead.photo_url) },
  { label: "listing link", has: (lead) => Boolean(lead.vdp_url && lead.vdp_url !== "#") },
  { label: "location", has: (lead) => Boolean(lead.city || lead.state) },
];

export function getDataCompleteness(lead: CompletenessLead): DataCompleteness {
  const missing = COMPLETENESS_CHECKS.filter((check) => !check.has(lead)).map((check) => check.label);

  return {
    present: COMPLETENESS_CHECKS.length - missing.length,
    total: COMPLETENESS_CHECKS.length,
    missing,
  };
}

export function getListingAgeDays(createdAt: string, now: Date = new Date()) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) {
    return 0;
  }

  return Math.max(0, Math.floor((now.getTime() - created) / DAY_MS));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getOpportunityAssessment(
  lead: Pick<
    LeadRecord,
    | "vin"
    | "year"
    | "make"
    | "model"
    | "price"
    | "miles"
    | "photo_url"
    | "vdp_url"
    | "city"
    | "state"
    | "createdAt"
  >,
  now: Date = new Date()
): OpportunityAssessment {
  const analytics = getVehicleAnalytics(lead);
  const completeness = getDataCompleteness(lead);
  const listingAgeDays = getListingAgeDays(lead.createdAt, now);
  const factors: ScoreFactor[] = [];

  // Segment desirability vs. asking price: ±12 points. The "estimate" is a
  // keyword-driven percentage of the asking price itself, so this can never
  // reflect an independent valuation — label and weight it accordingly.
  if (lead.price) {
    const spreadPoints = clamp(Math.round(analytics.fairValueSpreadPercent * 150), -12, 12);
    factors.push({
      label:
        analytics.fairValueSpread >= 0
          ? "Segment trend favors the asking price"
          : "Segment trend disfavors the asking price",
      detail: `Make/model segment heuristic puts typical value about ${Math.abs(
        Math.round(analytics.fairValueSpreadPercent * 100)
      )}% ${analytics.fairValueSpread >= 0 ? "above" : "below"} asking — derived from segment keywords, not market comps.`,
      points: spreadPoints,
    });
  } else {
    factors.push({
      label: "No asking price listed",
      detail: "Without an asking price the value spread cannot be assessed.",
      points: -10,
    });
  }

  // 12-month heuristic trend: ±15 points.
  const trendPoints = clamp(Math.round(analytics.projectedChangePercent * 125), -15, 15);
  factors.push({
    label:
      analytics.projectedChangePercent >= 0
        ? "Heuristic trend: appreciating"
        : "Heuristic trend: depreciating",
    detail: `Internal heuristic projects a ${Math.round(
      analytics.projectedChangePercent * 100
    )}% 12-month value change for this make/model/age/mileage profile — not comp-based.`,
    points: trendPoints,
  });

  // Mileage relative to vehicle age: ±6 points.
  if (lead.miles && lead.year) {
    const age = Math.max(now.getFullYear() - lead.year, 1);
    const milesPerYear = lead.miles / age;
    const mileagePoints = milesPerYear < 6000 ? 6 : milesPerYear > 15000 ? -6 : 0;
    if (mileagePoints !== 0) {
      factors.push({
        label: mileagePoints > 0 ? "Low mileage for age" : "High mileage for age",
        detail: `About ${Math.round(milesPerYear).toLocaleString()} miles/year over ${age} year${age === 1 ? "" : "s"}.`,
        points: mileagePoints,
      });
    }
  }

  // Listing freshness: newly surfaced listings are more actionable.
  const freshnessPoints = listingAgeDays <= 3 ? 5 : listingAgeDays > 45 ? -5 : 0;
  if (freshnessPoints !== 0) {
    factors.push({
      label: freshnessPoints > 0 ? "Recently surfaced" : "Aging listing",
      detail:
        freshnessPoints > 0
          ? `Added to Spotr ${listingAgeDays === 0 ? "today" : `${listingAgeDays} day${listingAgeDays === 1 ? "" : "s"} ago`}.`
          : `In Spotr for ${listingAgeDays} days without acquisition.`,
      points: freshnessPoints,
    });
  }

  // Missing data drags the score: -3 per missing field. A missing asking
  // price already has its own dedicated factor above, so it is excluded here
  // to avoid double-penalizing one gap.
  const penalizedMissing = completeness.missing.filter((field) => field !== "asking price");
  if (penalizedMissing.length > 0) {
    factors.push({
      label: "Incomplete listing data",
      detail: `Missing: ${penalizedMissing.join(", ")}.`,
      points: -3 * penalizedMissing.length,
    });
  }

  const score = clamp(
    BASE_SCORE + factors.reduce((sum, factor) => sum + factor.points, 0),
    0,
    100
  );

  // Confidence is derived ONLY from observable data completeness — never from
  // the synthesized analytics (whose "confidence" is a trend-magnitude
  // artifact, not a data-quality measure). 95% with every field present,
  // minus 7 points per missing field.
  const confidencePercent = clamp(95 - completeness.missing.length * 7, 35, 95);

  const confidenceTier: ConfidenceTier =
    confidencePercent >= 80 ? "High" : confidencePercent >= 65 ? "Medium" : "Low";

  // Range width grows as confidence falls (7% half-width at 90% confidence,
  // ~13% at 60%).
  const estimatedRange =
    lead.price && analytics.estimatedMarketValue > 0
      ? {
          low: Math.round(analytics.estimatedMarketValue * (1 - (0.05 + (100 - confidencePercent) * 0.002))),
          high: Math.round(analytics.estimatedMarketValue * (1 + (0.05 + (100 - confidencePercent) * 0.002))),
        }
      : null;

  return {
    score,
    baseScore: BASE_SCORE,
    factors,
    estimatedRange,
    confidencePercent,
    confidenceTier,
    completeness,
    listingAgeDays,
  };
}
