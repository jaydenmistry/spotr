import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Newest-first, hard-capped. Editing/deleting activities is deliberately
// unsupported — the timeline is an audit trail.
const MAX_ACTIVITIES = 100;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(request.headers);
  if (!rateLimit(`leads-activity:${ip}`, 60, 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 }
    );
  }

  const leadId = new URL(request.url).searchParams.get("leadId");
  if (typeof leadId !== "string" || leadId.length === 0) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  try {
    // TODO(tenancy): scope this lookup by the caller's dealer/tenant id once
    // multi-tenancy lands — session-only auth is a cross-tenant IDOR seam.
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const activities = await prisma.activity.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      take: MAX_ACTIVITIES,
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Error fetching lead activity:", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
