"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/monitoring";
import { onest } from "@/lib/fonts";

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so it can't rely on globals.css — styles are inline.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    reportClientError(error);
  }, [error]);

  return (
    <html lang="en" className={onest.variable}>
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#09090c", color: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, var(--font-onest), system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Spotr hit a snag.</h1>
          <p style={{ color: "#a3a3ad", marginTop: 10 }}>Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 20, height: 40, padding: "0 20px", borderRadius: 999, border: "none", background: "#5f4bf5", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
