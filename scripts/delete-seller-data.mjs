// Deletes a seller's data on request: the matching lead rows plus their
// activity history and practice-chat messages (both cascade from Lead).
// Dry run by default; nothing is deleted without --confirm.
// Runbook: docs/seller-data-requests.md
//
//   node scripts/delete-seller-data.mjs --vin 1HGCM82633A004352
//   node scripts/delete-seller-data.mjs --id clx123... --confirm
import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const vinInput = flag("--vin")?.trim();
const id = flag("--id")?.trim();
const confirm = args.includes("--confirm");

if (!vinInput === !id) {
  console.error("Usage: node scripts/delete-seller-data.mjs (--vin <VIN> | --id <lead id>) [--confirm]");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  // VINs are stored as the provider sent them, so match any casing of the input.
  const vin = vinInput?.toUpperCase();
  const where = vinInput ? { vin: { in: [...new Set([vinInput, vin, vinInput.toLowerCase()])] } } : { id };
  const leads = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      vin: true,
      year: true,
      make: true,
      model: true,
      source: true,
      createdAt: true,
      _count: { select: { activities: true, messages: true } },
    },
  });

  if (leads.length === 0) {
    console.log(`No leads match ${vin ? `VIN ${vin}` : `id ${id}`}. Nothing to delete.`);
    process.exit(0);
  }

  for (const lead of leads) {
    const vehicle = [lead.year, lead.make, lead.model].filter(Boolean).join(" ") || "Unknown vehicle";
    console.log(
      `${lead.id}  ${lead.vin ?? "no VIN"}  ${vehicle}  source=${lead.source ?? "unknown"}  ` +
        `added=${lead.createdAt.toISOString().slice(0, 10)}  ` +
        `activities=${lead._count.activities}  messages=${lead._count.messages}`
    );
  }

  if (!confirm) {
    console.log(`\nDry run: ${leads.length} lead(s) would be deleted. Re-run with --confirm to delete them.`);
    process.exit(0);
  }

  const { count } = await prisma.lead.deleteMany({ where: { id: { in: leads.map((lead) => lead.id) } } });
  console.log(`\nDeleted ${count} lead(s) with their activity history and messages.`);
} finally {
  await prisma.$disconnect();
}
