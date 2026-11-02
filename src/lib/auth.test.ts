import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";

const findUnique = vi.fn();
vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

import { authOptions } from "./auth";

const jwt = (token: JWT, user?: { id: string; role?: "admin" | "member"; sessionVersion?: number }) =>
  authOptions.callbacks!.jwt!({ token, user, account: null } as any);

beforeEach(() => findUnique.mockReset());

describe("jwt callback", () => {
  it("stamps role and sessionVersion at sign-in without a lookup", async () => {
    const token = await jwt({ sub: "u1" }, { id: "u1", role: "admin", sessionVersion: 3 });
    expect(token).toMatchObject({ role: "admin", sessionVersion: 3 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("refreshes the role from the database on later checks", async () => {
    findUnique.mockResolvedValue({ role: "member", sessionVersion: 3 });
    const token = await jwt({ sub: "u1", role: "admin", sessionVersion: 3 });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "u1" }, select: { role: true, sessionVersion: true } });
    expect(token.role).toBe("member");
  });

  it("revokes sessions after a password change or lockout", async () => {
    findUnique.mockResolvedValue({ role: "admin", sessionVersion: 4 });
    await expect(jwt({ sub: "u1", role: "admin", sessionVersion: 3 })).rejects.toThrow(/revoked/);
  });

  it("revokes tokens issued before sessionVersion existed, and deleted accounts", async () => {
    findUnique.mockResolvedValue({ role: "admin", sessionVersion: 0 });
    await expect(jwt({ sub: "u1", email: "a@b.co" })).rejects.toThrow(/revoked/);
    findUnique.mockResolvedValue(null);
    await expect(jwt({ sub: "gone", sessionVersion: 0 })).rejects.toThrow(/revoked/);
  });
});
