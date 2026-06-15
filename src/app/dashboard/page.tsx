"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import TopStats from "@/components/dashboard/TopStats";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import LeadModal from "@/components/dashboard/modal/LeadModal";
import { RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingLeads, setFetchingLeads] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  const fetchLocalLeads = async () => {
    try {
      const res = await axios.get("/api/leads");
      setLeads(res.data);
    } catch (error) {
      console.error("Failed to load leads", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocalLeads();
  }, []);

  const handleFindNewLeads = async () => {
    setFetchingLeads(true);
    try {
      await axios.post("/api/leads/fetch");
      await fetchLocalLeads(); // Refresh the board
    } catch (error) {
      console.error("Failed to fetch new leads from API", error);
      alert("Failed to fetch leads. Please try again.");
    } finally {
      setFetchingLeads(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your private party acquisition leads.
          </p>
        </div>
        <button
          onClick={handleFindNewLeads}
          disabled={fetchingLeads}
          className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {fetchingLeads ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Find New Leads
        </button>
      </div>

      <TopStats leads={leads} />

      <KanbanBoard
        leads={leads}
        onLeadClick={(lead) => setSelectedLead(lead)}
        onLeadUpdate={(updatedLeads) => setLeads(updatedLeads)}
      />

      {selectedLead && (
        <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
