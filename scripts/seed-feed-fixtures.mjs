// Seeds LABELED SYNTHETIC fixture leads for local Opportunity Feed development.
// - Opt-in only: run manually with `node scripts/seed-feed-fixtures.mjs`.
//   Never wired into docker-entrypoint.sh or prisma seed.
// - Every VIN is prefixed SPOTR-FEED-, so production `GET /api/leads` filters
//   them out unconditionally; dev builds can opt in with ?includeFixtures=1.
// - Rows intentionally vary in completeness/age to exercise the feed's
//   confidence, completeness, and freshness states.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const photo = (seed) => `https://picsum.photos/seed/${seed}/800/500`;

const FIXTURES = [
  {
    vin: "SPOTR-FEED-0001",
    listingTitle: "2019 Porsche 911 Carrera S Coupe",
    year: 2019, make: "Porsche", model: "911 Carrera S", trim: "Carrera S",
    price: 118500, miles: 21800, distanceMiles: 12.4,
    city: "Lawrenceville", state: "GA",
    photo_url: photo("spotr-feed-0001"), vdp_url: "https://example.com/spotr-fixtures/0001",
    createdAt: daysAgo(1),
  },
  {
    vin: "SPOTR-FEED-0002",
    listingTitle: "2021 Ferrari F8 Tributo",
    year: 2021, make: "Ferrari", model: "F8 Tributo",
    price: 329000, miles: 6400, distanceMiles: 28.9,
    city: "Atlanta", state: "GA",
    photo_url: photo("spotr-feed-0002"), vdp_url: "https://example.com/spotr-fixtures/0002",
    createdAt: daysAgo(2),
  },
  {
    vin: "SPOTR-FEED-0003",
    listingTitle: "2016 Lamborghini Huracan LP610-4",
    year: 2016, make: "Lamborghini", model: "Huracan",
    price: 189900, miles: 18200, distanceMiles: 41.2,
    city: "Marietta", state: "GA",
    photo_url: photo("spotr-feed-0003"), vdp_url: "https://example.com/spotr-fixtures/0003",
    createdAt: daysAgo(6),
  },
  {
    // Missing mileage + photo: exercises completeness warnings and no-photo UI.
    vin: "SPOTR-FEED-0004",
    listingTitle: "2018 Aston Martin Vantage V8",
    year: 2018, make: "Aston Martin", model: "Vantage",
    price: 87500, miles: null, distanceMiles: 8.1,
    city: "Duluth", state: "GA",
    photo_url: null, vdp_url: "https://example.com/spotr-fixtures/0004",
    createdAt: daysAgo(4),
  },
  {
    // Missing location and distance.
    vin: "SPOTR-FEED-0005",
    listingTitle: "2020 McLaren 720S Performance",
    year: 2020, make: "McLaren", model: "720S",
    price: 244000, miles: 9100, distanceMiles: null,
    city: null, state: null,
    photo_url: photo("spotr-feed-0005"), vdp_url: "https://example.com/spotr-fixtures/0005",
    createdAt: daysAgo(9),
  },
  {
    // Missing asking price: est. range should be unavailable.
    vin: "SPOTR-FEED-0006",
    listingTitle: "2017 Bentley Continental GT W12",
    year: 2017, make: "Bentley", model: "Continental GT",
    price: null, miles: 33500, distanceMiles: 19.6,
    city: "Roswell", state: "GA",
    photo_url: photo("spotr-feed-0006"), vdp_url: "https://example.com/spotr-fixtures/0006",
    createdAt: daysAgo(12),
  },
  {
    // Aging listing: exercises the stale-listing factor.
    vin: "SPOTR-FEED-0007",
    listingTitle: "2015 Mercedes-Benz AMG GT S",
    year: 2015, make: "Mercedes-Benz", model: "AMG GT S",
    price: 78900, miles: 41200, distanceMiles: 33.0,
    city: "Alpharetta", state: "GA",
    photo_url: photo("spotr-feed-0007"), vdp_url: "https://example.com/spotr-fixtures/0007",
    createdAt: daysAgo(58),
  },
  {
    vin: "SPOTR-FEED-0008",
    listingTitle: "2022 Porsche Taycan Turbo",
    year: 2022, make: "Porsche", model: "Taycan Turbo", trim: "Turbo",
    price: 112000, miles: 12700, distanceMiles: 15.8,
    city: "Sandy Springs", state: "GA",
    photo_url: photo("spotr-feed-0008"), vdp_url: "https://example.com/spotr-fixtures/0008",
    createdAt: daysAgo(0),
  },
  {
    // Sparse row: many gaps, low confidence expected.
    vin: "SPOTR-FEED-0009",
    listingTitle: "Rolls-Royce Ghost (year unlisted)",
    year: null, make: "Rolls-Royce", model: "Ghost",
    price: 148000, miles: null, distanceMiles: null,
    city: null, state: null,
    photo_url: null, vdp_url: "https://example.com/spotr-fixtures/0009",
    createdAt: daysAgo(21),
  },
  {
    vin: "SPOTR-FEED-0010",
    listingTitle: "2013 Ferrari 458 Italia",
    year: 2013, make: "Ferrari", model: "458 Italia",
    price: 214900, miles: 15900, distanceMiles: 52.7,
    city: "Athens", state: "GA",
    photo_url: photo("spotr-feed-0010"), vdp_url: "https://example.com/spotr-fixtures/0010",
    createdAt: daysAgo(3),
  },
  {
    vin: "SPOTR-FEED-0011",
    listingTitle: "2019 Lamborghini Urus",
    year: 2019, make: "Lamborghini", model: "Urus",
    price: 219000, miles: 28400, distanceMiles: 22.3,
    city: "Decatur", state: "GA",
    photo_url: photo("spotr-feed-0011"), vdp_url: "https://example.com/spotr-fixtures/0011",
    createdAt: daysAgo(15),
  },
  {
    vin: "SPOTR-FEED-0012",
    listingTitle: "2018 BMW M5 Competition",
    year: 2018, make: "BMW", model: "M5", trim: "Competition",
    price: 54900, miles: 47600, distanceMiles: 9.4,
    city: "Lawrenceville", state: "GA",
    photo_url: photo("spotr-feed-0012"), vdp_url: "https://example.com/spotr-fixtures/0012",
    createdAt: daysAgo(7),
  },
  {
    // Title-branded car: exercises buy-box excluded-keyword hard exclusion
    // once the user adds e.g. "rebuilt title" to their exclusions.
    vin: "SPOTR-FEED-0013",
    listingTitle: "2020 Audi R8 V10 — rebuilt title, priced to move",
    year: 2020, make: "Audi", model: "R8", trim: "V10",
    price: 99500, miles: 24100, distanceMiles: 18.9,
    city: "Norcross", state: "GA",
    photo_url: photo("spotr-feed-0013"), vdp_url: "https://example.com/spotr-fixtures/0013",
    createdAt: daysAgo(2),
  },
];

async function main() {
  // Defense-in-depth: never run against a production database. (Also never
  // point DATABASE_URL at prod when running this locally.)
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed synthetic fixtures with NODE_ENV=production.");
    process.exit(1);
  }

  const removed = await prisma.lead.deleteMany({
    where: { vin: { startsWith: "SPOTR-FEED-" } },
  });

  for (const fixture of FIXTURES) {
    await prisma.lead.create({
      data: {
        ...fixture,
        source: "Synthetic fixture",
        sellerName: "Fixture Seller",
        stage: "New Leads",
        searchZip: "30043",
        searchRadius: 100,
      },
    });
  }

  console.log(
    `Replaced ${removed.count} existing fixture leads with ${FIXTURES.length} synthetic SPOTR-FEED- fixtures.`
  );
  console.log("These are development-only rows; production API responses always exclude them.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
