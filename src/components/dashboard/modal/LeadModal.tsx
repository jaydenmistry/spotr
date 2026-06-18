"use client";

import { useState } from "react";
import { ExternalLink, Gauge, Hash, MapPin, ShieldCheck, Target, TrendingDown, TrendingUp, X } from "lucide-react";
import Image from "next/image";
import ChatMock from "./ChatMock";
import CarfaxMock from "./CarfaxMock";
import ValueTrendGraph from "../ValueTrendGraph";
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
  vin: string | null;
  source: string | null;
  vdp_url: string | null;
  sellerName: string | null;
}

export default function LeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"details" | "chat" | "carfax">("details");
  const analytics = getVehicleAnalytics(lead);
  const isAppreciating = analytics.movement === "Appreciating";
  const verified = isVerifiedListing(lead);
  const TrendIcon = isAppreciating ? TrendingUp : TrendingDown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {getVehicleTitle(lead)}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {(["details", "chat", "carfax"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white p-6">
          {activeTab === "details" && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="relative h-64 overflow-hidden rounded-lg bg-gray-200">
                {lead.photo_url ? (
                  <Image
                    src={lead.photo_url}
                    alt={getVehicleTitle(lead)}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-orange-50 text-sm font-semibold text-orange-700">
                    No photo provided by listing source
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-100">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Vehicle Info</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Listing title</span>
                      <span className="text-right font-medium text-gray-900">{getVehicleTitle(lead)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 flex items-center"><Hash className="h-4 w-4 mr-2" /> VIN</span>
                      <span className="font-medium text-gray-900">{lead.vin || "Not supplied"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 flex items-center"><Gauge className="h-4 w-4 mr-2" /> Mileage</span>
                      <span className="font-medium text-gray-900">
                        {lead.miles ? new Intl.NumberFormat("en-US").format(lead.miles) : "Unknown"} mi
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 flex items-center"><MapPin className="h-4 w-4 mr-2" /> Location</span>
                      <span className="font-medium text-gray-900">{lead.city}, {lead.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Distance</span>
                      <span className="font-medium text-gray-900">{formatDistance(lead.distanceMiles)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Search area</span>
                      <span className="font-medium text-gray-900">
                        {lead.searchZip || "Unknown"} · {lead.searchRadius || "?"} mi
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-100">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Listing Info</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Verification</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                        verified ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                      }`}>
                        <ShieldCheck className="h-3 w-3" />
                        {verified ? "Live link + VIN" : "Needs source check"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Asking Price</span>
                      <span className="text-lg font-bold text-orange-600">
                        {formatCurrency(lead.price)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Seller</span>
                      <span className="font-medium text-gray-900">{lead.sellerName || "Private Party"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Source</span>
                      <span className="font-medium text-gray-900">{lead.source || "Unknown"}</span>
                    </div>
                    {lead.vdp_url && lead.vdp_url !== "#" && (
                      <div className="pt-2">
                        <a
                          href={lead.vdp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-orange-600 hover:underline"
                        >
                          View Original Listing <ExternalLink className="ml-1 h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 rounded-lg bg-white p-5 shadow-sm border border-orange-100">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <Target className="h-5 w-5 text-orange-600" />
                      Listing Analyzer
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Mileage-adjusted fair value, deal score, recent comp count, and value signal.
                    </p>
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${
                    isAppreciating ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                  }`}>
                    <TrendIcon className="h-4 w-4" />
                    {analytics.movement}
                  </div>
                </div>

                <div className="mb-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-medium text-gray-500">Asking price</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(lead.price)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-medium text-gray-500">Mileage</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {lead.miles ? `${new Intl.NumberFormat("en-US").format(lead.miles)} mi` : "Unknown"}
                    </p>
                  </div>
                </div>

                <div className={`mb-5 rounded-lg border p-4 ${
                  analytics.dealScore === "Great deal" ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
                }`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className={`text-xl font-bold ${
                        analytics.dealScore === "Great deal" ? "text-green-700" : "text-orange-700"
                      }`}>
                        {analytics.dealScore}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {formatSignedCurrency(analytics.fairValueSpread)} vs mileage-adjusted fair value
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Fair value</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.estimatedMarketValue)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Judged against {analytics.compCount} recent comparable sales · downside risk: {analytics.downsideRisk}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-lg border border-slate-100 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{analytics.signalLabel}</p>
                        <p className="text-xs text-gray-500">Value signal · {analytics.confidence}% confidence</p>
                      </div>
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                        {analytics.signalAction}
                      </span>
                    </div>
                    <ValueTrendGraph points={analytics.graphPoints} movement={analytics.movement} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500">Est. Market</p>
                      <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(analytics.estimatedMarketValue)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500">12-mo Move</p>
                      <p className={`mt-1 text-xl font-bold ${isAppreciating ? "text-green-700" : "text-orange-700"}`}>
                        {formatSignedCurrency(analytics.projectedChangeDollars)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500">Trend %</p>
                      <p className={`mt-1 text-xl font-bold ${isAppreciating ? "text-green-700" : "text-orange-700"}`}>
                        {formatSignedPercent(analytics.projectedChangePercent)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500">Best Month</p>
                      <p className="mt-1 text-xl font-bold text-gray-900">{analytics.bestMonth}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "chat" && <ChatMock leadId={lead.id} sellerName={lead.sellerName} />}

          {activeTab === "carfax" && <CarfaxMock vdpUrl={lead.vdp_url} source={lead.source} />}
        </div>
      </div>
    </div>
  );
}
