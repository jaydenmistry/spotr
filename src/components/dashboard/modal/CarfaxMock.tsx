"use client";

import { ExternalLink, FileSearch } from "lucide-react";
import { isSafeHttpUrl } from "@/lib/url";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Placeholder for vehicle history until a licensed history provider is
 * connected. Spotr holds no accident, service, or title data — the copy must
 * say so rather than imply a report exists behind the link.
 */
export default function CarfaxMock({
  vdpUrl,
  source,
}: {
  vdpUrl: string | null;
  source: string | null;
}) {
  return (
    <EmptyState
      icon={FileSearch}
      title="No vehicle history in Spotr yet"
      body={
        <>
          Spotr doesn&apos;t have accident, service, or title data for this vehicle. Check them on the original listing
          {source ? ` (${source})` : ""} or with a history report provider before you make an offer.
        </>
      }
      action={
        isSafeHttpUrl(vdpUrl) ? (
          <a href={vdpUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary pressable">
            Open original listing <ExternalLink style={{ width: 15, height: 15 }} />
          </a>
        ) : (
          <p className="t-footnote" style={{ color: "var(--label-secondary)" }}>
            No listing link is available for this vehicle.
          </p>
        )
      }
    />
  );
}
