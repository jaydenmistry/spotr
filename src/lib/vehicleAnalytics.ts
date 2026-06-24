export type MovementFilter = "All" | "Appreciating" | "Depreciating";

export type LeadSortOrder =
  | "Newest Added"
  | "Distance (Nearest)"
  | "Price (Low to High)"
  | "Price (High to Low)"
  | "Year (Newest First)"
  | "Mileage (Low to High)"
  | "Appreciation (High to Low)"
  | "Depreciation Risk";

export interface LeadRecord {
  id: string;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  listingTitle: string | null;
  price: number | null;
  miles: number | null;
  distanceMiles: number | null;
  searchZip: string | null;
  searchRadius: number | null;
  city: string | null;
  state: string | null;
  source: string | null;
  vdp_url: string | null;
  photo_url: string | null;
  stage: string;
  sellerName: string | null;
  sellerPhone?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface FilterOptions {
  searchTerm: string;
  makeFilter: string[];
  minPrice: string;
  maxPrice: string;
  maxDistance: string;
  movementFilter: MovementFilter;
}

export const EXOTIC_MAKES = [
  "Lamborghini",
  "Ferrari",
  "Porsche",
  "McLaren",
  "Aston Martin",
  "Bentley",
  "Rolls-Royce",
  "Maserati",
  "Mercedes-Benz",
  "BMW",
  "Audi",
  "Land Rover",
];

export const MAKE_FILTER_OPTIONS = ["All", "All Exotics", ...EXOTIC_MAKES];

export const SORT_OPTIONS: LeadSortOrder[] = [
  "Newest Added",
  "Distance (Nearest)",
  "Price (Low to High)",
  "Price (High to Low)",
  "Year (Newest First)",
  "Mileage (Low to High)",
  "Appreciation (High to Low)",
  "Depreciation Risk",
];

const MAKE_ALIASES: Record<string, string[]> = {
  Lamborghini: ["lambo", "lamborghini"],
  Ferrari: ["ferrari"],
  Porsche: ["porsche", "911", "gt3", "gt4"],
  McLaren: ["mclaren", "maclaren"],
  "Aston Martin": ["aston", "aston martin"],
  Bentley: ["bentley"],
  "Rolls-Royce": ["rolls", "rolls royce", "rolls-royce"],
  Maserati: ["maserati"],
  "Mercedes-Benz": ["mercedes", "benz", "amg"],
  BMW: ["bmw", "m"],
  Audi: ["audi", "rs"],
  "Land Rover": ["land rover", "range rover"],
};

const MAKE_TREND_BASE: Record<string, number> = {
  Ferrari: 0.065,
  Lamborghini: 0.045,
  Porsche: 0.035,
  McLaren: 0.015,
  "Aston Martin": 0.005,
  Bentley: -0.035,
  "Rolls-Royce": -0.025,
  Maserati: -0.055,
  "Mercedes-Benz": -0.035,
  BMW: -0.04,
  Audi: -0.04,
  "Land Rover": -0.05,
};

const MODEL_TREND_ADJUSTMENTS: Array<[string, number]> = [
  ["gt3", 0.085],
  ["gt4", 0.055],
  ["911", 0.035],
  ["turbo", 0.025],
  ["carrera", 0.015],
  ["458", 0.1],
  ["488", 0.035],
  ["f8", 0.045],
  ["812", 0.04],
  ["roma", -0.015],
  ["sf90", -0.03],
  ["aventador", 0.06],
  ["huracan", 0.025],
  ["gallardo", 0.045],
  ["urus", -0.04],
  ["720s", 0.02],
  ["570s", 0.005],
  ["vantage", -0.015],
  ["dbs", 0.02],
  ["phantom", 0.015],
  ["ghost", -0.03],
  ["continental", -0.035],
  ["g wagon", 0.02],
  ["g-class", 0.02],
  ["amg gt", 0.005],
  ["taycan", -0.08],
  ["range rover", -0.055],
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "always",
});

