// Deterministic data for the Playwright suite (tests/e2e). Refuses to run
// against anything but a throwaway e2e database: rows use E2E- VINs, which
// are NOT filtered from production lists the way SPOTR- fixtures are, so this
// must never touch a real database.
import { PrismaClient } from "@prisma/client";

// Only the throwaway file e2e-server.sh creates: file:./e2e.db (prisma/e2e.db).
const dbUrl = process.env.DATABASE_URL ?? "";
const dbFile = dbUrl.replace(/^file:/, "");
const isThrowawayDb = dbUrl.startsWith("file:") && /(^|\/)e2e\.db$/.test(dbFile) && !dbFile.startsWith("/app/data");
if (process.env.E2E !== "1" || !isThrowawayDb) {
  console.error("seed-e2e: refusing to run (needs E2E=1 and DATABASE_URL=file:./e2e.db).");
  process.exit(1);
}

const prisma = new PrismaClient();
const now = Date.now();
const daysAgo = (days) => new Date(now - days * 86_400_000);
const hoursFromNow = (hours) => new Date(now + hours * 3_600_000);

// Offline, deterministic "photos": a gradient with a simple car silhouette.
const photo = (from, to) =>
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><path d="M150 330 L230 250 Q260 220 320 215 L500 215 Q560 220 600 260 L680 300 Q700 310 700 330 L700 350 L150 350 Z" fill="rgba(0,0,0,0.35)"/><circle cx="270" cy="355" r="42" fill="rgba(0,0,0,0.55)"/><circle cx="580" cy="355" r="42" fill="rgba(0,0,0,0.55)"/></svg>`
  );

const base = { source: "marketcheck", searchZip: "30043", searchRadius: 100, sellerName: "Listing Seller" };

const leads = [
  { vin: "E2E-0001", listingTitle: "2019 Porsche 911 Carrera S", year: 2019, make: "Porsche", model: "911", trim: "Carrera S", price: 118500, miles: 21800, distanceMiles: 12.4, city: "Lawrenceville", state: "GA", stage: "New Leads", photo_url: photo("#7d6bff", "#3ea6ff"), createdAt: daysAgo(0), nextAction: "Call seller about service records", nextActionAt: hoursFromNow(-1) },
  { vin: "E2E-0002", listingTitle: "2021 Toyota Tacoma TRD Off-Road", year: 2021, make: "Toyota", model: "Tacoma", trim: "TRD Off-Road", price: 38900, miles: 34100, distanceMiles: 28.3, city: "Duluth", state: "GA", stage: "Contacted", photo_url: photo("#ff9f0a", "#ff453a"), createdAt: daysAgo(2), watchedAt: daysAgo(1), nextAction: "Send offer range", nextActionAt: hoursFromNow(3) },
  { vin: "E2E-0003", listingTitle: "2020 Audi RS5 Sportback", year: 2020, make: "Audi", model: "RS5", price: 61200, miles: 27900, distanceMiles: 35.1, city: "Marietta", state: "GA", stage: "Appraisal", photo_url: photo("#32d74b", "#0a84ff"), createdAt: daysAgo(5) },
  { vin: "E2E-0004", listingTitle: "2018 Lexus GX 460", year: 2018, make: "Lexus", model: "GX 460", price: 36500, miles: 64200, distanceMiles: 19.6, city: "Roswell", state: "GA", stage: "Offer Made", photo_url: photo("#bf5af2", "#ff375f"), createdAt: daysAgo(8) },
  { vin: "E2E-0005", listingTitle: "2017 BMW M3 Competition", year: 2017, make: "BMW", model: "M3", price: 44500, miles: null, distanceMiles: 41.0, city: "Alpharetta", state: "GA", stage: "New Leads", photo_url: photo("#64d2ff", "#5e5ce6"), createdAt: daysAgo(3) },
  { vin: "E2E-0006", listingTitle: "2022 Ford Bronco Badlands", year: 2022, make: "Ford", model: "Bronco", price: 52800, miles: 18400, distanceMiles: 22.7, city: "Cumming", state: "GA", stage: "Acquired", photo_url: photo("#ffd60a", "#ff9f0a"), createdAt: daysAgo(14) },
];

await prisma.activity.deleteMany({ where: { lead: { vin: { startsWith: "E2E-" } } } });
await prisma.lead.deleteMany({ where: { vin: { startsWith: "E2E-" } } });
for (const [index, lead] of leads.entries()) {
  await prisma.lead.create({ data: { ...base, ...lead, vdp_url: `https://example.com/e2e/${index + 1}` } });
}
await prisma.accessRequest.deleteMany({});
await prisma.accessRequest.create({
  data: { name: "Dana Reyes", email: "dana@northside.example", dealership: "Northside Auto Group", role: "Used car manager", message: "We focus on late-model trucks and German sports cars." },
});
console.log(`seed-e2e: ${leads.length} leads, 1 access request.`);
await prisma.$disconnect();
