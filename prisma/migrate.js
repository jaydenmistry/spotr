// Applies prisma/migrations to DATABASE_URL. Runs at container start
// (docker-entrypoint.sh) and in `npm run db:setup`.
//
// Databases created before migrations existed (by `prisma db push`) already
// have the 0_init tables but no migration history. For those, 0_init is
// checked against the live schema and marked as applied, once; `migrate
// deploy` then applies everything after it. A database that doesn't match
// 0_init is never baselined: the start fails loudly instead of migrating on
// top of an unknown schema.
//
// Before touching an existing database, a consistent copy is written next to
// it (`<db>.pre-migrate-<time>`, newest few kept), so a migration that dies
// halfway can be undone by restoring that file.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const BASELINE = "0_init";
const SNAPSHOTS_KEPT = 3;
const prismaCli = require.resolve("prisma/build/index.js");
const schema = path.join(__dirname, "schema.prisma");
const migrationsDir = path.join(__dirname, "migrations");
const prisma = (args, options = {}) =>
  execFileSync(process.execPath, [prismaCli, ...args], { stdio: "inherit", ...options });

async function inspect() {
  const client = new PrismaClient();
  try {
    const tables = (await client.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type = 'table'"))
      .map((row) => row.name)
      .filter((name) => !name.startsWith("sqlite_"));
    const hasHistory = tables.includes("_prisma_migrations");
    const applied = hasHistory
      ? (await client.$queryRawUnsafe(
          "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL"
        )).map((row) => row.migration_name)
      : [];
    // SQLite reports the file it actually opened, however DATABASE_URL was written.
    const [main] = await client.$queryRawUnsafe("PRAGMA database_list");
    return { hasData: tables.some((name) => name !== "_prisma_migrations"), hasHistory, applied, file: main.file };
  } finally {
    await client.$disconnect();
  }
}

async function snapshot(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = `${file}.pre-migrate-${stamp}`;
  const client = new PrismaClient();
  try {
    // VACUUM INTO writes a consistent copy even if something else is mid-write.
    await client.$executeRawUnsafe(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  } finally {
    await client.$disconnect();
  }
  console.log(`Saved a pre-migration copy to ${target}`);

  const prefix = `${path.basename(file)}.pre-migrate-`;
  const dir = path.dirname(file);
  const old = fs.readdirSync(dir).filter((name) => name.startsWith(prefix)).sort().slice(0, -SNAPSHOTS_KEPT);
  for (const name of old) fs.rmSync(path.join(dir, name), { force: true });
}

function matchesBaseline() {
  // Build 0_init in a scratch database and diff the live one against it.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spotr-baseline-"));
  const scratchUrl = `file:${path.join(dir, "baseline.db")}`;
  try {
    const sql = path.join(migrationsDir, BASELINE, "migration.sql");
    prisma(["db", "execute", "--file", sql, "--url", scratchUrl], { stdio: "ignore" });
    // The schema's datasource resolves DATABASE_URL (and .env) the same way the app does.
    prisma(["migrate", "diff", "--from-schema-datasource", schema, "--to-url", scratchUrl, "--exit-code"]);
    return true;
  } catch (error) {
    // --exit-code exits 2 when the schemas differ; the diff was printed above.
    if (error.status === 2) return false;
    throw error;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const db = await inspect();
  const migrations = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const pending = migrations.filter((name) => !db.applied.includes(name));

  if (db.hasData && pending.length > 0) await snapshot(db.file);

  if (db.hasData && !db.hasHistory) {
    console.log(`Existing database has no migration history; checking it against ${BASELINE}...`);
    if (!matchesBaseline()) {
      throw new Error(
        `The database schema doesn't match ${BASELINE} (diff above), so it can't be baselined automatically. ` +
          "For a local dev or e2e database, delete it and run this again. For a real one, reconcile it by hand " +
          "from the pre-migration copy before starting the app."
      );
    }
    prisma(["migrate", "resolve", "--applied", BASELINE, "--schema", schema]);
  }

  try {
    prisma(["migrate", "deploy", "--schema", schema]);
  } catch (error) {
    if (db.hasData && pending.length > 0) {
      console.error(
        "Migration failed. To recover, stop the app and replace the database with the newest " +
          `${path.basename(db.file)}.pre-migrate-* copy next to it. That copy predates the failed migration, ` +
          "so fix the cause and the next start retries it."
      );
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
