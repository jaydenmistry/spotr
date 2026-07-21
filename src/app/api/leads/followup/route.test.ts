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
    new Request("http://test/api/leads/followup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

const baseLead = {
  id: "l1",
  nextAction: null,
  nextActionAt: null,
  nextActionCompletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  (getServerSession as Mock).mockResolvedValue(session);
  (prisma.activity.create as Mock).mockResolvedValue({ id: "a1" });
});

describe("POST /api/leads/followup", () => {
  it("rejects unauthenticated requests", async () => {
    (getServerSession as Mock).mockResolvedValue(null);
    const res = await post({ leadId: "l1", op: "add-note", note: "x" });
    expect(res.status).toBe(401);
  });

  it("rejects missing leadId and unknown ops", async () => {
    expect((await post({ op: "add-note", note: "x" })).status).toBe(400);
    expect((await post({ leadId: "l1", op: "explode" })).status).toBe(400);
  });

  it("returns 404 for an unknown lead", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue(null);
    const res = await post({ leadId: "nope", op: "add-note", note: "x" });
    expect(res.status).toBe(404);
  });

  it("rejects invalid next-action input", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue(baseLead);

    expect(
      (await post({ leadId: "l1", op: "set-next-action", nextAction: "", dueAt: "2026-07-20T10:00" })).status
    ).toBe(400);
    expect(
      (await post({ leadId: "l1", op: "set-next-action", nextAction: "Call", dueAt: "not-a-date" })).status
    ).toBe(400);
    expect(
      (await post({ leadId: "l1", op: "set-next-action", nextAction: "x".repeat(201), dueAt: "2026-07-20T10:00" })).status
    ).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("sets a next action atomically and resets completion", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue(baseLead);
    (prisma.lead.update as Mock).mockResolvedValue({ ...baseLead, nextAction: "Call seller" });

    const res = await post({
      leadId: "l1",
      op: "set-next-action",
      nextAction: "Call seller",
      dueAt: "2026-07-20T10:00",
    });
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    const updateArgs = (prisma.lead.update as Mock).mock.calls[0][0];
    expect(updateArgs.data.nextAction).toBe("Call seller");
    expect(updateArgs.data.nextActionAt).toBeInstanceOf(Date);
    expect(updateArgs.data.nextActionCompletedAt).toBeNull();

    const activityArgs = (prisma.activity.create as Mock).mock.calls[0][0];
    expect(activityArgs.data.type).toBe("next_action_set");
    expect(Object.keys(JSON.parse(activityArgs.data.detail)).sort()).toEqual(["dueAt", "nextAction"]);
  });

  it("treats an identical pending next action as a no-op", async () => {
    const dueAt = new Date("2026-07-20T10:00:00Z");
    (prisma.lead.findUnique as Mock).mockResolvedValue({
      ...baseLead,
      nextAction: "Call seller",
      nextActionAt: dueAt,
    });

    const res = await post({
      leadId: "l1",
      op: "set-next-action",
      nextAction: "Call seller",
      dueAt: dueAt.toISOString(),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).activity).toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("cannot complete a next action that doesn't exist", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue(baseLead);
    const res = await post({ leadId: "l1", op: "complete-next-action" });
    expect(res.status).toBe(400);
  });

  it("completing an already-completed action is a no-op", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue({
      ...baseLead,
      nextAction: "Call",
      nextActionAt: new Date(),
      nextActionCompletedAt: new Date(),
    });
    const res = await post({ leadId: "l1", op: "complete-next-action" });
    expect(res.status).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects invalid offer amounts", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue(baseLead);
    for (const amountUsd of [-500, 0, 99.99, "92500", 5_000_001, { amount: 1 }]) {
      const res = await post({ leadId: "l1", op: "record-offer", amountUsd });
      expect(res.status).toBe(400);
    }
    expect(prisma.activity.create).not.toHaveBeenCalled();
  });

  it("records an offer with server-built detail only, ignoring client JSON", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue(baseLead);

    const res = await post({
      leadId: "l1",
      op: "record-offer",
      amountUsd: 92500,
      note: "contingent on inspection",
      detail: { sellerName: "Someone", nested: { hack: true } },
    });
    expect(res.status).toBe(200);

    const activityArgs = (prisma.activity.create as Mock).mock.calls[0][0];
    expect(activityArgs.data.type).toBe("offer_recorded");
    expect(activityArgs.data.summary).toBe("Recorded offer of $92,500");
    expect(JSON.parse(activityArgs.data.detail)).toEqual({
      amountUsd: 92500,
      note: "contingent on inspection",
    });
  });

  it("adds a note and rejects empty/oversized notes", async () => {
    (prisma.lead.findUnique as Mock).mockResolvedValue(baseLead);

    expect((await post({ leadId: "l1", op: "add-note", note: "" })).status).toBe(400);
    expect((await post({ leadId: "l1", op: "add-note", note: "x".repeat(501) })).status).toBe(400);

    const res = await post({ leadId: "l1", op: "add-note", note: "Spoke with seller" });
    expect(res.status).toBe(200);
    const activityArgs = (prisma.activity.create as Mock).mock.calls[0][0];
    expect(activityArgs.data.type).toBe("note_added");
    expect(JSON.parse(activityArgs.data.detail)).toEqual({ note: "Spoke with seller" });
  });
});
