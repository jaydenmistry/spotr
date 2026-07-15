import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";
import { feedListingFilter } from "@/lib/leadFilters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;
// Stages that mean the lead's lifecycle already ended in the pipeline; they
// are not open opportunities. Stage is free text (see CLAUDE.md gotchas), so
// match the known kanban terminal stages exactly.
const TERMINAL_STAGES = ["Acquired", "Lost"];

function parsePage(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = new URL(request.url).searchParams;
    const page = parsePage(params.get("page"));
    const viewParam = params.get("view");
    const view = viewParam === "passed" || viewParam === "watching" ? viewParam : "active";

    // Synthetic SPOTR-FEED- fixtures are included automatically in
    // development only; feedListingFilter never includes them in production.
    const listingFilter = feedListingFilter(true);
    const openOpportunity = [
      listingFilter,
      { passedAt: null },
      { stage: { notIn: TERMINAL_STAGES } },
    ];
    const where =
      view === "passed"
        ? { AND: [listingFilter, { passedAt: { not: null } }] }
        : view === "watching"
        ? { AND: [...openOpportunity, { watchedAt: { not: null } }] }
        : { AND: openOpportunity };

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: view === "passed" ? { passedAt: "desc" } : { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    return NextResponse.json({ leads, total, page, pageSize: PAGE_SIZE, view });
  } catch (error) {
    console.error("Error fetching opportunity feed:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
