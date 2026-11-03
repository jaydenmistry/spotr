// Deletes a seller's data on request: the matching lead rows plus their
// activity history and practice-chat messages (both cascade from Lead). The
// VIN goes on the suppression list (SuppressedVin) so later pulls skip it.
// Dry run by default; nothing is changed without --confirm.
// Runbook: docs/seller-data-requests.md
//
//   node scripts/delete-seller-data.mjs --vin 1HGCM82633A004352
//   node scripts/delete-seller-data.mjs --id clx123... --confirm
import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  const value = index === -1 ? undefined : args[index + 1];
  // `--vin --confirm` is a missing value, not a VIN called "--confirm".
  return value?.startsWith("--") ? "" : value;
};
const vinInput = flag("--vin")?.trim();
const id = flag("--id")?.trim();
const confirm = args.includes("--confirm");

// A modern 17-character VIN: letters and digits, never I, O or Q.
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;

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

  for (const lead of leads) {
    const vehicle = [lead.year, lead.make, lead.model].filter(Boolean).join(" ") || "Unknown vehicle";
    console.log(
      `${lead.id}  ${lead.vin ?? "no VIN"}  ${vehicle}  source=${lead.source ?? "unknown"}  ` +
        `added=${lead.createdAt.toISOString().slice(0, 10)}  ` +
        `activities=${lead._count.activities}  messages=${lead._count.messages}`
    );
  }

  const vins = [...new Set([vin, ...leads.map((lead) => lead.vin?.toUpperCase())].filter(Boolean))];
  const alreadySuppressed = await prisma.suppressedVin.findMany({ where: { vin: { in: vins } } });
  const toSuppress = vins.filter((value) => !alreadySuppressed.some((row) => row.vin === value));

  if (leads.length === 0) {
    console.log(`No leads match ${vin ? `VIN ${vin}` : `id ${id}`}.`);
    // With nothing in Spotr to check it against, a typo would suppress a VIN nobody owns.
    if (vin && !VIN_PATTERN.test(vin)) {
      console.error(`${vin} isn't a valid 17-character VIN, so it wasn't added to the suppression list. Check it with the seller.`);
      process.exit(1);
    }
    if (toSuppress.length === 0) {
      console.log(vin ? "That VIN is already suppressed. Nothing to do." : "Nothing to do.");
      process.exit(0);
    }
  }

  const plan = [
    leads.length > 0 && `${leads.length} lead(s) would be deleted`,
    toSuppress.length > 0 && `${toSuppress.join(", ")} would be added to the suppression list`,
  ].filter(Boolean);
  if (!confirm) {
    console.log(`\nDry run: ${plan.join(", and ")}. Re-run with --confirm to do it.`);
    process.exit(0);
  }

  const [{ count }] = await prisma.$transaction([
    prisma.lead.deleteMany({ where: { id: { in: leads.map((lead) => lead.id) } } }),
    // upsert, so a second operator handling the same request can't fail the delete.
    ...toSuppress.map((value) => prisma.suppressedVin.upsert({ where: { vin: value }, create: { vin: value }, update: {} })),
  ]);
  console.log("");
  if (leads.length > 0) console.log(`Deleted ${count} lead(s) with their activity history and messages.`);
  if (toSuppress.length > 0) {
    console.log(`Suppressed ${toSuppress.join(", ")}; future pulls will skip ${toSuppress.length === 1 ? "it" : "them"}.`);
  } else if (vins.length === 0) {
    console.log("The lead had no VIN, so nothing was added to the suppression list.");
  }
} finally {
  await prisma.$disconnect();
}