export function formatCurrency(value: number | null | undefined) {
  if (!value) {
    return "TBD";
  }

  return currencyFormatter.format(value);
}

export function formatCompactCurrency(value: number | null | undefined) {
  if (!value) {
    return "TBD";
  }

  return compactCurrencyFormatter.format(value);
}

export function formatSignedCurrency(value: number) {
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}${currencyFormatter.format(Math.abs(value))}`;
}

export function formatSignedPercent(value: number) {
  return percentFormatter.format(value);
}

export function formatDistance(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Distance unknown";
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} mi away`;
}

export function getVehicleTitle(lead: Pick<LeadRecord, "year" | "make" | "model" | "listingTitle">) {
  return lead.listingTitle || [lead.year, lead.make, lead.model].filter(Boolean).join(" ") || "Untitled vehicle";
}

export function isVerifiedListing(lead: Pick<LeadRecord, "vin" | "vdp_url" | "photo_url">) {
  return Boolean(
    lead.vin &&
      !lead.vin.startsWith("SPOTR-") &&
      !lead.vin.startsWith("LIVE-") &&
      lead.vdp_url &&
      lead.vdp_url !== "#"
  );
}

export function getMakeFilterList(makeFilter: string) {
  if (makeFilter === "All Exotics") {
    return EXOTIC_MAKES;
  }

  if (makeFilter === "All") {
    return [];
  }

  return [makeFilter];
}

export function getVehicleAnalytics(lead: Pick<LeadRecord, "make" | "model" | "year" | "price" | "miles">) {
  const price = lead.price || 0;
  const make = lead.make || "";
  const model = (lead.model || "").toLowerCase();
  const age = lead.year ? Math.max(new Date().getFullYear() - lead.year, 0) : 6;
  const miles = lead.miles || 0;
  const makeBase = MAKE_TREND_BASE[make] ?? -0.045;
  const modelAdjustment = MODEL_TREND_ADJUSTMENTS.reduce((sum, [keyword, adjustment]) => {
    return model.includes(keyword) ? sum + adjustment : sum;
  }, 0);
  const ageAdjustment = age >= 7 && age <= 18 ? 0.02 : age <= 2 ? -0.025 : 0;
  const mileageAdjustment = miles > 65000 ? -0.035 : miles < 15000 ? 0.015 : 0;
  const projectedChangePercent = Math.max(
    Math.min(makeBase + modelAdjustment + ageAdjustment + mileageAdjustment, 0.18),
    -0.16
  );
  const desirabilityPremium = Math.max(Math.min(projectedChangePercent * 0.55, 0.1), -0.08);
  const estimatedMarketValue = price ? Math.round(price * (1 + desirabilityPremium)) : 0;
  const projectedChangeDollars = price ? Math.round(price * projectedChangePercent) : 0;
  const projectedTwelveMonthValue = price + projectedChangeDollars;
  const movement: "Appreciating" | "Depreciating" =
    projectedChangeDollars >= 0 ? "Appreciating" : "Depreciating";
  const fairValueSpread = price ? estimatedMarketValue - price : 0;
  const fairValueSpreadPercent = price ? fairValueSpread / price : 0;
  const dealScore =
    fairValueSpreadPercent > 0.08
      ? "Great deal"
      : fairValueSpreadPercent > 0.02
      ? "Fair deal"
      : fairValueSpreadPercent < -0.05
      ? "Overpriced"
      : "Market price";
  const downsideRisk =
    projectedChangePercent >= 0.04 && fairValueSpreadPercent >= 0.03
      ? "low"
      : projectedChangePercent < -0.06 || fairValueSpreadPercent < -0.05
      ? "high"
      : "medium";
  const signalAction =
    projectedChangePercent >= 0.04 && fairValueSpreadPercent >= 0.02
      ? "BUY WATCH"
      : projectedChangePercent <= -0.05 || fairValueSpreadPercent < -0.04
      ? "SELL WATCH"
      : "HOLD";
  const signalLabel =
    projectedChangePercent >= 0.04
      ? "APPRECIATING"
      : projectedChangePercent <= -0.04
      ? "DEPRECIATING"
      : "STABLE";
  const compCount = Math.max(5, Math.min(42, Math.round(14 + Math.abs(projectedChangePercent) * 95 + (price > 180000 ? 4 : 0))));
  const bestMonth = ["January", "February", "March", "April", "May", "June"][Math.abs((lead.year || 2020) + make.length) % 6];
  const demandScore = Math.max(
    52,
    Math.min(98, Math.round(72 + projectedChangePercent * 140 + (miles < 25000 ? 7 : 0) - (age <= 2 ? 3 : 0)))
  );
  const confidence = Math.max(58, Math.min(94, Math.round(82 - Math.abs(projectedChangePercent) * 35)));
  const graphPoints = Array.from({ length: 8 }, (_, index) => {
    const progress = index / 7;
    const wave = Math.sin(index * 1.7 + (make.length % 5)) * 0.008;
    return Math.max(1, Math.round((price || 100000) * (1 + projectedChangePercent * progress + wave)));
  });

  return {
    estimatedMarketValue,
    projectedTwelveMonthValue,
    projectedChangeDollars,
    projectedChangePercent,
    fairValueSpread,
    fairValueSpreadPercent,
    dealScore,
    downsideRisk,
    signalAction,
    signalLabel,
    compCount,
    bestMonth,
    movement,
    demandScore,
    confidence,
    graphPoints,
  };
}

