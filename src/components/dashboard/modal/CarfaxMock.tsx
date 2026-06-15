"use client";

import { ExternalLink, FileText } from "lucide-react";

export default function CarfaxMock({ vdpUrl, source }: { vdpUrl: string | null, source: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-16 px-4 text-center">
      <div className="mb-4 rounded-full bg-blue-100 p-4">
        <FileText className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-gray-900">Vehicle History Report</h3>
      <p className="mb-6 max-w-md text-sm text-gray-500">
        To view the detailed history report, including accidents, service records, and title information, please visit the original listing page on {source || "the dealership's website"}.
      </p>

      {vdpUrl && vdpUrl !== "#" ? (
        <a
          href={vdpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          View Full Report <ExternalLink className="ml-2 h-4 w-4" />
        </a>
      ) : (
        <button
          disabled
          className="flex items-center rounded-md bg-gray-300 px-6 py-3 text-sm font-medium text-gray-500 cursor-not-allowed"
        >
          Listing Link Unavailable
        </button>
      )}
    </div>
  );
}
