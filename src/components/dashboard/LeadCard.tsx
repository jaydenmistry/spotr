"use client";

import { ExternalLink, Gauge, MapPin, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import Image from "next/image";
import ValueTrendGraph from "./ValueTrendGraph";
import {
  formatCurrency,
  formatDistance,
  formatSignedCurrency,
  formatSignedPercent,
  getVehicleTitle,
  getVehicleAnalytics,
  isVerifiedListing,
} from "@/lib/vehicleAnalytics";

interface Lead {
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
  photo_url: string | null;
  stage: string;
  source: string | null;
  vdp_url: string | null;
  sellerName: string | null;
  createdAt: string;
}

export default function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const analytics = getVehicleAnalytics(lead);
  const isAppreciating = analytics.movement === "Appreciating";
  const verified = isVerifiedListing(lead);
  const TrendIcon = isAppreciating ? TrendingUp : TrendingDown;

  return (
    <div
      onClick={onClick}
      className="mb-3 cursor-pointer overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-orange-400"
    >
      <div className="relative h-32 w-full bg-gray-100">
        {lead.photo_url ? (
          <Image
            src={lead.photo_url}
            alt={getVehicleTitle(lead)}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-orange-50 text-xs font-semibold text-orange-700">
            No photo from listing
          </div>
        )}
        <div className="absolute top-2 right-2 rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-900 shadow">
          {formatCurrency(lead.price)}
        </div>
        {verified && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-green-700 shadow">
            <ShieldCheck className="h-3 w-3" />
            Verified
          </div>
        )}
      </div>

      <div className="p-3">
        <h4 className="font-semibold text-gray-900 line-clamp-1">
          {getVehicleTitle(lead)}
        </h4>

        <div className="mt-2 space-y-1 text-xs text-gray-600">
          <div className="flex items-center">
            <Gauge className="mr-1 h-3 w-3 text-gray-400" />
            <span>{lead.miles ? new Intl.NumberFormat("en-US").format(lead.miles) : "Unknown"} miles</span>
          </div>
          <div className="flex items-center">
            <MapPin className="mr-1 h-3 w-3 text-gray-400" />
            <span>{formatDistance(lead.distanceMiles)}{lead.city || lead.state ? ` · ${lead.city}, ${lead.state}` : ""}</span>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-orange-100 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase text-orange-700">Listing analyzer</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              analytics.dealScore === "Great deal" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
            }`}>
              {analytics.dealScore}
            </span>
          </div>
          <div className="mb-3 rounded-md border border-green-100 bg-green-50 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">Fair value</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(analytics.estimatedMarketValue)}</span>
            </div>
            <p className={`mt-1 text-[11px] font-medium ${analytics.fairValueSpread >= 0 ? "text-green-700" : "text-orange-700"}`}>
              {formatSignedCurrency(analytics.fairValueSpread)} vs asking
            </p>
          </div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
              <TrendIcon className={`h-4 w-4 ${isAppreciating ? "text-green-600" : "text-orange-600"}`} />
              {analytics.movement}
            </div>
            <div className={`text-xs font-bold ${isAppreciating ? "text-green-700" : "text-orange-700"}`}>
              {formatSignedCurrency(analytics.projectedChangeDollars)}
            </div>
          </div>
          <ValueTrendGraph points={analytics.graphPoints} movement={analytics.movement} compact />
          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
            <span>{analytics.compCount} comps</span>
            <span>{formatSignedPercent(analytics.projectedChangePercent)}</span>
          </div>
          {lead.vdp_url && lead.vdp_url !== "#" && (
            <a
              href={lead.vdp_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="mt-3 flex items-center justify-center gap-1 rounded-md bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700"
            >
              Verify listing <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
