"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import TopStats from "@/components/dashboard/TopStats";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import LeadModal from "@/components/dashboard/modal/LeadModal";
import { Database, MapPin, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import {
  EXOTIC_MAKES,
  filterLeads,
  getMakeFilterList,
  MAKE_FILTER_OPTIONS,
  type LeadRecord,
  type MovementFilter,
} from "@/lib/vehicleAnalytics";

interface FetchResponse {
  success: boolean;
  message: string;
  count: number;
  requested: number;
  returned: number;
  zipCode: string;
  radiusMiles: number;
  makes: string[];
  source: string;
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingLeads, setFetchingLeads] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [makeFilter, setMakeFilter] = useState("All Exotics");
  const [minPrice, setMinPrice] = useState("75000");
  const [maxPrice, setMaxPrice] = useState("");
  const [zipCode, setZipCode] = useState("30043");
  const [radiusMiles, setRadiusMiles] = useState(100);
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("All");
  const [fetchLimit, setFetchLimit] = useState(1000);
  const [fetchMessage, setFetchMessage] = useState("");

  const fetchLocalLeads = async () => {
    try {
      const res = await axios.get<LeadRecord[]>("/api/leads");
      setLeads(res.data);
    } catch (error) {
      console.error("Failed to load leads", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadLeads = async () => {
      try {
        const res = await axios.get<LeadRecord[]>("/api/leads");
        if (isActive) {
          setLeads(res.data);
        }
      } catch (error) {
        console.error("Failed to load leads", error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadLeads();

    return () => {
      isActive = false;
    };
  }, []);

  const handleFindNewLeads = async () => {
    setFetchingLeads(true);
    setFetchMessage("");
    try {
      const makes = getMakeFilterList(makeFilter).length > 0 ? getMakeFilterList(makeFilter) : EXOTIC_MAKES;
      const response = await axios.post<FetchResponse>("/api/leads/fetch", {
        limit: fetchLimit,
        makes,
        minPrice: Number(minPrice) || undefined,
        maxPrice: Number(maxPrice) || undefined,
        zipCode,
        radiusMiles,
      });
      setFetchMessage(`${response.data.message} from ${response.data.source} near ${response.data.zipCode} within ${response.data.radiusMiles} mi.`);
      await fetchLocalLeads(); // Refresh the board
    } catch (error) {
      console.error("Failed to fetch new leads from API", error);
      alert("Failed to fetch leads. Please try again.");
    } finally {
      setFetchingLeads(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return filterLeads(leads, {
      searchTerm,
      makeFilter,
      minPrice,
      maxPrice,
      maxDistance: radiusMiles.toString(),
      movementFilter,
    });
  }, [leads, searchTerm, makeFilter, minPrice, maxPrice, radiusMiles, movementFilter]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage private party acquisition leads with exotic make and value movement filters.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
            <MapPin className="h-4 w-4 text-orange-600" />
            ZIP
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className="w-20 rounded border border-gray-200 px-2 py-1 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="30043"
            />
          </label>
          <label className="flex items-center gap-2 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
            Radius
            <input
              type="number"
              min={10}
              max={100}
              step={10}
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Math.max(10, Math.min(100, Number(e.target.value) || 100)))}
              className="w-16 rounded border border-gray-200 px-2 py-1 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            mi
          </label>
          <label className="flex items-center gap-2 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
            <Database className="h-4 w-4 text-orange-600" />
            Pull
            <input
              type="number"
              min={100}
              max={1500}
              step={100}
              value={fetchLimit}
              onChange={(e) => setFetchLimit(Math.max(100, Math.min(1500, Number(e.target.value) || 1000)))}
              className="w-20 rounded border border-gray-200 px-2 py-1 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </label>
          <button
            onClick={handleFindNewLeads}
            disabled={fetchingLeads}
            className="flex items-center justify-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
          >
            {fetchingLeads ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Pull Exotic Listings
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
          <SlidersHorizontal className="h-4 w-4 text-orange-600" />
          Acquisition Filters
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_0.8fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Search Lamborghini, Lambo, Ferrari, Porsche, VIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={makeFilter}
            onChange={(e) => setMakeFilter(e.target.value)}
            className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            {MAKE_FILTER_OPTIONS.map((make) => (
              <option key={make} value={make}>{make}</option>
            ))}
          </select>
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
            value={radiusMiles}
            min={10}
            max={100}
            onChange={(e) => setRadiusMiles(Math.max(10, Math.min(100, Number(e.target.value) || 100)))}
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
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold text-gray-900">{filteredLeads.length}</span>
          <span>of {leads.length} listings shown</span>
          <span className="hidden h-1 w-1 rounded-full bg-gray-300 sm:inline-block" />
          <span>Pulling from ZIP {zipCode || "30043"} within {radiusMiles} miles. Provider max is 100 miles.</span>
        </div>
        {fetchMessage && (
          <div className="mt-3 rounded-md bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">
            {fetchMessage}
          </div>
        )}
      </div>

      <TopStats leads={filteredLeads} />

      <KanbanBoard
        leads={filteredLeads}
        onLeadClick={(lead) => setSelectedLead(lead)}
        onLeadUpdate={(updatedLeads) => {
          const updatedById = new Map(updatedLeads.map((lead) => [lead.id, lead]));
          setLeads((currentLeads) => currentLeads.map((lead) => updatedById.get(lead.id) || lead));
        }}
      />

      {selectedLead && (
        <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
