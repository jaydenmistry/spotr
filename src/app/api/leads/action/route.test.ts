import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn(() => true), clientIp: () => "test-ip" }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    lead: { findUnique: vi.fn(), update: vi.fn() },
    activity: { create: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { POST } from "./route";

const session = { user: { email: "buyer@spotr.test" } };

function post(body: unknown) {
  return POST(
    new Request("http://test/api/leads/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

const activeLead = {
  stage: "New Leads",
  watchedAt: null,
  passedAt: null,
  assignedTo: null,
  outcomeReason: null,
  outcomeNote: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  (getServerSession as Mock).mockResolvedValue(session);
});

describe("POST /api/leads/action", () => {
  it("rejects unauthenticated requests", async () => {
    (getServerSession as Mock).mockResolvedValue(null);
    const res = await post({ leadId: "l1", action: "watch" });
    expect(res.status).toBe(401);
  });

  it("rejects a missing leadId", async () => {
    const res = await post({ action: "watch" });
    expect(res.status).toBe(400);
  });

  it("rejects unknown actions", async () => {
    const res = await post({ leadId: "l1", action: "delete" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown lead", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue(null);
    const res = await post({ leadId: "missing", action: "watch" });
    expect(res.status).toBe(404);
  });

  it("requires a standardized reason to pass", async () => {
    const res = await post({ leadId: "l1", action: "pass" });
    expect(res.status).toBe(400);

    const bad = await post({ leadId: "l1", action: "pass", reason: "just because" });
    expect(bad.status).toBe(400);
  });

  it("writes the lead update and activity atomically for a real mutation", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue(activeLead);
    (prisma.lead.update as Mock).mockResolvedValue({ id: "l1", watchedAt: new Date() });

    const res = await post({ leadId: "l1", action: "watch" });
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "watched", actor: "buyer@spotr.test", leadId: "l1" }),
      })
    );
  });

  it("does not write anything for a no-op action", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({
      ...activeLead,
      watchedAt: new Date("2026-07-01T00:00:00Z"),
    });

    const res = await post({ leadId: "l1", action: "watch" });
    expect(res.status).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.lead.update).not.toHaveBeenCalled();
    expect(prisma.activity.create).not.toHaveBeenCalled();
  });

  it("stores the pass reason and builds detail from the server allowlist only", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue(activeLead);
    (prisma.lead.update as Mock).mockResolvedValue({ id: "l1" });

    const res = await post({
      leadId: "l1",
      action: "pass",
      reason: "price_too_high",
      note: "asking way over comps",
      detail: { sellerPhone: "555-1234", injected: true },
    });
    expect(res.status).toBe(200);

    const updateArgs = (prisma.lead.update as Mock).mock.calls[0][0];
    expect(updateArgs.data.outcomeReason).toBe("price_too_high");
    expect(updateArgs.data.outcomeNote).toBe("asking way over comps");

    const activityArgs = (prisma.activity.create as Mock).mock.calls[0][0];
    expect(activityArgs.data.type).toBe("passed");
    expect(activityArgs.data.summary).toBe("Passed — Price too high");
    expect(JSON.parse(activityArgs.data.detail)).toEqual({
      reason: "price_too_high",
      note: "asking way over comps",
    });
  });

  it("re-passing with the identical reason/note is a no-op", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({
      ...activeLead,
      passedAt: new Date("2026-07-01T00:00:00Z"),
      outcomeReason: "price_too_high",
      outcomeNote: null,
    });

    const res = await post({ leadId: "l1", action: "pass", reason: "price_too_high" });
    expect(res.status).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.activity.create).not.toHaveBeenCalled();
  });

  it("re-passing with a different reason applies the correction and keeps the original pass time", async () => {
    const originalPassedAt = new Date("2026-07-01T00:00:00Z");
    (prisma.lead.findUnique as Mock).mockResolvedValue({
      ...activeLead,
      passedAt: originalPassedAt,
      outcomeReason: "price_too_high",
      outcomeNote: null,
    });
    (prisma.lead.update as Mock).mockResolvedValue({ id: "l1" });

    const res = await post({ leadId: "l1", action: "pass", reason: "condition_concern" });
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    const updateArgs = (prisma.lead.update as Mock).mock.calls[0][0];
    expect(updateArgs.data.passedAt).toBe(originalPassedAt);
    expect(updateArgs.data.outcomeReason).toBe("condition_concern");

    const activityArgs = (prisma.activity.create as Mock).mock.calls[0][0];
    expect(activityArgs.data.summary).toBe("Pass reason updated — Condition / history concern");
  });

  it("refuses to pass a lead whose stage is already terminal", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({
      ...activeLead,
      stage: "Lost",
      outcomeReason: "seller_unavailable",
    });

    const res = await post({ leadId: "l1", action: "pass", reason: "price_too_high" });
    expect(res.status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.lead.update).not.toHaveBeenCalled();
    expect(prisma.activity.create).not.toHaveBeenCalled();
  });

  it("unpass on a legacy Passed+Lost row keeps the Lost outcome fields", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({
      ...activeLead,
      stage: "Lost",
      passedAt: new Date("2026-07-01T00:00:00Z"),
      outcomeReason: "seller_unavailable",
      outcomeNote: "no callback",
    });
    (prisma.lead.update as Mock).mockResolvedValue({ id: "l1", passedAt: null });

    const res = await post({ leadId: "l1", action: "unpass" });
    expect(res.status).toBe(200);

    const updateArgs = (prisma.lead.update as Mock).mock.calls[0][0];
    expect(updateArgs.data).toEqual({ passedAt: null });

    expect(prisma.activity.create).toHaveBeenCalledTimes(1);
    expect((prisma.activity.create as Mock).mock.calls[0][0].data.type).toBe("restored");
  });

  it("unpass clears outcome fields and logs exactly one restored activity", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({
      ...activeLead,
      passedAt: new Date("2026-07-01T00:00:00Z"),
    });
    (prisma.lead.update as Mock).mockResolvedValue({ id: "l1", passedAt: null });

    const res = await post({ leadId: "l1", action: "unpass" });
    expect(res.status).toBe(200);

    const updateArgs = (prisma.lead.update as Mock).mock.calls[0][0];
    expect(updateArgs.data).toEqual({ passedAt: null, outcomeReason: null, outcomeNote: null });

    expect(prisma.activity.create).toHaveBeenCalledTimes(1);
    const activityArgs = (prisma.activity.create as Mock).mock.calls[0][0];
    expect(activityArgs.data.type).toBe("restored");
    expect(activityArgs.data.summary).toBe("Restored from Passed");
  });
});
