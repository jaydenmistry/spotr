import type { Prisma } from "@prisma/client";
import { isAdmin } from "@/lib/roles";

/**
 * Lead.assignee is a User relation. Responses flatten it to `assignedTo`, the
 * assignee's email, which is the display label clients read. Every Lead query
 * whose row goes to a client includes ASSIGNEE and passes the row through
 * withAssignedTo(), so no response leaks the relation, the internal user id,
 * or drops the label.
 */
export const ASSIGNEE = { assignee: { select: { email: true } } } satisfies Prisma.LeadInclude;

export function withAssignedTo<T extends { assignee: { email: string } | null; assignedToId?: string | null }>({
  assignee,
  assignedToId: _assignedToId,
  ...lead
}: T): Omit<T, "assignee" | "assignedToId"> & { assignedTo: string | null } {
  return { ...lead, assignedTo: assignee?.email ?? null };
}

/** The signed-in user, as the session hands it to the client. */
export type Viewer = { email?: string | null; role?: string | null } | null | undefined;

/**
 * What the Assign button and the `a` shortcut do for this viewer, matching
 * the rule in POST /api/leads/action: anyone can claim an unassigned lead or
 * release their own; only an admin can take over someone else's. Null means
 * no assign action is available.
 */
export function assignToggle(assignedTo: string | null | undefined, viewer: Viewer) {
  if (!assignedTo) return { action: "assign", label: "Assign to me" } as const;
  if (viewer?.email && assignedTo === viewer.email) return { action: "unassign", label: "Unassign" } as const;
  if (isAdmin(viewer?.role)) return { action: "assign", label: "Take over" } as const;
  return null;
}
