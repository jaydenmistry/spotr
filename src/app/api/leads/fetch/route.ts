import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import axios, { AxiosError } from "axios";
import { EXOTIC_MAKES } from "@/lib/vehicleAnalytics";
import { mapMarketcheckListing, type MarketcheckListing } from "@/lib/marketcheck";
import { authOptions } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const MARKETCHECK_API_KEY = process.env.MARKETCHECK_API_KEY;
const DEFAULT_ZIP_CODE = "30043";
const DEFAULT_SEARCH_RADIUS_MILES = 100;
const MAX_SEARCH_RADIUS_MILES = 100;
const MAX_PULL_LIMIT = 1500;
const DEFAULT_PULL_LIMIT = 1000;
const BATCH_SIZE = 100;

interface FetchPayload {
  limit?: number;
  makes?: string[];
  minPrice?: number;
  maxPrice?: number;
  zipCode?: string;
  radiusMiles?: number;
}

interface MarketcheckResponse {
  listings?: MarketcheckListing[];
  num_found?: number;
}

interface ProviderIssue {
  make: string;
  message: string;
}

function clampLimit(limit: unknown) {
  const parsed = typeof limit === "number" ? limit : Number(limit);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_PULL_LIMIT;
  }

  return Math.max(100, Math.min(MAX_PULL_LIMIT, Math.round(parsed)));
}

function getPayloadValue(payload: unknown): FetchPayload {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  return payload as FetchPayload;
}

function normalizeMakes(makes: unknown) {
  if (!Array.isArray(makes)) {
    return []; // Empty means all makes
  }

  const selected = makes
    .filter((make): make is string => typeof make === "string")
    .map(make => make.trim())
    .filter(make => make.length > 0);

  return selected;
}

function normalizePrice(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeZip(value: unknown) {
  const zip = typeof value === "string" ? value.trim() : "";
  return /^\d{5}$/.test(zip) ? zip : DEFAULT_ZIP_CODE;
}

function normalizeRadius(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SEARCH_RADIUS_MILES;
  }

  return Math.max(10, Math.min(MAX_SEARCH_RADIUS_MILES, Math.round(parsed)));
}

function isStartBeyondResultsError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.status === 422 &&
    typeof axiosError.response.data?.message === "string" &&
    axiosError.response.data.message.includes("Start parameter greater than num_found")
  );
}

function isRateLimitError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 429;
}

function getProviderErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Unknown provider error";
  }

  const message = (error.response?.data as { message?: string } | undefined)?.message;
  return message || error.message || "Unknown provider error";
}

async function fetchMarketcheckLeads({
  limit,
  makes,
  minPrice,
  maxPrice,
  zipCode,
  radiusMiles,
}: {
  limit: number;
  makes: string[];
  minPrice?: number;
  maxPrice?: number;
  zipCode: string;
  radiusMiles: number;
}) {
  if (!MARKETCHECK_API_KEY) {
    return {
      leads: [],
      issues: [{ make: "Marketcheck", message: "Marketcheck API key is not configured" }],
    };
  }

  const leads: Prisma.LeadCreateManyInput[] = [];
  const issues: ProviderIssue[] = [];
  const makesToFetch = makes.length > 0 ? makes : [undefined];
  const perMakeLimit = Math.ceil(limit / makesToFetch.length);

  for (const make of makesToFetch) {
    let offset = 0;
    let totalFoundForMake: number | null = null;

    while (leads.filter((lead) => make ? lead.make === make : true).length < perMakeLimit && leads.length < limit) {
      if (totalFoundForMake !== null && offset >= totalFoundForMake) {
        break;
      }

      const rows = Math.min(BATCH_SIZE, perMakeLimit - leads.filter((lead) => make ? lead.make === make : true).length);
      let response;

      try {
        const params: any = {
          api_key: MARKETCHECK_API_KEY,
          zip: zipCode,
          radius: radiusMiles,
          rows,
          start: offset,
          price_range: `${minPrice || 0}-${maxPrice || 2000000}`,
        };
        if (make) {
          params.make = make;
        }

        response = await axios.get<MarketcheckResponse>(
          "https://api.marketcheck.com/v2/search/car/active",
          { params }
        );
      } catch (error) {
        if (isStartBeyondResultsError(error)) {
          break;
        }

        issues.push({ make: make ?? "all", message: getProviderErrorMessage(error) });
        if (isRateLimitError(error)) {
          return { leads: leads.slice(0, limit), issues };
        }

        break;
      }

      totalFoundForMake = response.data.num_found ?? totalFoundForMake;
      const listings = response.data.listings || [];

      if (listings.length === 0) {
        break;
      }

      leads.push(
        ...listings
          .map((listing) => mapMarketcheckListing(listing, zipCode, radiusMiles))
          .filter((lead) => lead.vin && lead.vdp_url && lead.photo_url)
          .filter((lead) => (lead.price || 0) >= (minPrice || 0))
          .filter((lead) => !maxPrice || (lead.price || 0) <= maxPrice)
      );
      offset += listings.length;
    }
  }

  return { leads: leads.slice(0, limit), issues };
}