export function filterLeads(leads: LeadRecord[], filters: FilterOptions) {
  const searchTerm = filters.searchTerm.trim().toLowerCase();
  const minPrice = Number(filters.minPrice) || 0;
  const maxPrice = Number(filters.maxPrice) || Number.POSITIVE_INFINITY;
  const maxDistance = Number(filters.maxDistance) || Number.POSITIVE_INFINITY;
  const makes = filters.makeFilter;

  return leads.filter((lead) => {
    const make = lead.make || "";
    const model = lead.model || "";
    const searchable = `${lead.year || ""} ${make} ${model} ${lead.vin || ""}`.toLowerCase();
    const aliasMatch = Object.entries(MAKE_ALIASES).some(([makeName, aliases]) => {
      return makeName === make && aliases.some((alias) => alias.includes(searchTerm) || searchTerm.includes(alias));
    });
    const searchMatch = !searchTerm || searchable.includes(searchTerm) || aliasMatch;
    const makeMatch = makes.length === 0 || makes.includes(make);
    const price = lead.price || 0;
    const priceMatch = price >= minPrice && price <= maxPrice;
    const distanceMatch = lead.distanceMiles === null || lead.distanceMiles === undefined || lead.distanceMiles <= maxDistance;
    const analytics = getVehicleAnalytics(lead);
    const movementMatch = filters.movementFilter === "All" || analytics.movement === filters.movementFilter;

    return searchMatch && makeMatch && priceMatch && distanceMatch && movementMatch;
  });
}

export function sortLeads(leads: LeadRecord[], sortOrder: LeadSortOrder) {
  return [...leads].sort((a, b) => {
    if (sortOrder === "Distance (Nearest)") return (a.distanceMiles ?? Number.POSITIVE_INFINITY) - (b.distanceMiles ?? Number.POSITIVE_INFINITY);
    if (sortOrder === "Price (Low to High)") return (a.price || 0) - (b.price || 0);
    if (sortOrder === "Price (High to Low)") return (b.price || 0) - (a.price || 0);
    if (sortOrder === "Mileage (Low to High)") return (a.miles || 0) - (b.miles || 0);
    if (sortOrder === "Year (Newest First)") return (b.year || 0) - (a.year || 0);
    if (sortOrder === "Appreciation (High to Low)") {
      return getVehicleAnalytics(b).projectedChangeDollars - getVehicleAnalytics(a).projectedChangeDollars;
    }
    if (sortOrder === "Depreciation Risk") {
      return getVehicleAnalytics(a).projectedChangeDollars - getVehicleAnalytics(b).projectedChangeDollars;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
