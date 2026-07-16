// Marketcheck listing shapes and the single approved mapping from a provider
// listing to a Lead row. Lead.trim must only ever be populated here (or by the
// labeled fixture seed script) — enforced by a test in marketcheck.test.ts.
import type { Prisma } from "@prisma/client";

export interface MarketcheckListing {
  vin?: string;
  heading?: string;
  dist?: number;
  distance?: number;
  price?: number;
  miles?: number;
  source?: string;
  vdp_url?: string;
  build?: {
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
  };
  dealer?: {
    city?: string;
    state?: string;
    name?: string;
    website?: string;
    distance?: number;
  };
  media?: {
    photo_links?: string[];
  };
}

export function getListingDistance(listing: MarketcheckListing) {
  const distance = listing.dist ?? listing.distance ?? listing.dealer?.distance;
  return typeof distance === "number" && Number.isFinite(distance) ? Number(distance.toFixed(1)) : null;
}

export function mapMarketcheckListing(
  listing: MarketcheckListing,
  searchZip: string,
  searchRadius: number
): Prisma.LeadCreateManyInput {
  return {
    vin: listing.vin || null,
    listingTitle: listing.heading || null,
    year: listing.build?.year || null,
    make: listing.build?.make || "Unknown Make",
    model: listing.build?.model || listing.heading || "Unknown Model",
    trim: listing.build?.trim || null,
    price: listing.price || 0,
    miles: listing.miles || 0,
    distanceMiles: getListingDistance(listing),
    searchZip,
    searchRadius,
    city: listing.dealer?.city || null,
    state: listing.dealer?.state || null,
    source: listing.source || listing.dealer?.website || "Marketcheck",
    vdp_url: listing.vdp_url || null,
    photo_url: listing.media?.photo_links?.[0] || null,
    sellerName: listing.dealer?.name || "Listing Seller",
    stage: "New Leads",
  };
}
