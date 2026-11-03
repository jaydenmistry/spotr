import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { ASSIGNEE, withAssignedTo } from "@/lib/leadAssignee";
import {
  buildNextActionDetail,
  buildNoteDetail,
  buildOfferDetail,
  validateDueDate,
  validateNextActionText,
  validateNote,
  validateOfferAmount,
} from "@/lib/followUp";

export const dynamic = "force-dynamic";

const FOLLOWUP_OPS = [
  "set-next-action",
  "complete-next-action",
  "clear-next-action",
  "record-offer",
  "add-note",
] as const;

type FollowupOp = (typeof FOLLOWUP_OPS)[number];

function isFollowupOp(value: unknown): value is FollowupOp {
  return typeof value === "string" && (FOLLOWUP_OPS as readonly string[]).includes(value);
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(request.headers);
  if (!rateLimit(`leads-followup:${ip}`, 60, 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many follow-up updates. Try again in a minute." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { leadId, op, nextAction, dueAt, amountUsd, note } = (body ?? {}) as {
    leadId?: unknown;
    op?: unknown;
    nextAction?: unknown;
    dueAt?: unknown;
    amountUsd?: unknown;
    note?: unknown;
  };

  if (typeof leadId !== "string" || leadId.length === 0) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  if (!isFollowupOp(op)) {
    return NextResponse.json(
      { error: `op must be one of: ${FOLLOWUP_OPS.join(", ")}` },
      { status: 400 }
    );
  }

  const actor = session.user?.email ?? "admin";

  try {
    // TODO(tenancy): scope this lookup by the caller's dealer/tenant id once
    // multi-tenancy lands — session-only auth is a cross-tenant IDOR seam.
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: ASSIGNEE });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (op === "set-next-action") {
      const text = validateNextActionText(nextAction);
      if (!text) {
        return NextResponse.json(
          { error: "nextAction is required (1-200 characters)" },
          { status: 400 }
        );
      }

      const due = validateDueDate(dueAt);
      if (!due) {
        return NextResponse.json({ error: "dueAt must be a valid date/time" }, { status: 400 });
      }

      // No-op: identical action and due time already stored (and not completed).
      if (
        lead.nextAction === text &&
        lead.nextActionAt?.getTime() === due.getTime() &&
        !lead.nextActionCompletedAt
      ) {
        return NextResponse.json({ lead: withAssignedTo(lead), activity: null });
      }

      const [updatedLead, activity] = await prisma.$transaction([
        prisma.lead.update({
          where: { id: leadId },
          include: ASSIGNEE,
          data: { nextAction: text, nextActionAt: due, nextActionCompletedAt: null },
        }),
        prisma.activity.create({
          data: {
            leadId,
            type: "next_action_set",
            summary: `Next action set: "${text}"`,
            detail: buildNextActionDetail(text, due),
            actor,
          },
        }),
      ]);

      return NextResponse.json({ lead: withAssignedTo(updatedLead), activity });
    }

    if (op === "complete-next-action") {
      if (!lead.nextAction || !lead.nextActionAt) {
        return NextResponse.json({ error: "No next action to complete" }, { status: 400 });
      }

      // No-op: already completed.
      if (lead.nextActionCompletedAt) {
        return NextResponse.json({ lead: withAssignedTo(lead), activity: null });
      }

      const [updatedLead, activity] = await prisma.$transaction([
        prisma.lead.update({
          where: { id: leadId },
          include: ASSIGNEE,
          data: { nextActionCompletedAt: new Date() },
        }),
        prisma.activity.create({
          data: {
            leadId,
            type: "next_action_completed",
            summary: `Completed next action: "${lead.nextAction}"`,
            detail: buildNextActionDetail(lead.nextAction, lead.nextActionAt),
            actor,
          },
        }),
      ]);

      return NextResponse.json({ lead: withAssignedTo(updatedLead), activity });
    }

    if (op === "clear-next-action") {
      // No-op: nothing to clear.
      if (!lead.nextAction && !lead.nextActionAt && !lead.nextActionCompletedAt) {
        return NextResponse.json({ lead: withAssignedTo(lead), activity: null });
      }

      const [updatedLead, activity] = await prisma.$transaction([
        prisma.lead.update({
          where: { id: leadId },
          include: ASSIGNEE,
          data: { nextAction: null, nextActionAt: null, nextActionCompletedAt: null },
        }),
        prisma.activity.create({
          data: {
            leadId,
            type: "next_action_cleared",
            summary: "Next action cleared",
            actor,
          },
        }),
      ]);

      return NextResponse.json({ lead: withAssignedTo(updatedLead), activity });
    }

    if (op === "record-offer") {
      const amount = validateOfferAmount(amountUsd);
      if (amount === null) {
        return NextResponse.json(
          { error: "amountUsd must be a positive whole-dollar amount up to $5,000,000" },
          { status: 400 }
        );
      }

      const offerNote = note === undefined || note === null ? null : validateNote(note);
      if (note !== undefined && note !== null && offerNote === null) {
        return NextResponse.json({ error: "note must be 1-500 characters" }, { status: 400 });
      }

      // The offer is the buyer's real number — deliberately stored only as an
      // activity, never mixed into Spotr's heuristic maxOffer economics.
      const activity = await prisma.activity.create({
        data: {
          leadId,
          type: "offer_recorded",
          summary: `Recorded offer of ${currency.format(amount)}`,
          detail: buildOfferDetail(amount, offerNote),
          actor,
        },
      });

      return NextResponse.json({ lead: withAssignedTo(lead), activity });
    }

    // add-note
    const noteText = validateNote(note);
    if (!noteText) {
      return NextResponse.json({ error: "note is required (1-500 characters)" }, { status: 400 });
    }

    const activity = await prisma.activity.create({
      data: {
        leadId,
        type: "note_added",
        summary: "Note added",
        detail: buildNoteDetail(noteText),
        actor,
      },
    });

    return NextResponse.json({ lead: withAssignedTo(lead), activity });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    console.error("Error applying follow-up op:", error);
    return NextResponse.json({ error: "Failed to apply follow-up update" }, { status: 500 });
  }
}
