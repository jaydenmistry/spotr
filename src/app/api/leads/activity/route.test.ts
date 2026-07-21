import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn(() => true), clientIp: () => "test-ip" }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    lead: { findUnique: vi.fn() },
    activity: { findMany: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { GET } from "./route";

function get(query: string) {
  return GET(new Request(`http://test/api/leads/activity${query}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  (getServerSession as Mock).mockResolvedValue({ user: { email: "buyer@spotr.test" } });
});

describe("GET /api/leads/activity", () => {
  it("rejects unauthenticated requests", async () => {
    (getServerSession as Mock).mockResolvedValue(null);
    expect((await get("?leadId=l1")).status).toBe(401);
  });

  it("requires leadId", async () => {
    expect((await get("")).status).toBe(400);
  });

  it("returns 404 for an unknown lead", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue(null);
    expect((await get("?leadId=missing")).status).toBe(404);
  });

  it("queries newest-first, capped at 100, scoped to the requested lead", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({ id: "l1" });
    (prisma.activity.findMany as Mock).mockResolvedValue([{ id: "a1" }]);

    const res = await get("?leadId=l1");
    expect(res.status).toBe(200);
    expect((await res.json()).activities).toEqual([{ id: "a1" }]);
    expect(prisma.activity.findMany).toHaveBeenCalledWith({
      where: { leadId: "l1" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });
});
