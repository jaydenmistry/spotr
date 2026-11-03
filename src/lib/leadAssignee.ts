import type { Prisma } from "@prisma/client";

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
