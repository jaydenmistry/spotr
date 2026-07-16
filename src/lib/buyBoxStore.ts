// Server-side buy-box persistence. Reads are strictly read-only: when no row
// exists we return in-memory defaults — a row is only ever created by an
// explicit PUT /api/buybox save.
import { prisma } from "@/lib/db/prisma";
import {
  BUY_BOX_ID,
  DEFAULT_BUY_BOX,
  parseKeywords,
  parseMakeRules,
  type BuyBoxConfig,
} from "./buyBox";

export interface LoadedBuyBox {
  config: BuyBoxConfig;
  persisted: boolean;
  updatedAt: string | null;
}

export async function loadBuyBoxConfig(): Promise<LoadedBuyBox> {
  const row = await prisma.buyBox.findUnique({ where: { id: BUY_BOX_ID } });
  if (!row) {
    return { config: DEFAULT_BUY_BOX, persisted: false, updatedAt: null };
  }

  return {
    config: {
      yearMin: row.yearMin,
      yearMax: row.yearMax,
      maxMileage: row.maxMileage,
      acquisitionMin: row.acquisitionMin,
      acquisitionMax: row.acquisitionMax,
      targetRetailMin: row.targetRetailMin,
      targetRetailMax: row.targetRetailMax,
      targetMinGross: row.targetMinGross,
      radiusMiles: row.radiusMiles,
      makeRules: parseMakeRules(row.makeRules),
      excludedKeywords: parseKeywords(row.excludedKeywords),
    },
    persisted: true,
    updatedAt: row.updatedAt.toISOString(),
  };
}
