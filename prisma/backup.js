// Writes one consistent copy of the database per day to a `backups` folder
// next to it (`<db>-YYYY-MM-DD.db`, newest few kept). docker-entrypoint.sh
// runs it hourly in the background; a run does nothing once today's copy
// exists. The folder sits on the /app/data volume, so Dokploy's volume backup
// ships these copies off the server. It also deletes migrate.js's
// pre-migration copies once they're two weeks old, so a seller deletion is
// gone from every local copy within that time. Restoring: docs/backups.md
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const BACKUPS_KEPT = 7;
const PRE_MIGRATE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

async function main() {
  const client = new PrismaClient();
  let file;
  try {
    // SQLite reports the file it actually opened, however DATABASE_URL was written.
    [{ file }] = await client.$queryRawUnsafe("PRAGMA database_list");
    const name = path.basename(file, path.extname(file));
    const dir = path.join(path.dirname(file), "backups");
    const day = new Date().toISOString().slice(0, 10);
    const target = path.join(dir, `${name}-${day}.db`);
    if (fs.existsSync(target)) return;

    // Copies hold password hashes and lead data: owner-only.
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    // Leftovers from a run that died partway through.
    for (const entry of fs.readdirSync(dir).filter((entry) => entry.startsWith(`${name}-`) && entry.endsWith(".db.partial"))) {
      fs.rmSync(path.join(dir, entry), { force: true });
    }
    const partial = `${target}.partial`;
    // VACUUM INTO writes a consistent copy even if something else is mid-write.
    await client.$executeRawUnsafe(`VACUUM INTO '${partial.replace(/'/g, "''")}'`);
    fs.chmodSync(partial, 0o600);
    await verify(partial);
    fs.renameSync(partial, target);
    console.log(`Saved a backup to ${target}`);

    const pattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d{4}-\\d{2}-\\d{2}\\.db$`);
    const old = fs.readdirSync(dir).filter((entry) => pattern.test(entry)).sort().slice(0, -BACKUPS_KEPT);
    for (const entry of old) fs.rmSync(path.join(dir, entry), { force: true });

    const preMigrate = `${path.basename(file)}.pre-migrate-`;
    for (const entry of fs.readdirSync(path.dirname(file)).filter((entry) => entry.startsWith(preMigrate))) {
      const copy = path.join(path.dirname(file), entry);
      if (Date.now() - fs.statSync(copy).mtimeMs > PRE_MIGRATE_MAX_AGE_MS) fs.rmSync(copy, { force: true });
    }
  } finally {
    await client.$disconnect();
  }
}

async function verify(copy) {
  const client = new PrismaClient({ datasourceUrl: `file:${copy}` });
  try {
    const [row] = await client.$queryRawUnsafe("PRAGMA quick_check");
    const result = Object.values(row)[0];
    if (result !== "ok") throw new Error(`Backup failed its integrity check: ${result}`);
  } finally {
    await client.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Backup failed: ${error.message}`);
  process.exit(1);
});
