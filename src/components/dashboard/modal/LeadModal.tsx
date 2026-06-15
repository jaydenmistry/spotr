"use client";

import { useState } from "react";
import { X, ExternalLink, MapPin, Gauge, Hash } from "lucide-react";
import Image from "next/image";
import ChatMock from "./ChatMock";
import CarfaxMock from "./CarfaxMock";

interface Lead {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  price: number | null;
  miles: number | null;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {lead.year} {lead.make} {lead.model}
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
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {activeTab === "details" && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="relative h-64 overflow-hidden rounded-lg bg-gray-200">
                <Image
                  src={lead.photo_url || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80"}
                  alt="Vehicle"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-6">
                <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-100">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Vehicle Info</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 flex items-center"><Hash className="h-4 w-4 mr-2" /> VIN</span>
                      <span className="font-medium text-gray-900">{lead.vin || "N/A"}</span>
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
                  </div>
                </div>

                <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-100">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Listing Info</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Asking Price</span>
                      <span className="text-lg font-bold text-green-600">
                        {lead.price ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(lead.price) : "TBD"}
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
                          className="flex items-center text-blue-600 hover:underline"
                        >
                          View Original Listing <ExternalLink className="ml-1 h-4 w-4" />
                        </a>
                      </div>
                    )}
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
