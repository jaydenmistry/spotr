import type { Prisma } from "@prisma/client";

// Excludes legacy demo rows (fixture VINs, unsplash photos) and listings
// without a real VDP link/photo. Shared by the lead list and feed endpoints.
export const VERIFIED_LISTING_FILTER: Prisma.LeadWhereInput = {
  AND: [
    { vdp_url: { not: null } },
    { vdp_url: { not: "#" } },
    { photo_url: { not: null } },
    { NOT: [{ vin: { startsWith: "SPOTR-" } }, { vin: { startsWith: "LIVE-" } }] },
    { NOT: { photo_url: { contains: "images.unsplash.com" } } },
  ],
};

// Labeled synthetic fixtures (scripts/seed-feed-fixtures.mjs) are only ever
// visible in development; production always applies the verified filter alone.
export function feedListingFilter(includeFixtures: boolean): Prisma.LeadWhereInput {
  return includeFixtures && process.env.NODE_ENV !== "production"
    ? { OR: [VERIFIED_LISTING_FILTER, { vin: { startsWith: "SPOTR-FEED-" } }] }
    : VERIFIED_LISTING_FILTER;
}
