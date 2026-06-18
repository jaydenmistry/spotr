"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import LeadCard from "@/components/dashboard/LeadCard";
import LeadModal from "@/components/dashboard/modal/LeadModal";
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react";
import {
  EXOTIC_MAKES,
  filterLeads,
  MAKE_FILTER_OPTIONS,
  SORT_OPTIONS,
  sortLeads,
  type LeadRecord,
  type LeadSortOrder,
  type MovementFilter,
} from "@/lib/vehicleAnalytics";

export default function InventoryPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [makeFilter, setMakeFilter] = useState("All Exotics");
  const [minPrice, setMinPrice] = useState("75000");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDistance, setMaxDistance] = useState("100");
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("All");
  const [sortOrder, setSortOrder] = useState<LeadSortOrder>("Distance (Nearest)");

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await axios.get<LeadRecord[]>("/api/leads");
        setLeads(res.data);
      } catch (error) {
        console.error("Failed to load inventory leads", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchLeads();
  }, []);

  const filteredAndSortedLeads = useMemo(() => {
    const filtered = filterLeads(leads, {
      searchTerm,
      makeFilter,
      minPrice,
      maxPrice,
      maxDistance,
      movementFilter,
    });

    return sortLeads(filtered, sortOrder);
  }, [leads, searchTerm, makeFilter, minPrice, maxPrice, maxDistance, movementFilter, sortOrder]);

  const makeCounts = useMemo(() => {
    return EXOTIC_MAKES.map((make) => ({
      make,
      count: leads.filter((lead) => lead.make === make).length,
    }));
  }, [leads]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading inventory...</div>;
  }

  return (
    <div>
      <div className="mb-8 border-b border-orange-100 pb-5">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse, filter, and sort all private party vehicles by exotic make, price, and value movement.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {makeCounts.slice(0, 8).map(({ make, count }) => (
            <button
              key={make}
              type="button"
              onClick={() => setMakeFilter(make)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                makeFilter === make
                  ? "border-orange-600 bg-orange-600 text-white"
                  : "border-orange-200 bg-orange-50 text-orange-800 hover:border-orange-400"
              }`}
            >
              {make} <span className="opacity-70">{count}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_0.75fr_0.75fr_0.75fr_1fr_1fr]">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Search Lambo, Ferrari, Porsche, VIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            <select
              value={makeFilter}
              onChange={(e) => setMakeFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {MAKE_FILTER_OPTIONS.map((make) => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>
          </div>

          <input
            type="number"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="Min price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <input
            type="number"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
          <input
            type="number"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="Max miles"
            value={maxDistance}
            min={1}
            max={100}
            onChange={(e) => setMaxDistance(e.target.value)}
          />
          <select
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value as MovementFilter)}
            className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option>All</option>
            <option>Appreciating</option>
            <option>Depreciating</option>
          </select>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-500" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as LeadSortOrder)}
              className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-500">
        Showing <span className="font-semibold text-gray-900">{filteredAndSortedLeads.length}</span> of{" "}
        <span className="font-semibold text-gray-900">{leads.length}</span> vehicles
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredAndSortedLeads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
        ))}
      </div>

      {filteredAndSortedLeads.length === 0 && (
        <div className="mt-12 text-center text-gray-500">
          No vehicles found matching your criteria.
        </div>
      )}

      {selectedLead && (
        <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
