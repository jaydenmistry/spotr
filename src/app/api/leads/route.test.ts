import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    lead: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    activity: { create: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { PATCH } from "./route";

function patch(body: unknown) {
  return PATCH(
    new Request("http://test/api/leads", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (getServerSession as Mock).mockResolvedValue({ user: { email: "buyer@spotr.test" } });
});

describe("PATCH /api/leads (stage changes)", () => {
  it("rejects unauthenticated requests", async () => {
    (getServerSession as Mock).mockResolvedValue(null);
    expect((await patch({ leadId: "l1", stage: "Contacted" })).status).toBe(401);
  });

  it("rejects invalid stages and missing leadId", async () => {
    expect((await patch({ leadId: "l1", stage: "Archived" })).status).toBe(400);
    expect((await patch({ stage: "Contacted" })).status).toBe(400);
  });

  it("returns 404 for an unknown lead", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue(null);
    expect((await patch({ leadId: "missing", stage: "Contacted" })).status).toBe(404);
  });

  it("requires a standardized reason to mark Lost", async () => {
    expect((await patch({ leadId: "l1", stage: "Lost" })).status).toBe(400);
    expect((await patch({ leadId: "l1", stage: "Lost", reason: "meh" })).status).toBe(400);
  });

  it("treats a same-stage move as a no-op with no writes", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({
      stage: "Contacted",
      passedAt: null,
      outcomeReason: null,
      outcomeNote: null,
    });
    const res = await patch({ leadId: "l1", stage: "Contacted" });
    expect(res.status).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.activity.create).not.toHaveBeenCalled();
  });

  it("Lost→Lost with a different reason applies the correction", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({
      stage: "Lost",
      passedAt: null,
      outcomeReason: "price_too_high",
      outcomeNote: null,
    });
    (prisma.lead.update as Mock).mockResolvedValue({ id: "l1", stage: "Lost" });

    const res = await patch({ leadId: "l1", stage: "Lost", reason: "purchased_elsewhere" });
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    const activityArgs = (prisma.activity.create as Mock).mock.calls[0][0];
    expect(activityArgs.data.summary).toBe("Lost reason updated — Purchased elsewhere");
  });

  it("Lost→Lost with the identical reason is a no-op", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({
      stage: "Lost",
      passedAt: null,
      outcomeReason: "purchased_elsewhere",
      outcomeNote: null,
    });

    const res = await patch({ leadId: "l1", stage: "Lost", reason: "purchased_elsewhere" });
    expect(res.status).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("logs a stage_changed activity atomically on a real move", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({ stage: "New Leads", passedAt: null });
    (prisma.lead.update as Mock).mockResolvedValue({ id: "l1", stage: "Contacted" });

    const res = await patch({ leadId: "l1", stage: "Contacted" });
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    const activityArgs = (prisma.activity.create as Mock).mock.calls[0][0];
    expect(activityArgs.data.type).toBe("stage_changed");
    expect(activityArgs.data.summary).toBe("Stage changed: New Leads → Contacted");
    expect(JSON.parse(activityArgs.data.detail)).toEqual({ from: "New Leads", to: "Contacted" });
  });

  it("marks Lost with reason, distinct from Passed semantics", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({ stage: "Offer Made", passedAt: null });
    (prisma.lead.update as Mock).mockResolvedValue({ id: "l1", stage: "Lost" });

    const res = await patch({
      leadId: "l1",
      stage: "Lost",
      reason: "purchased_elsewhere",
      note: "sold before our offer",
    });
    expect(res.status).toBe(200);

    const updateArgs = (prisma.lead.update as Mock).mock.calls[0][0];
    expect(updateArgs.data.stage).toBe("Lost");
    expect(updateArgs.data.outcomeReason).toBe("purchased_elsewhere");
    expect(updateArgs.data.outcomeNote).toBe("sold before our offer");

    const activityArgs = (prisma.activity.create as Mock).mock.calls[0][0];
    expect(activityArgs.data.type).toBe("marked_lost");
    expect(activityArgs.data.summary).toBe("Marked Lost — Purchased elsewhere");
  });

  it("refuses to mark a Passed lead Lost so the pass reason isn't clobbered", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({
      stage: "Contacted",
      passedAt: new Date("2026-07-01T00:00:00Z"),
      outcomeReason: "outside_buy_box",
      outcomeNote: null,
    });

    const res = await patch({ leadId: "l1", stage: "Lost", reason: "purchased_elsewhere" });
    expect(res.status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.lead.update).not.toHaveBeenCalled();
    expect(prisma.activity.create).not.toHaveBeenCalled();
  });

  it("clears a stale Lost reason when the lead is re-opened", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({ stage: "Lost", passedAt: null });
    (prisma.lead.update as Mock).mockResolvedValue({ id: "l1", stage: "Appraisal" });

    const res = await patch({ leadId: "l1", stage: "Appraisal" });
    expect(res.status).toBe(200);

    const updateArgs = (prisma.lead.update as Mock).mock.calls[0][0];
    expect(updateArgs.data.outcomeReason).toBeNull();
    expect(updateArgs.data.outcomeNote).toBeNull();
  });
});
