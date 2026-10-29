/**
 * Validation for public "Request access" submissions. Pure so it can be unit
 * tested and shared by the form (inline errors) and the API (authoritative).
 */

export const ACCESS_ROLES = [
  "Used car manager",
  "Buyer / acquisition manager",
  "General manager / dealer principal",
  "Other",
] as const;

export type AccessRole = (typeof ACCESS_ROLES)[number];

export const ACCESS_REQUEST_STATUSES = ["new", "contacted", "archived"] as const;
export type AccessRequestStatus = (typeof ACCESS_REQUEST_STATUSES)[number];

/** Archived requests are purged after this many days (stated on /privacy). */
export const ARCHIVE_RETENTION_DAYS = 90;

export const ACCESS_LIMITS = { name: 100, email: 254, dealership: 140, message: 1000 } as const;

export interface AccessRequestInput {
  name: string;
  email: string;
  dealership: string;
  role: AccessRole;
  message: string | null;
}

export type AccessRequestErrors = Partial<Record<keyof AccessRequestInput, string>>;

// Conservative on purpose: no characters that could add mailto: headers
// (?, &, quotes, angle brackets) when staff click a stored address.
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isAccessRequestStatus(value: unknown): value is AccessRequestStatus {
  return typeof value === "string" && (ACCESS_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function validateAccessRequest(
  raw: unknown
): { ok: true; value: AccessRequestInput } | { ok: false; errors: AccessRequestErrors } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const name = text(body.name);
  const email = text(body.email).toLowerCase();
  const dealership = text(body.dealership);
  const role = text(body.role);
  const message = text(body.message);
  const errors: AccessRequestErrors = {};

  if (!name) errors.name = "Enter your name.";
  else if (name.length > ACCESS_LIMITS.name) errors.name = `Keep it under ${ACCESS_LIMITS.name} characters.`;

  if (!email) errors.email = "Enter your work email.";
  else if (email.length > ACCESS_LIMITS.email || !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  if (!dealership) errors.dealership = "Enter your dealership or group.";
  else if (dealership.length > ACCESS_LIMITS.dealership) errors.dealership = `Keep it under ${ACCESS_LIMITS.dealership} characters.`;

  if (!(ACCESS_ROLES as readonly string[]).includes(role)) errors.role = "Choose your role.";

  if (message.length > ACCESS_LIMITS.message) errors.message = `Keep it under ${ACCESS_LIMITS.message} characters.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, email, dealership, role: role as AccessRole, message: message || null } };
}
