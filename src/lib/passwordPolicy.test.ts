import { describe, expect, it } from "vitest";
// CommonJS so prisma/seed.js can require it at container start.
import { adminPasswordProblem } from "../../prisma/passwordPolicy.js";

const email = "jordan@spotrcars.com";

describe("adminPasswordProblem", () => {
  it("accepts long, uncommon passwords", () => {
    expect(adminPasswordProblem("violet-harbor-engine-41", email)).toBeNull();
    expect(adminPasswordProblem("e2e-orchid-lantern-29", "e2e@spotr.test")).toBeNull();
  });

  it("rejects anything shorter than 12 characters, including the old public demo password", () => {
    expect(adminPasswordProblem("password", email)).toMatch(/12 characters/);
    expect(adminPasswordProblem("Tr0ub4dor&3", email)).toMatch(/12 characters/);
  });

  it("rejects common passwords padded with digits or symbols", () => {
    expect(adminPasswordProblem("Password123456!", email)).toMatch(/common/);
    expect(adminPasswordProblem("spotrcars2024", email)).toMatch(/common/);
    expect(adminPasswordProblem("123456789012", email)).toMatch(/common/);
  });

  it("rejects passwords made mostly of common words, including the README placeholder", () => {
    expect(adminPasswordProblem("passwordpassword", email)).toMatch(/common/);
    expect(adminPasswordProblem("Admin-Admin-Admin!", email)).toMatch(/common/);
    expect(adminPasswordProblem("qwerty-password-1", email)).toMatch(/common/);
    expect(adminPasswordProblem("choose-a-long-unique-password", email)).toMatch(/common/);
  });

  it("rejects repetitive passwords and ones built from the email", () => {
    expect(adminPasswordProblem("aaaaaaaaaaaab", email)).toMatch(/repetitive/);
    expect(adminPasswordProblem("Jordan-is-the-admin", email)).toMatch(/username/);
  });
});
