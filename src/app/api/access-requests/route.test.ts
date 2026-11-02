// Public intake + team-only review for "Request access".
import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.fn();
const create = vi.fn();
const findMany = vi.fn();
const update = vi.fn();
const findFirst = vi.fn();
const deleteMany = vi.fn();
const groupBy = vi.fn();
const remove = vi.fn();
const findUser = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    accessRequest: {
      create: (...args: unknown[]) => create(...args),
      findMany: (...args: unknown[]) => findMany(...args),
      update: (...args: unknown[]) => update(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
      groupBy: (...args: unknown[]) => groupBy(...args),
      delete: (...args: unknown[]) => remove(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => findUser(...args),
    },
  },
}));

import { DELETE, GET, PATCH, POST } from "./route";

let ipCounter = 0;
const req = (method: string, body: unknown, ip = `10.0.0.${++ipCounter}`) =>
  new Request("http://localhost/api/access-requests", {
    method,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });

const valid = { name: "Dana Reyes", email: "dana@northside.com", dealership: "Northside Auto", role: "Used car manager" };

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { email: "admin@spotrcars.com" } });
  findUser.mockResolvedValue({ role: "admin" });
  create.mockResolvedValue({ id: "r1" });
  findFirst.mockResolvedValue(null);
  deleteMany.mockResolvedValue({ count: 0 });
  groupBy.mockResolvedValue([{ status: "new", _count: { _all: 1 } }]);
});

describe("POST (public)", () => {
  it("stores a valid request without requiring a session", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(req("POST", valid));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({ data: { ...valid, message: null } });
  });

  it("rejects invalid input with field errors and writes nothing", async () => {
    const res = await POST(req("POST", { ...valid, email: "nope" }));
    expect(res.status).toBe(400);
    expect((await res.json()).fields.email).toBeDefined();
    expect(create).not.toHaveBeenCalled();
  });

  it("silently drops honeypot submissions", async () => {
    const res = await POST(req("POST", { ...valid, website: "http://spam.example" }));
    expect(res.status).toBe(201);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const res = await POST(req("POST", "{not json"));
    expect(res.status).toBe(400);
  });

  it("rejects oversized bodies before parsing", async () => {
    const res = await POST(req("POST", { ...valid, message: "x".repeat(9000) }));
    expect(res.status).toBe(413);
    expect(create).not.toHaveBeenCalled();
  });

  it("acknowledges but does not store a same-day duplicate", async () => {
    findFirst.mockResolvedValue({ id: "existing" });
    const res = await POST(req("POST", valid));
    expect(res.status).toBe(201);
    expect(create).not.toHaveBeenCalled();
  });

  it("rate-limits repeated submissions from one IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await POST(req("POST", valid, "203.0.113.9"))).status);
    expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe("GET / PATCH (admins only)", () => {
  it("requires a session to list requests", async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("refuses signed-in members, checking the role in the database", async () => {
    getServerSession.mockResolvedValue({ user: { email: "rep@spotrcars.com", role: "admin" } });
    findUser.mockResolvedValue({ role: "member" });
    const res = await GET();
    expect(res.status).toBe(403);
    expect(findUser).toHaveBeenCalledWith({ where: { email: "rep@spotrcars.com" }, select: { role: true } });
    expect(findMany).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
    expect((await PATCH(req("PATCH", { id: "r1", status: "contacted" }))).status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses a session whose account no longer exists", async () => {
    findUser.mockResolvedValue(null);
    expect((await GET()).status).toBe(403);
  });

  it("lists newest first for admins", async () => {
    findMany.mockResolvedValue([{ id: "r1" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" }, take: 500 });
    expect((await res.json()).counts).toEqual({ new: 1 });
  });

  it("purges archived requests past the retention window on read", async () => {
    findMany.mockResolvedValue([]);
    await GET();
    const where = deleteMany.mock.calls[0][0].where;
    expect(where.status).toBe("archived");
    const cutoffDays = (Date.now() - where.updatedAt.lt.getTime()) / 86_400_000;
    expect(Math.round(cutoffDays)).toBe(90);
  });

  it("requires a session and a known status to update", async () => {
    getServerSession.mockResolvedValue(null);
    expect((await PATCH(req("PATCH", { id: "r1", status: "contacted" }))).status).toBe(401);
    getServerSession.mockResolvedValue({ user: { email: "admin@spotrcars.com" } });
    expect((await PATCH(req("PATCH", { id: "r1", status: "deleted" }))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates status", async () => {
    update.mockResolvedValue({ id: "r1", status: "contacted" });
    const res = await PATCH(req("PATCH", { id: "r1", status: "contacted" }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { status: "contacted" } });
  });
});

describe("DELETE (admins only)", () => {
  const del = (id?: string) => new Request(`http://localhost/api/access-requests${id ? `?id=${id}` : ""}`, { method: "DELETE" });

  it("requires a session and an id", async () => {
    getServerSession.mockResolvedValue(null);
    expect((await DELETE(del("r1"))).status).toBe(401);
    getServerSession.mockResolvedValue({ user: { email: "admin@spotrcars.com" } });
    expect((await DELETE(del())).status).toBe(400);
    expect(remove).not.toHaveBeenCalled();
  });

  it("refuses members", async () => {
    findUser.mockResolvedValue({ role: "member" });
    expect((await DELETE(del("r1"))).status).toBe(403);
    expect(remove).not.toHaveBeenCalled();
  });

  it("deletes permanently, and reports missing records as 404", async () => {
    remove.mockResolvedValue({ id: "r1" });
    expect((await DELETE(del("r1"))).status).toBe(200);
    expect(remove).toHaveBeenCalledWith({ where: { id: "r1" } });
    remove.mockRejectedValue({ code: "P2025" });
    expect((await DELETE(del("gone"))).status).toBe(404);
  });
});