async function getExistingVins(vins: string[]) {
  const existing = new Set<string>();

  for (let index = 0; index < vins.length; index += 500) {
    const chunk = vins.slice(index, index + 500);
    const found = await prisma.lead.findMany({
      where: { vin: { in: chunk } },
      select: { vin: true },
    });

    found.forEach((lead) => {
      if (lead.vin) {
        existing.add(lead.vin);
      }
    });
  }

  return existing;
}

// Sellers who asked to be removed (SuppressedVin, stored uppercase).
async function getSuppressedVins(vins: string[]) {
  const suppressed = new Set<string>();
  const upper = [...new Set(vins.map((vin) => vin.toUpperCase()))];

  for (let index = 0; index < upper.length; index += 500) {
    const found = await prisma.suppressedVin.findMany({
      where: { vin: { in: upper.slice(index, index + 500) } },
      select: { vin: true },
    });
    found.forEach(({ vin }) => suppressed.add(vin));
  }

  return suppressed;
}

async function saveLeads(leadsData: Prisma.LeadCreateManyInput[]) {
  const vins = leadsData.map((lead) => lead.vin).filter((vin): vin is string => Boolean(vin));
  const existingVins = await getExistingVins(vins);
  const uniqueByVin = new Map<string, Prisma.LeadCreateManyInput>();

  leadsData.forEach((lead) => {
    if (lead.vin && !existingVins.has(lead.vin)) {
      uniqueByVin.set(lead.vin, lead);
    }
  });

  const newLeads = Array.from(uniqueByVin.values());
  let saved = 0;

  for (let index = 0; index < newLeads.length; index += 100) {
    // Checked per chunk, right before writing, so a deletion request handled
    // while a long pull is saving still takes effect for the rest of it.
    const candidates = newLeads.slice(index, index + 100);
    const suppressed = await getSuppressedVins(candidates.map((lead) => lead.vin as string));
    const chunk = candidates.filter((lead) => !suppressed.has((lead.vin as string).toUpperCase()));
    await prisma.$transaction(chunk.map((data) => prisma.lead.create({ data })));
    saved += chunk.length;
  }

  return saved;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Each call fans out into many paid Marketcheck requests; keep the ceiling low.
  const ip = clientIp(request.headers);
  if (!rateLimit(`leads-fetch:${ip}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many lead pulls. Try again in a few minutes." },
      { status: 429 }
    );
  }

  try {
    let parsedBody: unknown = {};

    try {
      parsedBody = await request.json();
    } catch {
      parsedBody = {};
    }

    const payload = getPayloadValue(parsedBody);
    const limit = clampLimit(payload.limit);
    const makes = normalizeMakes(payload.makes);
    const minPrice = normalizePrice(payload.minPrice);
    const maxPrice = normalizePrice(payload.maxPrice);
    const zipCode = normalizeZip(payload.zipCode);
    const radiusMiles = normalizeRadius(payload.radiusMiles);
    const source = "Marketcheck";
    const { leads: leadsData, issues } = await fetchMarketcheckLeads({
      limit,
      makes,
      minPrice,
      maxPrice,
      zipCode,
      radiusMiles,
    });

    const savedCount = await saveLeads(leadsData.slice(0, limit));
    const issueSummary = issues.length > 0
      ? ` Skipped ${issues.length} make${issues.length === 1 ? "" : "s"} due to provider limits/errors.`
      : "";

    return NextResponse.json({
      success: issues.length === 0 || leadsData.length > 0,
      message:
        leadsData.length < limit
          ? `Pulled ${savedCount} new verified listings. Live source returned ${leadsData.length} of ${limit} requested.${issueSummary}`
          : `Pulled ${savedCount} new verified listings.${issueSummary}`,
      count: savedCount,
      requested: limit,
      returned: leadsData.length,
      zipCode,
      radiusMiles,
      makes,
      source,
      providerIssues: issues,
    });
  } catch (error) {
    console.error("Error saving leads:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
