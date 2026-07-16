import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { BUY_BOX_ID, sanitizeKeywords, sanitizeMakeRules } from "@/lib/buyBox";
import { loadBuyBoxConfig } from "@/lib/buyBoxStore";

export const dynamic = "force-dynamic";

// GET is read-only by design: it never creates the row (see buyBoxStore).
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(request.headers);
  if (!rateLimit(`buybox-get:${ip}`, 120, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  try {
    return NextResponse.json(await loadBuyBoxConfig());
  } catch (error) {
    console.error("Error loading buy box:", error);
    return NextResponse.json({ error: "Failed to load buy box" }, { status: 500 });
  }
}

function intOrNull(value: unknown, min: number, max: number, field: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new RangeError(`${field} must be a number`);
  const rounded = Math.round(parsed);
  if (rounded < min || rounded > max) throw new RangeError(`${field} must be between ${min} and ${max}`);
  return rounded;
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(request.headers);
  if (!rateLimit(`buybox-put:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: "Too many saves. Try again in a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;

  try {
    const yearMin = intOrNull(payload.yearMin, 1950, 2035, "yearMin");
    const yearMax = intOrNull(payload.yearMax, 1950, 2035, "yearMax");
    const maxMileage = intOrNull(payload.maxMileage, 0, 500_000, "maxMileage");
    const acquisitionMin = intOrNull(payload.acquisitionMin, 0, 5_000_000, "acquisitionMin");
    const acquisitionMax = intOrNull(payload.acquisitionMax, 0, 5_000_000, "acquisitionMax");
    const targetRetailMin = intOrNull(payload.targetRetailMin, 0, 5_000_000, "targetRetailMin");
    const targetRetailMax = intOrNull(payload.targetRetailMax, 0, 5_000_000, "targetRetailMax");
    const targetMinGross = intOrNull(payload.targetMinGross, 500, 100_000, "targetMinGross") ?? 3000;
    const radiusMiles = intOrNull(payload.radiusMiles, 10, 500, "radiusMiles") ?? 100;

    if (yearMin !== null && yearMax !== null && yearMin > yearMax) {
      return NextResponse.json({ error: "yearMin cannot exceed yearMax" }, { status: 400 });
    }
    if (acquisitionMin !== null && acquisitionMax !== null && acquisitionMin > acquisitionMax) {
      return NextResponse.json({ error: "acquisitionMin cannot exceed acquisitionMax" }, { status: 400 });
    }
    if (targetRetailMin !== null && targetRetailMax !== null && targetRetailMin > targetRetailMax) {
      return NextResponse.json({ error: "targetRetailMin cannot exceed targetRetailMax" }, { status: 400 });
    }

    const makeRules = sanitizeMakeRules(payload.makeRules).slice(0, 30);
    const excludedKeywords = sanitizeKeywords(payload.excludedKeywords).slice(0, 20);

    const data = {
      yearMin,
      yearMax,
      maxMileage,
      acquisitionMin,
      acquisitionMax,
      targetRetailMin,
      targetRetailMax,
      targetMinGross,
      radiusMiles,
      makeRules: JSON.stringify(makeRules),
      excludedKeywords: JSON.stringify(excludedKeywords),
    };

    await prisma.buyBox.upsert({
      where: { id: BUY_BOX_ID },
      update: data,
      create: { id: BUY_BOX_ID, ...data },
    });

    return NextResponse.json(await loadBuyBoxConfig());
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error saving buy box:", error);
    return NextResponse.json({ error: "Failed to save buy box" }, { status: 500 });
  }
}
