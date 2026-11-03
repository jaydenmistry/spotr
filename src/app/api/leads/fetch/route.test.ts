import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.hoisted(() => {
  process.env.MARKETCHECK_API_KEY = "test-key";
});
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn(() => true), clientIp: () => "test-ip" }));
vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return { default: { ...actual.default, get: vi.fn() } };
});
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    lead: { findMany: vi.fn(), create: vi.fn((args: unknown) => args) },
    suppressedVin: { findMany: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));

import axios from "axios";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { POST } from "./route";

const listing = (vin: string) => ({
  vin,
  price: 20000,
  vdp_url: `https://dealer.example/${vin}`,
  media: { photo_links: [`https://img.example/${vin}.jpg`] },
  build: { year: 2020, make: "Honda", model: "Civic" },
});

function pull() {
  return POST(
    new Request("http://test/api/leads/fetch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: 100 }),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (getServerSession as Mock).mockResolvedValue({ user: { id: "u1", email: "buyer@spotr.test" } });
  (axios.get as Mock).mockResolvedValue({
    data: { num_found: 3, listings: [listing("NEW1"), listing("dupe1"), listing("optout1")] },
  });
  (prisma.lead.findMany as Mock).mockResolvedValue([{ vin: "dupe1" }]);
  (prisma.suppressedVin.findMany as Mock).mockResolvedValue([{ vin: "OPTOUT1" }]);
});

describe("POST /api/leads/fetch", () => {
  it("rejects unauthenticated requests", async () => {
    (getServerSession as Mock).mockResolvedValue(null);
    const res = await pull();
    expect(res.status).toBe(401);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("skips VINs already in Spotr and suppressed VINs in any casing", async () => {
    const res = await pull();
    expect(res.status).toBe(200);
    expect((await res.json()).count).toBe(1);

    expect(prisma.suppressedVin.findMany).toHaveBeenCalledWith({
      where: { vin: { in: ["NEW1", "OPTOUT1"] } },
      select: { vin: true },
    });
    const created = (prisma.lead.create as Mock).mock.calls.map(([args]) => args.data.vin);
    expect(created).toEqual(["NEW1"]);
  });
});
