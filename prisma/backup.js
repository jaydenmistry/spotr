// Writes one consistent copy of the database per day to a `backups` folder
// next to it (`<db>-YYYY-MM-DD.db`, newest few kept). docker-entrypoint.sh
// runs it hourly in the background; a run does nothing once today's copy
// exists. The folder sits on the /app/data volume, so Dokploy's volume backup
// ships these copies off the server. Restoring: docs/backups.md
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const BACKUPS_KEPT = 7;

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

    fs.mkdirSync(dir, { recursive: true });
    // Leftovers from a run that died partway through.
    for (const entry of fs.readdirSync(dir).filter((entry) => entry.startsWith(`${name}-`) && entry.endsWith(".db.partial"))) {
      fs.rmSync(path.join(dir, entry), { force: true });
    }
    const partial = `${target}.partial`;
    // VACUUM INTO writes a consistent copy even if something else is mid-write.
    await client.$executeRawUnsafe(`VACUUM INTO '${partial.replace(/'/g, "''")}'`);
    await verify(partial);
    fs.renameSync(partial, target);
    console.log(`Saved a backup to ${target}`);

    const pattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d{4}-\\d{2}-\\d{2}\\.db$`);
    const old = fs.readdirSync(dir).filter((entry) => pattern.test(entry)).sort().slice(0, -BACKUPS_KEPT);
    for (const entry of old) fs.rmSync(path.join(dir, entry), { force: true });
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
