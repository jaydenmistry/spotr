"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import LeadCard from "@/components/dashboard/LeadCard";
import LeadModal from "@/components/dashboard/modal/LeadModal";
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";

export default function InventoryPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [makeFilter, setMakeFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("Newest");

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await axios.get("/api/leads");
        setLeads(res.data);
      } catch (error) {
        console.error("Failed to load inventory leads", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  const uniqueMakes = useMemo(() => {
    const makes = new Set(leads.map(l => l.make).filter(Boolean));
    return ["All", ...Array.from(makes)];
  }, [leads]);

  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // Filter by Search Term (Make, Model, Year, VIN)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.make?.toLowerCase().includes(lowerTerm) ||
          l.model?.toLowerCase().includes(lowerTerm) ||
          l.year?.toString().includes(lowerTerm) ||
          l.vin?.toLowerCase().includes(lowerTerm)
      );
    }

    // Filter by Make
    if (makeFilter !== "All") {
      result = result.filter((l) => l.make === makeFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder === "Price (Low to High)") return (a.price || 0) - (b.price || 0);
      if (sortOrder === "Price (High to Low)") return (b.price || 0) - (a.price || 0);
      if (sortOrder === "Mileage (Low to High)") return (a.miles || 0) - (b.miles || 0);
      if (sortOrder === "Year (Newest First)") return (b.year || 0) - (a.year || 0);

      // Default: Newest Added to System
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [leads, searchTerm, makeFilter, sortOrder]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading inventory...</div>;
  }

  return (
    <div>
      <div className="mb-8 border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse, filter, and sort all private party vehicles in your system.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-lg bg-white p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search by make, model, year, or VIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Make Filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            <select
              value={makeFilter}
              onChange={(e) => setMakeFilter(e.target.value)}
              className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {uniqueMakes.map(make => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-500" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option>Newest Added</option>
              <option>Price (Low to High)</option>
              <option>Price (High to Low)</option>
              <option>Year (Newest First)</option>
              <option>Mileage (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-500">
        Showing <span className="font-semibold text-gray-900">{filteredAndSortedLeads.length}</span> vehicles
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
