import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";
import { FEED_ACTIONS, isFeedAction } from "@/lib/feedActions";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

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

  const { leadId, action } = (body ?? {}) as { leadId?: unknown; action?: unknown };

  if (typeof leadId !== "string" || leadId.length === 0) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  if (!isFeedAction(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${FEED_ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const now = new Date();
  const data: Prisma.LeadUpdateInput =
    action === "watch"
      ? { watchedAt: now }
      : action === "unwatch"
      ? { watchedAt: null }
      : action === "pass"
      ? { passedAt: now }
      : action === "unpass"
      ? { passedAt: null }
      : action === "assign"
      ? // Single-user v1: assign to the signed-in user.
        // TODO: replace assignedTo with a User relation (assignedToId) once
        // RBAC/multi-tenancy lands — email is not a stable cross-tenant key.
        { assignedTo: session.user?.email ?? "admin" }
      : { assignedTo: null };

  try {
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data,
    });

    return NextResponse.json(updatedLead);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    console.error("Error applying feed action:", error);
    return NextResponse.json({ error: "Failed to apply action" }, { status: 500 });
  }
}
