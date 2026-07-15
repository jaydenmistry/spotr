import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";
import { feedListingFilter } from "@/lib/leadFilters";
import { loadBuyBoxConfig } from "@/lib/buyBoxStore";
import { getOpportunityAssessment, type OpportunityAssessment, type Recommendation } from "@/lib/opportunity";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;
// Score/margin ranking assesses at most this many of the newest matching rows.
// The response says so (candidateSetCapped/assessedCount) so the UI never
// implies the ranking is exhaustive.
const CANDIDATE_CAP = 500;
// Stages that mean the lead's lifecycle already ended in the pipeline; they
// are not open opportunities. Stage is free text (see CLAUDE.md gotchas), so
// match the known kanban terminal stages exactly.
const TERMINAL_STAGES = ["Acquired", "Lost"];

const SORTS = ["score", "newest", "margin", "distance", "age"] as const;
type FeedSort = (typeof SORTS)[number];

const RECOMMENDATIONS: Recommendation[] = ["BUY", "INVESTIGATE", "WATCH", "PASS"];

function parsePage(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function parseSort(value: string | null): FeedSort {
  return (SORTS as readonly string[]).includes(value ?? "") ? (value as FeedSort) : "score";
}

function parseRecommendation(value: string | null): Recommendation | null {
  return (RECOMMENDATIONS as readonly string[]).includes(value ?? "") ? (value as Recommendation) : null;
}

type AssessedLead = Record<string, unknown> & {
  assessment: OpportunityAssessment;
  createdAt: string;
  distanceMiles: number | null;
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = new URL(request.url).searchParams;
    const page = parsePage(params.get("page"));
    const sort = parseSort(params.get("sort"));
    const recommendationFilter = parseRecommendation(params.get("recommendation"));
    const q = (params.get("q") ?? "").trim().slice(0, 60);
    const viewParam = params.get("view");
    const view = viewParam === "passed" || viewParam === "watching" ? viewParam : "active";

    // Synthetic SPOTR-FEED- fixtures are included automatically in
    // development only; feedListingFilter never includes them in production.
    const listingFilter = feedListingFilter(true);
    const openOpportunity: Prisma.LeadWhereInput[] = [
      listingFilter,
      { passedAt: null },
      { stage: { notIn: TERMINAL_STAGES } },
    ];
    const viewFilter: Prisma.LeadWhereInput[] =
      view === "passed"
        ? [listingFilter, { passedAt: { not: null } }]
        : view === "watching"
        ? [...openOpportunity, { watchedAt: { not: null } }]
        : openOpportunity;
    // SQLite LIKE is case-insensitive for ASCII, so `contains` works as search.
    const searchFilter: Prisma.LeadWhereInput[] = q
      ? [
          {
            OR: [
              { make: { contains: q } },
              { model: { contains: q } },
              { trim: { contains: q } },
              { listingTitle: { contains: q } },
              { vin: { contains: q } },
            ],
          },
        ]
      : [];
    const where: Prisma.LeadWhereInput = { AND: [...viewFilter, ...searchFilter] };

    const [matchingTotal, candidates, buyBox] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: view === "passed" ? { passedAt: "desc" } : { createdAt: "desc" },
        take: CANDIDATE_CAP,
      }),
      loadBuyBoxConfig(),
    ]);

    const assessed: AssessedLead[] = candidates.map((lead) => {
      const serialized = {
        ...lead,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        watchedAt: lead.watchedAt ? lead.watchedAt.toISOString() : null,
        passedAt: lead.passedAt ? lead.passedAt.toISOString() : null,
      };
      return { ...serialized, assessment: getOpportunityAssessment(serialized, buyBox.config) };
    });

    const filtered = recommendationFilter
      ? assessed.filter((lead) => lead.assessment.recommendation === recommendationFilter)
      : assessed;

    const ranked = [...filtered].sort((a, b) => {
      if (sort === "score") {
        return (
          b.assessment.finalOpportunityScore - a.assessment.finalOpportunityScore ||
          Date.parse(b.createdAt) - Date.parse(a.createdAt)
        );
      }
      if (sort === "margin") {
        const aGross = a.assessment.baseProjectedGross ?? Number.NEGATIVE_INFINITY;
        const bGross = b.assessment.baseProjectedGross ?? Number.NEGATIVE_INFINITY;
        return bGross - aGross || Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }
      if (sort === "distance") {
        return (a.distanceMiles ?? Number.POSITIVE_INFINITY) - (b.distanceMiles ?? Number.POSITIVE_INFINITY);
      }
      if (sort === "age") {
        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      }
      return Date.parse(b.createdAt) - Date.parse(a.createdAt); // newest
    });

    const total = ranked.length;
    const pageLeads = ranked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return NextResponse.json({
      leads: pageLeads,
      total,
      matchingTotal,
      page,
      pageSize: PAGE_SIZE,
      view,
      sort,
      candidateSetCapped: matchingTotal > CANDIDATE_CAP,
      assessedCount: candidates.length,
      buyBoxPersisted: buyBox.persisted,
    });
  } catch (error) {
    console.error("Error fetching opportunity feed:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
