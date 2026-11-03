import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";
import { FEED_ACTIONS, isFeedAction, type FeedAction } from "@/lib/feedActions";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { ASSIGNEE, withAssignedTo } from "@/lib/leadAssignee";
import {
  buildOutcomeDetail,
  isOutcomeReason,
  outcomeReasonLabel,
  validateNote,
  type OutcomeReasonCode,
} from "@/lib/followUp";
import { isTerminalStage } from "@/lib/stages";
import { isAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

interface ActionEffect {
  data: Prisma.LeadUpdateInput;
  activity: { type: string; summary: string; detail?: string };
  // True when the action wouldn't change anything — skip all writes.
  noop: boolean;
}

function getActionEffect(
  action: FeedAction,
  lead: {
    stage: string;
    watchedAt: Date | null;
    passedAt: Date | null;
    assignedToId: string | null;
    outcomeReason: string | null;
    outcomeNote: string | null;
  },
  actor: { id: string; email: string },
  outcome: { reason: OutcomeReasonCode; note: string | null } | null,
  now: Date
): ActionEffect {
  switch (action) {
    case "watch":
      return {
        noop: Boolean(lead.watchedAt),
        data: { watchedAt: now },
        activity: { type: "watched", summary: "Added to watchlist" },
      };
    case "unwatch":
      return {
        noop: !lead.watchedAt,
        data: { watchedAt: null },
        activity: { type: "unwatched", summary: "Removed from watchlist" },
      };
    case "pass": {
      // Re-passing with the identical reason/note is a no-op; a different
      // reason/note is a correction and must be applied (original pass
      // timestamp is preserved).
      const alreadyPassed = Boolean(lead.passedAt);
      const samePass =
        alreadyPassed &&
        lead.outcomeReason === (outcome?.reason ?? null) &&
        lead.outcomeNote === (outcome?.note ?? null);
      const label = outcomeReasonLabel(outcome?.reason ?? "other");
      return {
        noop: samePass,
        data: {
          passedAt: lead.passedAt ?? now,
          outcomeReason: outcome?.reason ?? null,
          outcomeNote: outcome?.note ?? null,
        },
        activity: {
          type: "passed",
          summary: alreadyPassed ? `Pass reason updated — ${label}` : `Passed — ${label}`,
          detail: outcome ? buildOutcomeDetail(outcome.reason, outcome.note) : undefined,
        },
      };
    }
    case "unpass":
      return {
        noop: !lead.passedAt,
        // When the stage is Lost (legacy rows can hold both states), the
        // outcome fields describe the Lost outcome — restoring from Passed
        // must not destroy the required Lost reason.
        data:
          lead.stage === "Lost"
            ? { passedAt: null }
            : { passedAt: null, outcomeReason: null, outcomeNote: null },
        activity: { type: "restored", summary: "Restored from Passed" },
      };
    case "assign":
      return {
        noop: lead.assignedToId === actor.id,
        // Assigns to the signed-in user; there's no picker for teammates yet.
        data: { assignee: { connect: { id: actor.id } } },
        activity: { type: "assigned", summary: `Assigned to ${actor.email}` },
      };
    case "unassign":
      return {
        noop: !lead.assignedToId,
        data: { assignee: { disconnect: true } },
        activity: { type: "unassigned", summary: "Unassigned" },
      };
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(request.headers);
  if (!rateLimit(`leads-action:${ip}`, 60, 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many feed actions. Try again in a minute." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { leadId, action, reason, note } = (body ?? {}) as {
    leadId?: unknown;
    action?: unknown;
    reason?: unknown;
    note?: unknown;
  };

  if (typeof leadId !== "string" || leadId.length === 0) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  if (!isFeedAction(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${FEED_ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  // Passing requires a standardized outcome reason (+ optional note).
  let outcome: { reason: OutcomeReasonCode; note: string | null } | null = null;
  if (action === "pass") {
    if (!isOutcomeReason(reason)) {
      return NextResponse.json(
        { error: "A standardized reason is required to pass a lead" },
        { status: 400 }
      );
    }

    const outcomeNote = note === undefined || note === null ? null : validateNote(note);
    if (note !== undefined && note !== null && outcomeNote === null) {
      return NextResponse.json({ error: "note must be 1-500 characters" }, { status: 400 });
    }

    outcome = { reason, note: outcomeNote };
  }

  const actor = session.user?.email ?? "admin";
  const actorId = session.user?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // TODO(tenancy): scope this lookup by the caller's dealer/tenant id once
    // multi-tenancy lands — session-only auth is a cross-tenant IDOR seam.
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        stage: true,
        watchedAt: true,
        passedAt: true,
        assignedToId: true,
        outcomeReason: true,
        outcomeNote: true,
      },
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Passed (feed) and Lost/Acquired (kanban) are separate terminal
    // workflows sharing the outcome columns; passing a terminal-stage lead
    // would clobber the stage outcome's reason, so refuse the overlap.
    if (action === "pass" && isTerminalStage(lead.stage)) {
      return NextResponse.json(
        { error: `Lead is already ${lead.stage} — move it to an active stage before passing` },
        { status: 409 }
      );
    }

    // A lead someone else is working can only be taken over or released by an
    // admin (role re-read from the DB, like requireAdmin).
    if ((action === "assign" || action === "unassign") && lead.assignedToId && lead.assignedToId !== actorId) {
      const user = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
      if (!isAdmin(user?.role)) {
        return NextResponse.json(
          { error: "This lead is assigned to someone else. Only an admin can reassign or unassign it." },
          { status: 403 }
        );
      }
    }

    const effect = getActionEffect(action, lead, { id: actorId, email: actor }, outcome, new Date());

    // No-op: state already matches — return the lead untouched, no activity.
    if (effect.noop) {
      const current = await prisma.lead.findUnique({ where: { id: leadId }, include: ASSIGNEE });
      return NextResponse.json(current && withAssignedTo(current));
    }

    // Lead mutation and its activity are atomic: both or neither.
    const [updatedLead] = await prisma.$transaction([
      prisma.lead.update({ where: { id: leadId }, data: effect.data, include: ASSIGNEE }),
      prisma.activity.create({
        data: {
          leadId,
          type: effect.activity.type,
          summary: effect.activity.summary,
          detail: effect.activity.detail ?? null,
          actor,
        },
      }),
    ]);

    return NextResponse.json(withAssignedTo(updatedLead));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    console.error("Error applying feed action:", error);
    return NextResponse.json({ error: "Failed to apply action" }, { status: 500 });
  }
}
