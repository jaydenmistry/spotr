import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { ARCHIVE_RETENTION_DAYS, isAccessRequestStatus, validateAccessRequest } from "@/lib/accessRequest";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8 * 1024;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const ID_MAX_LENGTH = 64;

// POST is public (the marketing site's "Request access" form). GET, PATCH and
// DELETE expose prospects' contact details, so they're admin-only. Once
// multi-tenancy lands this becomes a platform-admin role, not a tenant one.
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  // Per-IP limit plus a global ceiling, so rotating IPs can't flood the table.
  if (!rateLimit(`access-request:${ip}`, 5, 10 * 60 * 1000) || !rateLimit("access-request:global", 100, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Honeypot: a field humans never see. Bots that fill it get a normal
  // success response and nothing is stored.
  const honeypot = (body as Record<string, unknown> | null)?.website;
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const result = validateAccessRequest(body);
  if (!result.ok) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fields: result.errors }, { status: 400 });
  }

  try {
    // A resubmission from the same address within a day is acknowledged but
    // not stored twice.
    const recent = await prisma.accessRequest.findFirst({
      where: { email: result.value.email, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
      select: { id: true },
    });
    if (!recent) await prisma.accessRequest.create({ data: result.value });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error saving access request:", error);
    return NextResponse.json({ error: "Couldn't send your request. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  try {
    // Retention: archived requests older than the window are deleted.
    await prisma.accessRequest.deleteMany({
      where: { status: "archived", updatedAt: { lt: new Date(Date.now() - ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000) } },
    });
    const [requests, grouped] = await Promise.all([
      prisma.accessRequest.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
      prisma.accessRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    const counts = Object.fromEntries(grouped.map((row) => [row.status, row._count._all]));
    return NextResponse.json({ requests, counts });
  } catch (error) {
    console.error("Error loading access requests:", error);
    return NextResponse.json({ error: "Failed to load access requests" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, status } = (body ?? {}) as Record<string, unknown>;
  if (!isValidId(id) || !isAccessRequestStatus(status)) {
    return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
  }

  try {
    const updated = await prisma.accessRequest.update({ where: { id }, data: { status } });
    return NextResponse.json({ request: updated });
  } catch (error) {
    return notFoundOr500(error, "updating");
  }
}

/** Permanent deletion — honors "delete my data" requests from prospects. */
export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!isValidId(id)) {
    return NextResponse.json({ error: "A valid id is required" }, { status: 400 });
  }

  try {
    await prisma.accessRequest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return notFoundOr500(error, "deleting");
  }
}

function isValidId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= ID_MAX_LENGTH;
}

function notFoundOr500(error: unknown, action: string) {
  // Prisma's "record to update/delete not found".
  if ((error as { code?: string } | null)?.code === "P2025") {
    return NextResponse.json({ error: "Access request not found" }, { status: 404 });
  }
  console.error(`Error ${action} access request:`, error);
  return NextResponse.json({ error: `Failed ${action} access request` }, { status: 500 });
}
