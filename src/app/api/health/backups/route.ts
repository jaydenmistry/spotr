import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// prisma/backup.js takes the day's copy on its first hourly check after midnight
// UTC, so while the container runs the newest copy is at most about 25 hours old.
const MAX_AGE_HOURS = 26;

// For an uptime monitor: 503 when the newest daily backup is missing or too old.
// It's kept off /api/health, which Docker's healthcheck uses, so a backup
// problem never gets the app restarted.
export async function GET() {
  try {
    // Same lookup as backup.js: the backups folder sits next to the open database.
    const [{ file }] = await prisma.$queryRawUnsafe<{ file: string }[]>("PRAGMA database_list");
    const name = path.basename(file, path.extname(file));
    const dir = path.join(path.dirname(file), "backups");
    const pattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d{4}-\\d{2}-\\d{2}\\.db$`);

    const entries = await fs.readdir(dir).catch((error) => {
      if (error?.code === "ENOENT") return [];
      throw error;
    });
    const newest = entries.filter((entry) => pattern.test(entry)).sort().at(-1);
    if (!newest) {
      return NextResponse.json({ status: "missing" }, { status: 503 });
    }

    const { mtimeMs } = await fs.stat(path.join(dir, newest));
    const ageHours = Math.round(((Date.now() - mtimeMs) / 3_600_000) * 10) / 10;
    const fresh = ageHours < MAX_AGE_HOURS;
    return NextResponse.json({ status: fresh ? "ok" : "stale", ageHours }, { status: fresh ? 200 : 503 });
  } catch (error) {
    console.error("Backup status check failed:", error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
