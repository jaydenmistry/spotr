import { describe, expect, it } from "vitest";
import { isAccessRequestStatus, validateAccessRequest } from "./accessRequest";

const valid = {
  name: "  Dana Reyes ",
  email: " Dana@NorthsideAuto.com ",
  dealership: "Northside Auto Group",
  role: "Used car manager",
  message: "",
};

describe("validateAccessRequest", () => {
  it("trims, lowercases the email, and nulls an empty message", () => {
    const result = validateAccessRequest(valid);
    expect(result).toEqual({
      ok: true,
      value: { name: "Dana Reyes", email: "dana@northsideauto.com", dealership: "Northside Auto Group", role: "Used car manager", message: null },
    });
  });

  it("reports every missing required field", () => {
    const result = validateAccessRequest({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["dealership", "email", "name", "role"]);
  });

  it("rejects malformed emails and unknown roles", () => {
    const result = validateAccessRequest({ ...valid, email: "dana@", role: "CEO" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.email).toBeDefined();
      expect(result.errors.role).toBeDefined();
    }
  });

  it("enforces length limits", () => {
    const result = validateAccessRequest({ ...valid, name: "x".repeat(101), message: "y".repeat(1001) });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toBeDefined();
      expect(result.errors.message).toBeDefined();
    }
  });

  it("ignores non-string input safely", () => {
    expect(validateAccessRequest(null).ok).toBe(false);
    expect(validateAccessRequest({ ...valid, name: 42 }).ok).toBe(false);
  });
});

describe("isAccessRequestStatus", () => {
  it("accepts only known statuses", () => {
    expect(isAccessRequestStatus("contacted")).toBe(true);
    expect(isAccessRequestStatus("deleted")).toBe(false);
    expect(isAccessRequestStatus(undefined)).toBe(false);
  });
});
