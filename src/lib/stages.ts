// Single source of truth for the kanban pipeline stages. Lead.stage is
// free-text in the schema (see CLAUDE.md gotchas), so every consumer must
// use these constants rather than re-typing the strings.
export const STAGES = ["New Leads", "Contacted", "Appraisal", "Offer Made", "Acquired", "Lost"] as const;

export type Stage = (typeof STAGES)[number];

// Stages that mean the lead's lifecycle already ended in the pipeline; they
// are not open opportunities.
export const TERMINAL_STAGES: Stage[] = ["Acquired", "Lost"];
