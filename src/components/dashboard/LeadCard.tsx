"use client";

import { MapPin, Calendar, Gauge } from "lucide-react";
import Image from "next/image";

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
}

export default function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="mb-3 cursor-pointer overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-blue-400"
    >
      <div className="relative h-32 w-full bg-gray-100">
        <Image
          src={lead.photo_url || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80"}
          alt={`${lead.year} ${lead.make} ${lead.model}`}
          fill
          className="object-cover"
        />
        <div className="absolute top-2 right-2 rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-900 shadow">
          {lead.price ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(lead.price) : "TBD"}
        </div>
      </div>

      <div className="p-3">
        <h4 className="font-semibold text-gray-900 line-clamp-1">
          {lead.year} {lead.make} {lead.model}
        </h4>

        <div className="mt-2 space-y-1 text-xs text-gray-600">
          <div className="flex items-center">
            <Gauge className="mr-1 h-3 w-3 text-gray-400" />
            <span>{lead.miles ? new Intl.NumberFormat("en-US").format(lead.miles) : "Unknown"} miles</span>
          </div>
          <div className="flex items-center">
            <MapPin className="mr-1 h-3 w-3 text-gray-400" />
            <span>{lead.city}, {lead.state}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
