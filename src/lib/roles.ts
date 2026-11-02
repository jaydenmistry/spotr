// Single-tenant roles. The seeded ADMIN_EMAIL account is "admin"; any other
// account is "member" until promoted. Only admins see prospects' access requests.
export const ROLES = ["admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isAdmin(role: unknown): boolean {
  return role === "admin";
}

/** Dashboard pages only admins can use. Nav hides them for members; the API enforces it. */
export const ADMIN_ONLY_PATHS: readonly string[] = ["/dashboard/requests"];

export function isAdminOnlyPath(href: string): boolean {
  return ADMIN_ONLY_PATHS.includes(href);
}
