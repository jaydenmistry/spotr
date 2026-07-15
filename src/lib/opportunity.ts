// Opportunity assessment: banded 0–100 score, recommended max offer, and
// acquisition economics for a lead against the dealership buy box.
//
// Everything here is a DETERMINISTIC HEURISTIC built on getVehicleAnalytics()
// — an internal synthesized estimate, NOT market comps, an appraisal, or a
// trained model. Every numeric output carries structural source metadata
// (SourcedValue) so the UI labels provenance from data, not hardcoded copy.
import { getVehicleAnalytics, type LeadRecord } from "./vehicleAnalytics";
import { matchBuyBox, type BuyBoxConfig, type BuyBoxMatch } from "./buyBox";

/* ── Source metadata ─────────────────────────────────────────── */

export type ValueSource = "provider" | "heuristic" | "fixture-assumption" | "unavailable";

export interface SourcedValue {
  value: number | null;
  source: ValueSource;
  /** What this number is based on — shown to the user, never omitted. */
  note: string;
}

export const SOURCE_LABELS: Record<ValueSource, string> = {
  provider: "Provider data",
  heuristic: "Spotr heuristic",
  "fixture-assumption": "Demo assumption",
  unavailable: "Unavailable",
};

/* ── Assessment types ────────────────────────────────────────── */

