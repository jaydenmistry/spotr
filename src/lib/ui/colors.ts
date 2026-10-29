import type { Recommendation } from "@/lib/opportunity";

/**
 * Semantic color maps shared by every surface. Values are CSS variables
 * (see app/globals.css), so they flip with the light/dark theme — never
 * append hex alpha to them; use `tone()` instead.
 */

export const RECOMMENDATION_COLORS: Record<Recommendation, string> = {
  BUY: "var(--green)",
  INVESTIGATE: "var(--yellow)",
  WATCH: "var(--blue)",
  PASS: "var(--label-secondary)",
};

export const RISK_COLORS: Record<string, string> = {
  Low: "var(--green)",
  Medium: "var(--yellow)",
  High: "var(--red)",
};

export const STAGE_COLORS: Record<string, string> = {
  "New Leads": "var(--blue)",
  Contacted: "var(--teal)",
  Appraisal: "var(--purple)",
  "Offer Made": "var(--orange)",
  Acquired: "var(--green)",
  Lost: "var(--red)",
};

export function scoreColor(score: number): string {
  return score >= 65 ? "var(--green)" : score >= 45 ? "var(--yellow)" : "var(--red)";
}

/** A translucent tone of any color token: `tone("var(--green)", 12)`. */
export function tone(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
