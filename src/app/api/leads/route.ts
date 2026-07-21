import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";
import { VERIFIED_LISTING_FILTER } from "@/lib/leadFilters";
import { isStage, STAGES } from "@/lib/stages";
import {
  buildOutcomeDetail,
  buildStageDetail,
  isOutcomeReason,
  outcomeReasonLabel,
  validateNote,
  type OutcomeReasonCode,
} from "@/lib/followUp";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // TODO(tenancy): scope this query (and the joined Activity relation below)
    // by the caller's dealer/tenant id once multi-tenancy lands — today it
    // returns every verified lead unscoped.
    const leads = await prisma.lead.findMany({
      where: VERIFIED_LISTING_FILTER,
      orderBy: { createdAt: "desc" },
      include: {
        // Newest activity per lead, resolved by Prisma in ONE bounded relation
        // query for the whole page — never a request per card. Only the
        // server-built, PII-free scalars are selected.
        activities: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { type: true, summary: true, createdAt: true },
        },
      },
    });

    // Flatten to `lastActivity` so clients never see the relation array or PII fields.
    return NextResponse.json(
      leads.map(({ activities, ...lead }) => ({
        ...lead,
        lastActivity: activities[0]
          ? {
              type: activities[0].type,
              summary: activities[0].summary,
              createdAt: activities[0].createdAt,
            }
          : null,
      }))
    );
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { leadId, stage, reason, note } = (body ?? {}) as {
    leadId?: unknown;
    stage?: unknown;
    reason?: unknown;
    note?: unknown;
  };

  if (typeof leadId !== "string" || leadId.length === 0) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  // Lead.stage is free text in the schema; enforce the kanban stages here.
  if (!isStage(stage)) {
    return NextResponse.json(
      { error: `stage must be one of: ${STAGES.join(", ")}` },
      { status: 400 }
    );
  }

  // Marking a lead Lost requires a standardized outcome reason.
  let outcome: { reason: OutcomeReasonCode; note: string | null } | null = null;
  if (stage === "Lost") {
    if (!isOutcomeReason(reason)) {
      return NextResponse.json(
        { error: "A standardized reason is required to mark a lead Lost" },
        { status: 400 }
      );
    }

    const outcomeNote = note === undefined || note === null ? null : validateNote(note);
    if (note !== undefined && note !== null && outcomeNote === null) {
      return NextResponse.json({ error: "note must be 1-500 characters" }, { status: 400 });
    }

    outcome = { reason, note: outcomeNote };
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { stage: true, passedAt: true, outcomeReason: true, outcomeNote: true },
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Passed (feed) and Lost (kanban) are separate terminal workflows
    // sharing the outcome columns; marking a Passed lead Lost would clobber
    // the required pass reason, so refuse the overlap.
    if (stage === "Lost" && lead.passedAt) {
      return NextResponse.json(
        { error: "Lead is Passed — restore it from Passed before marking it Lost" },
        { status: 409 }
      );
    }

    // Same-stage moves are no-ops — except Lost→Lost with a different
    // reason/note, which is a correction and must be applied.
    const lostCorrection =
      lead.stage === stage &&
      stage === "Lost" &&
      outcome !== null &&
      (lead.outcomeReason !== outcome.reason || lead.outcomeNote !== outcome.note);

    if (lead.stage === stage && !lostCorrection) {
      const current = await prisma.lead.findUnique({ where: { id: leadId } });
      return NextResponse.json(current);
    }

    const data: Prisma.LeadUpdateInput = { stage };
    if (outcome) {
      data.outcomeReason = outcome.reason;
      data.outcomeNote = outcome.note;
    } else if (lead.stage === "Lost" && !lead.passedAt) {
      // Leaving Lost re-opens the lead; drop the stale Lost reason (a Passed
      // lead's outcome is owned by the pass/restore flow instead).
      data.outcomeReason = null;
      data.outcomeNote = null;
    }

    const activity =
      stage === "Lost" && outcome
        ? {
            type: "marked_lost",
            summary: lostCorrection
              ? `Lost reason updated — ${outcomeReasonLabel(outcome.reason)}`
              : `Marked Lost — ${outcomeReasonLabel(outcome.reason)}`,
            detail: buildOutcomeDetail(outcome.reason, outcome.note),
          }
        : {
            type: "stage_changed",
            summary: `Stage changed: ${lead.stage} → ${stage}`,
            detail: buildStageDetail(lead.stage, stage),
          };

    const actor = session.user?.email ?? "admin";

    // Lead mutation and its activity are atomic: both or neither.
    const [updatedLead] = await prisma.$transaction([
      prisma.lead.update({ where: { id: leadId }, data }),
      prisma.activity.create({
        data: { leadId, actor, ...activity },
      }),
    ]);

    return NextResponse.json(updatedLead);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    console.error("Error updating lead:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
