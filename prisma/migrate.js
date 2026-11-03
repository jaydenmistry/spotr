// Applies prisma/migrations to DATABASE_URL. Runs at container start
// (docker-entrypoint.sh) and in `npm run db:setup`.
//
// Databases created before migrations existed (by `prisma db push`) already
// have the 0_init tables but no migration history. For those, 0_init is
// checked against the live schema and marked as applied, once; `migrate
// deploy` then applies everything after it. A database that doesn't match
// 0_init is never baselined: the start fails loudly instead of migrating on
// top of an unknown schema.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const BASELINE = "0_init";
const prismaCli = require.resolve("prisma/build/index.js");
const schema = path.join(__dirname, "schema.prisma");
const prisma = (args, options = {}) =>
  execFileSync(process.execPath, [prismaCli, ...args], { stdio: "inherit", ...options });

async function tableNames() {
  const client = new PrismaClient();
  try {
    const rows = await client.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type = 'table'");
    return new Set(rows.map((row) => row.name));
  } finally {
    await client.$disconnect();
  }
}

function matchesBaseline() {
  // Build 0_init in a scratch database and diff the live one against it.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spotr-baseline-"));
  const scratchUrl = `file:${path.join(dir, "baseline.db")}`;
  try {
    const sql = path.join(__dirname, "migrations", BASELINE, "migration.sql");
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
  const tables = await tableNames();
  if (tables.has("Lead") && !tables.has("_prisma_migrations")) {
    console.log(`Existing database has no migration history; checking it against ${BASELINE}...`);
    if (!matchesBaseline()) {
      throw new Error(
        `The database schema doesn't match ${BASELINE} (diff above), so it can't be baselined automatically. ` +
          "Back it up and reconcile it by hand before starting the app."
      );
    }
    prisma(["migrate", "resolve", "--applied", BASELINE, "--schema", schema]);
  }

  prisma(["migrate", "deploy", "--schema", schema]);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
