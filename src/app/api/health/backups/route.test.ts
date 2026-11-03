// Backup freshness check that the uptime monitor polls.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryRawUnsafe = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRawUnsafe: (...args: unknown[]) => queryRawUnsafe(...args),
  },
}));

import { GET } from "./route";

const HOUR = 3_600_000;
let dataDir: string;

function writeBackup(name: string, ageHours: number) {
  const backups = path.join(dataDir, "backups");
  fs.mkdirSync(backups, { recursive: true });
  const file = path.join(backups, name);
  fs.writeFileSync(file, "");
  const time = new Date(Date.now() - ageHours * HOUR);
  fs.utimesSync(file, time, time);
}

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "spotr-backups-"));
  queryRawUnsafe.mockReset();
  queryRawUnsafe.mockResolvedValue([{ file: path.join(dataDir, "prod.db") }]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("GET /api/health/backups", () => {
  it("is ok while the newest copy is under 26 hours old", async () => {
    writeBackup("prod-2026-11-02.db", 25);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", ageHours: 25 });
  });

  it("goes by the newest dated copy", async () => {
    writeBackup("prod-2026-10-30.db", 1);
    writeBackup("prod-2026-11-03.db", 30);
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "stale", ageHours: 30 });
  });

  it("is missing when no backups folder exists yet", async () => {
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "missing" });
  });

  it("ignores partial copies, pre-migration copies and other databases", async () => {
    writeBackup("prod-2026-11-03.db.partial", 0);
    writeBackup("e2e-2026-11-03.db", 0);
    fs.writeFileSync(path.join(dataDir, "prod.db.pre-migrate-1"), "");
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "missing" });
  });

  it("reports an error without details when the database can't be read", async () => {
    queryRawUnsafe.mockRejectedValue(new Error("SQLITE_CANTOPEN /app/data/prod.db"));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "error" });
  });
});
