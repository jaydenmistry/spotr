// Authorization and data-integrity tests for the buy-box API.
import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.fn();
const findUnique = vi.fn();
const upsert = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    buyBox: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      upsert: (...args: unknown[]) => upsert(...args),
    },
  },
}));

import { GET, PUT } from "./route";

const putRequest = (body: unknown) =>
  new Request("http://localhost/api/buybox", {
    method: "PUT",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  getServerSession.mockReset();
  findUnique.mockReset();
  upsert.mockReset();
  getServerSession.mockResolvedValue({ user: { email: "admin@spotrcars.com" } });
});

describe("authorization", () => {
  it("rejects unauthenticated GET with 401 and touches no data", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/buybox"));
    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated PUT with 401 and writes nothing", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await PUT(putRequest({ targetMinGross: 4000 }));
    expect(res.status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("GET read-only behavior", () => {
  it("returns in-memory defaults without creating a row when none exists", async () => {
    findUnique.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/buybox"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.persisted).toBe(false);
    expect(body.config.targetMinGross).toBe(3000);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("degrades malformed persisted JSON to safe empty lists", async () => {
    findUnique.mockResolvedValue({
      id: "default",
      yearMin: 2015,
      yearMax: 2024,
      maxMileage: null,
      acquisitionMin: null,
      acquisitionMax: null,
      targetRetailMin: null,
      targetRetailMax: null,
      targetMinGross: 3000,
      radiusMiles: 100,
      makeRules: "{corrupted",
      excludedKeywords: '["ok", 42, ""]',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const res = await GET(new Request("http://localhost/api/buybox"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.config.makeRules).toEqual([]);
    expect(body.config.excludedKeywords).toEqual(["ok"]);
  });
});

describe("PUT validation and integrity", () => {
  it("persists a sanitized config on explicit save", async () => {
    findUnique.mockResolvedValue(null);
    upsert.mockResolvedValue({});
    const res = await PUT(
      putRequest({
        yearMin: 2015,
        yearMax: 2024,
        targetMinGross: 4000,
        makeRules: [
          { make: "Porsche", priority: "Core" },
          { make: "", priority: "Core" },
          { make: "Ferrari", priority: "Nope" },
        ],
        excludedKeywords: ["salvage", "", 12],
      })
    );
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledOnce();
    const args = upsert.mock.calls[0][0];
    expect(JSON.parse(args.create.makeRules)).toEqual([{ make: "Porsche", priority: "Core" }]);
    expect(JSON.parse(args.create.excludedKeywords)).toEqual(["salvage"]);
  });

  it("rejects a malformed JSON body with 400", async () => {
    const res = await PUT(putRequest("{not json"));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects inverted ranges with 400", async () => {
    const res = await PUT(putRequest({ yearMin: 2024, yearMax: 2015 }));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects out-of-range numbers with 400", async () => {
    const res = await PUT(putRequest({ radiusMiles: 5000 }));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });
});
