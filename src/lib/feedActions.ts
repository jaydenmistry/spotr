// Single source of truth for Opportunity Feed actions, shared by the API
// route and the client so the two can't drift.
export const FEED_ACTIONS = ["watch", "unwatch", "pass", "unpass", "assign", "unassign"] as const;

export type FeedAction = (typeof FEED_ACTIONS)[number];

export function isFeedAction(value: unknown): value is FeedAction {
  return typeof value === "string" && (FEED_ACTIONS as readonly string[]).includes(value);
}