export interface ScoreBand {
  key: "fit" | "margin" | "priceAdvantage" | "confidence" | "freshness";
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface RiskFactor {
  label: string;
  detail: string;
  /** Positive number of points deducted. */
  points: number;
}

export type Recommendation = "BUY" | "INVESTIGATE" | "WATCH" | "PASS";
export type RiskLevel = "Low" | "Medium" | "High";
export type ConfidenceTier = "Low" | "Medium" | "High";
export type MaxOfferStatus = "ok" | "below-acquisition-range" | "unavailable";

export interface MaxOfferResult {
  status: MaxOfferStatus;
  /**
   * Rounded offer ceiling (internal heuristic estimate). Present for
   * "ok" and "below-acquisition-range"; null when "unavailable".
   */
  amount: number | null;
  /** Exact missing/invalid input when unavailable. */
  reason: string | null;
  cappedByAcquisitionMax: boolean;
  inputs: {
    conservativeRetail: SourcedValue;
    targetGross: SourcedValue;
    recon: SourcedValue;
    transport: SourcedValue;
    uncertaintyBuffer: SourcedValue;
  };
}

export interface EconomicsScenario {
  name: "Conservative" | "Base" | "Upside";
  description: string;
  retail: SourcedValue;
  recon: SourcedValue;
  transport: SourcedValue;
  /** Asking + recon + transport (buying at asking). */
  allIn: SourcedValue;
  /** Retail − all-in. A planning projection, never a guarantee. */
  projectedGross: SourcedValue;
}

export interface DataCompleteness {
  present: number;
  total: number;
  missing: string[];
}

export interface OpportunityAssessment {
  bands: ScoreBand[];
  riskFactors: RiskFactor[];
  /** Band points scaled to a 0–100 basis, before the risk deduction. */
  rawScoreBeforeRisk: number;
  /** 0–20, shown as an explicit deduction. */
  riskPenalty: number;
  /** clamp(raw − penalty, 0, 100). Clamped only after the penalty. */
  finalOpportunityScore: number;
  recommendation: Recommendation;
  recommendationReason: string;
  riskLevel: RiskLevel;
  buyBoxMatch: BuyBoxMatch;
  askingPrice: SourcedValue;
  /** Heuristic retail-value band; null when no asking price anchors it. */
  estimatedRange: { low: number; mid: number; high: number; source: ValueSource; note: string } | null;
  maxOffer: MaxOfferResult;
  scenarios: EconomicsScenario[];
  /** Base-case projected gross, duplicated for sorting convenience. */
  baseProjectedGross: number | null;
  confidencePercent: number;
  confidenceTier: ConfidenceTier;
  completeness: DataCompleteness;
  listingAgeDays: number;
}

/* ── Completeness & freshness (observable data only) ─────────── */

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

/* ── Helpers ─────────────────────────────────────────────────── */

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Estimates and derived money are never shown with dollar precision:
 * nearest $100 at ≥ $10k, nearest $50 below. Provider values (asking
 * price) are kept exact.
 */
export function roundEstimate(value: number): number {
  const step = Math.abs(value) >= 10000 ? 100 : 50;
  return Math.round(value / step) * step;
}

export function isFixtureLead(lead: Pick<LeadRecord, "vin">): boolean {
  return Boolean(lead.vin && (lead.vin.startsWith("SPOTR-") || lead.vin.startsWith("LIVE-")));
}

const usd = (value: number) =>
  `${value < 0 ? "−" : ""}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;

/* ── Assessment ──────────────────────────────────────────────── */

type AssessableLead = Pick<
  LeadRecord,
  | "vin"
  | "year"
  | "make"
  | "model"
  | "trim"
  | "listingTitle"
  | "price"
  | "miles"
  | "distanceMiles"
  | "photo_url"
  | "vdp_url"
  | "city"
  | "state"
  | "createdAt"
>;

const MAX_BAND_POINTS = 80; // fit 25 + margin 25 + price adv 15 + confidence 10 + freshness 5
const MAX_RISK_PENALTY = 20;

export function getOpportunityAssessment(
  lead: AssessableLead,
  buyBox: BuyBoxConfig,
  now: Date = new Date()
): OpportunityAssessment {
  const analytics = getVehicleAnalytics(lead);
  const completeness = getDataCompleteness(lead);
  const listingAgeDays = getListingAgeDays(lead.createdAt, now);
  const buyBoxMatch = matchBuyBox(lead, buyBox);
  const fixture = isFixtureLead(lead);

  // Confidence is derived ONLY from observable data completeness — never from
  // the synthesized analytics. 95% with every field present, −7/missing field.
  const confidencePercent = clamp(95 - completeness.missing.length * 7, 35, 95);
  const confidenceTier: ConfidenceTier =
    confidencePercent >= 80 ? "High" : confidencePercent >= 65 ? "Medium" : "Low";

  const asking = lead.price && lead.price > 0 ? lead.price : null;
  const askingPrice: SourcedValue = asking
    ? {
        value: asking,
        source: fixture ? "fixture-assumption" : "provider",
        note: fixture ? "Synthetic demo listing — not a real seller" : "Asking price as published on the source listing.",
      }
    : { value: null, source: "unavailable", note: "No asking price on the listing" };

  // Heuristic retail band around the synthesized market value. Width grows as
  // confidence falls (±7% at 90% confidence, ~±13% at 60%).
  const estimateNote =
    "Derived from the asking price and make/model segment keywords — a Spotr heuristic, not market comps or an appraisal.";
  let estimatedRange: OpportunityAssessment["estimatedRange"] = null;
  if (asking && analytics.estimatedMarketValue > 0) {
    const halfWidth = 0.05 + (100 - confidencePercent) * 0.002;
    estimatedRange = {
      low: roundEstimate(analytics.estimatedMarketValue * (1 - halfWidth)),
      mid: roundEstimate(analytics.estimatedMarketValue),
      high: roundEstimate(analytics.estimatedMarketValue * (1 + halfWidth)),
      source: "heuristic",
      note: estimateNote,
    };
  }

  // Cost assumptions (labeled demo assumptions until real inputs exist).
  const recon: SourcedValue = asking
    ? {
        value: roundEstimate(Math.max(600, asking * 0.015)),
        source: "fixture-assumption",
        note: "Flat assumption: greater of $600 or 1.5% of asking. Replace with an inspection-based estimate.",
      }
    : { value: null, source: "unavailable", note: "Needs an asking price to estimate reconditioning" };
  const transport: SourcedValue =
    lead.distanceMiles !== null && lead.distanceMiles !== undefined
      ? {
          value: roundEstimate(Math.min(500, 150 + 2 * lead.distanceMiles)),
          source: "fixture-assumption",
          note: `Assumption: $150 + $2/mile for ${Math.round(lead.distanceMiles)} mi, capped at $500.`,
        }
      : {
          value: 350,
          source: "fixture-assumption",
          note: "Distance unknown — flat $350 transport assumption.",
        };

  /* ── Score bands ─────────────────────────────────────────── */

  const bands: ScoreBand[] = [];

  bands.push({
    key: "fit",
    label: "Buy box fit",
    points: buyBoxMatch.fitPoints,
    max: buyBoxMatch.maxFitPoints,
    detail: buyBoxMatch.reasons.length > 0 ? buyBoxMatch.reasons.join("; ") : "Meets every configured criterion",
  });

  // Estimated margin (0–25): base-case projected gross vs. the gross target.
  // Full points at 2× target, zero at ≤ $0 gross.
  const targetGross = Math.max(500, buyBox.targetMinGross);
  let baseProjectedGross: number | null = null;
  if (asking && estimatedRange && recon.value !== null && transport.value !== null) {
    baseProjectedGross = roundEstimate(estimatedRange.mid - (asking + recon.value + transport.value));
    const marginPoints = clamp(Math.round((25 * baseProjectedGross) / (2 * targetGross)), 0, 25);
    bands.push({
      key: "margin",
      label: "Estimated margin",
      points: marginPoints,
      max: 25,
      detail: `Projected base-case gross ${usd(baseProjectedGross)} vs. the ${usd(targetGross)} planning target — heuristic retail estimate minus asking, recon, and transport assumptions.`,
    });
  } else {
    bands.push({
      key: "margin",
      label: "Estimated margin",
      points: 0,
      max: 25,
      detail: "Cannot project margin — no asking price to anchor the estimate.",
    });
  }

  // Price-to-estimate advantage (0–15).
  let spreadPercent: number | null = null;
  if (asking && estimatedRange) {
    spreadPercent = (estimatedRange.mid - asking) / asking;
    const advantagePoints = clamp(Math.round(spreadPercent * 150), 0, 15);
    bands.push({
      key: "priceAdvantage",
      label: "Price vs. estimate",
      points: advantagePoints,
      max: 15,
      detail: `Asking is ${Math.abs(Math.round(spreadPercent * 100))}% ${spreadPercent >= 0 ? "below" : "above"} the heuristic estimate midpoint (${usd(estimatedRange.mid)}).`,
    });
  } else {
    bands.push({
      key: "priceAdvantage",
      label: "Price vs. estimate",
      points: 0,
      max: 15,
      detail: "No asking price — spread to estimate unavailable.",
    });
  }

  // Data confidence (0–10), from completeness only.
  bands.push({
    key: "confidence",
    label: "Data confidence",
    points: clamp(Math.round(((confidencePercent - 35) / 60) * 10), 0, 10),
    max: 10,
    detail:
      completeness.missing.length === 0
        ? "All key listing fields present."
        : `Missing: ${completeness.missing.join(", ")}.`,
  });

  // Freshness (0–5): how recently Spotr ingested the listing.
  const freshnessPoints = listingAgeDays <= 3 ? 5 : listingAgeDays <= 10 ? 3 : listingAgeDays <= 30 ? 1 : 0;
  bands.push({
    key: "freshness",
    label: "Freshness",
    points: freshnessPoints,
    max: 5,
    detail:
      listingAgeDays === 0
        ? "Found by Spotr today."
        : `Found by Spotr ${listingAgeDays} day${listingAgeDays === 1 ? "" : "s"} ago (ingestion date, not seller days-on-market).`,
  });

  /* ── Risk penalty (0–20, explicit deduction) ─────────────── */

  const riskFactors: RiskFactor[] = [];
  if (buyBoxMatch.excluded) {
    riskFactors.push({
      label: "Outside buy box",
      detail: buyBoxMatch.reasons.join("; "),
      points: 20,
    });
  }
  if (spreadPercent !== null && spreadPercent <= -0.04) {
    riskFactors.push({
      label: "Priced above estimate",
      detail: `Asking exceeds the heuristic estimate midpoint by ${Math.abs(Math.round(spreadPercent * 100))}%.`,
      points: spreadPercent <= -0.08 ? 8 : 4,
    });
  }
  if (listingAgeDays > 45) {
    riskFactors.push({
      label: "Stale listing",
      detail: `In Spotr for ${listingAgeDays} days without acquisition — may be gone or overpriced.`,
      points: 4,
    });
  }
  if (lead.miles && lead.year) {
    const age = Math.max(now.getFullYear() - lead.year, 1);
    const milesPerYear = lead.miles / age;
    if (milesPerYear > 15000) {
      riskFactors.push({
        label: "High mileage for age",
        detail: `About ${Math.round(milesPerYear).toLocaleString("en-US")} miles/year over ${age} year${age === 1 ? "" : "s"}.`,
        points: 4,
      });
    }
  }
  if (completeness.missing.length >= 3) {
    riskFactors.push({
      label: "Multiple data gaps",
      detail: `${completeness.missing.length} key fields missing: ${completeness.missing.join(", ")}.`,
      points: 4,
    });
  }
  if (asking && buyBox.acquisitionMax !== null && asking > buyBox.acquisitionMax) {
    riskFactors.push({
      label: "Above acquisition ceiling",
      detail: `Asking ${usd(asking)} exceeds the configured ${usd(buyBox.acquisitionMax)} maximum.`,
      points: 3,
    });
  }
  if (analytics.projectedChangePercent <= -0.05) {
    riskFactors.push({
      label: "Depreciating segment",
      detail: `Heuristic segment trend projects ${Math.round(analytics.projectedChangePercent * 100)}% over 12 months.`,
      points: 3,
    });
  }

  const riskPenalty = Math.min(
    MAX_RISK_PENALTY,
    riskFactors.reduce((sum, factor) => sum + factor.points, 0)
  );

  const bandPoints = bands.reduce((sum, band) => sum + band.points, 0);
  const rawScoreBeforeRisk = clamp(Math.round((bandPoints / MAX_BAND_POINTS) * 100), 0, 100);
  // Clamp only after applying the penalty so the deduction is never hidden.
  const finalOpportunityScore = clamp(rawScoreBeforeRisk - riskPenalty, 0, 100);

  const riskLevel: RiskLevel = buyBoxMatch.excluded || riskPenalty >= 12 ? "High" : riskPenalty >= 6 ? "Medium" : "Low";

  /* ── Recommended max offer ───────────────────────────────── */

  const targetGrossValue: SourcedValue = {
    value: targetGross,
    source: "provider",
    note: "Configured buy-box gross target — a planning target based on your settings, not a guarantee.",
  };
  const conservativeRetail: SourcedValue = estimatedRange
    ? { value: estimatedRange.low, source: "heuristic", note: `Low end of the heuristic estimate band. ${estimateNote}` }
    : { value: null, source: "unavailable", note: "No estimate — the heuristic needs an asking price to anchor on." };
  const uncertaintyBuffer: SourcedValue = estimatedRange
    ? {
        value: roundEstimate(estimatedRange.mid * 0.05 * ((100 - confidencePercent) / 100)),
        source: "heuristic",
        note: `Contingency that grows as data confidence falls (currently ${confidencePercent}%).`,
      }
    : { value: null, source: "unavailable", note: "No estimate to buffer against." };

  let maxOffer: MaxOfferResult;
  const offerInputs = { conservativeRetail, targetGross: targetGrossValue, recon, transport, uncertaintyBuffer };
  if (!asking) {
    maxOffer = {
      status: "unavailable",
      amount: null,
      reason: "No asking price on the listing — the heuristic estimate is anchored to asking, so no offer ceiling can be computed.",
      cappedByAcquisitionMax: false,
      inputs: offerInputs,
    };
  } else if (!estimatedRange || conservativeRetail.value === null || recon.value === null || transport.value === null || uncertaintyBuffer.value === null) {
    maxOffer = {
      status: "unavailable",
      amount: null,
      reason: "Value estimate unavailable for this listing.",
      cappedByAcquisitionMax: false,
      inputs: offerInputs,
    };
  } else {
    const ceiling = conservativeRetail.value - targetGross - recon.value - transport.value - uncertaintyBuffer.value;
    const rounded = roundEstimate(ceiling);
    if (rounded <= 0) {
      maxOffer = {
        status: "unavailable",
        amount: null,
        reason: `Computed ceiling is ≤ $0 under conservative assumptions (retail low ${usd(conservativeRetail.value)} − target gross ${usd(targetGross)} − recon ${usd(recon.value)} − transport ${usd(transport.value)} − buffer ${usd(uncertaintyBuffer.value)}).`,
        cappedByAcquisitionMax: false,
        inputs: offerInputs,
      };
    } else {
      const capped = buyBox.acquisitionMax !== null && rounded > buyBox.acquisitionMax;
      const amount = capped ? roundEstimate(buyBox.acquisitionMax!) : rounded;
      maxOffer = {
        status: buyBox.acquisitionMin !== null && amount < buyBox.acquisitionMin ? "below-acquisition-range" : "ok",
        amount,
        reason: null,
        cappedByAcquisitionMax: capped,
        inputs: offerInputs,
      };
    }
  }

  /* ── Scenarios ───────────────────────────────────────────── */

  const scenarios: EconomicsScenario[] = [];
  if (asking && estimatedRange && recon.value !== null && transport.value !== null) {
    const scenarioDefs = [
      { name: "Conservative" as const, retail: estimatedRange.low, reconFactor: 1.25, description: "Low-end retail estimate, recon runs 25% over the assumption." },
      { name: "Base" as const, retail: estimatedRange.mid, reconFactor: 1, description: "Midpoint retail estimate with stated cost assumptions." },
      { name: "Upside" as const, retail: estimatedRange.high, reconFactor: 0.75, description: "High-end retail estimate, recon comes in 25% under." },
    ];
    for (const def of scenarioDefs) {
      const scenarioRecon = roundEstimate(recon.value * def.reconFactor);
      const allIn = roundEstimate(asking + scenarioRecon + transport.value);
      scenarios.push({
        name: def.name,
        description: def.description,
        retail: { value: def.retail, source: "heuristic", note: estimateNote },
        recon: { value: scenarioRecon, source: "fixture-assumption", note: recon.note },
        transport,
        allIn: { value: allIn, source: "heuristic", note: "Asking price + recon assumption + transport assumption (buying at asking)." },
        projectedGross: {
          value: roundEstimate(def.retail - allIn),
          source: "heuristic",
          note: "Retail estimate minus all-in cost — a planning projection, not a guarantee.",
        },
      });
    }
  }

  /* ── Recommendation ──────────────────────────────────────── */

  let recommendation: Recommendation;
  let recommendationReason: string;
  const topBand = [...bands].sort((a, b) => b.points / b.max - a.points / a.max)[0];
  const topRisk = [...riskFactors].sort((a, b) => b.points - a.points)[0];

  if (buyBoxMatch.excluded) {
    recommendation = "PASS";
    recommendationReason = `Outside the buy box: ${buyBoxMatch.reasons[0].toLowerCase()}.`;
  } else if (baseProjectedGross !== null && baseProjectedGross < 0) {
    recommendation = "PASS";
    recommendationReason = `Projected gross is negative (${usd(baseProjectedGross)}) under base-case assumptions.`;
  } else if (finalOpportunityScore >= 70 && confidenceTier !== "Low" && maxOffer.status === "ok") {
    recommendation = "BUY";
    recommendationReason = `${topBand.label} leads (${topBand.points}/${topBand.max})${baseProjectedGross !== null ? ` with ${usd(baseProjectedGross)} projected base-case gross` : ""}; ${confidenceTier.toLowerCase()} confidence and offer ceiling within the acquisition band.`;
  } else if (finalOpportunityScore >= 55 || (finalOpportunityScore >= 70 && (confidenceTier === "Low" || maxOffer.status !== "ok"))) {
    recommendation = "INVESTIGATE";
    recommendationReason =
      confidenceTier === "Low"
        ? `Scores ${finalOpportunityScore} but confidence is Low (${completeness.missing.length} fields missing) — verify the listing before offering.`
        : maxOffer.status === "below-acquisition-range"
        ? `Scores ${finalOpportunityScore}, but the computed offer ceiling sits below your configured acquisition range.`
        : `Scores ${finalOpportunityScore}${topRisk ? `; main drag: ${topRisk.label.toLowerCase()}` : ""} — worth a closer look before committing.`;
  } else if (finalOpportunityScore >= 40) {
    recommendation = "WATCH";
    recommendationReason = `Middling score (${finalOpportunityScore})${topRisk ? ` with ${topRisk.label.toLowerCase()}` : ""} — track for a price drop or better data.`;
  } else {
    recommendation = "PASS";
    recommendationReason = `Weak overall score (${finalOpportunityScore})${topRisk ? `; ${topRisk.label.toLowerCase()}` : ""}.`;
  }

  return {
    bands,
    riskFactors,
    rawScoreBeforeRisk,
    riskPenalty,
    finalOpportunityScore,
    recommendation,
    recommendationReason,
    riskLevel,
    buyBoxMatch,
    askingPrice,
    estimatedRange,
    maxOffer,
    scenarios,
    baseProjectedGross,
    confidencePercent,
    confidenceTier,
    completeness,
    listingAgeDays,
  };
}
