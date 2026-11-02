"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { reportClientError } from "@/lib/monitoring";

/** Route-level error boundary: keeps the shell, offers a retry and a way out. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    reportClientError(error);
  }, [error]);

  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "48px 16px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <EmptyState
          icon={TriangleAlert}
          tone="var(--orange)"
          title="Something went wrong"
          body={
            <>
              This page hit an unexpected error. Try again, or head back home.
              {error.digest && (
                <span className="tabular" style={{ display: "block", marginTop: 8, fontSize: 12 }}>
                  Reference: {error.digest}
                </span>
              )}
            </>
          }
          action={
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button type="button" onClick={reset} className="btn btn-primary pressable">
                <RefreshCw style={{ width: 14, height: 14 }} /> Try again
              </button>
              <Link href="/" className="btn btn-secondary pressable">Home</Link>
            </div>
          }
        />
      </div>
    </main>
  );
}
