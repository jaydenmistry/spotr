"use client";

import { useState } from "react";
import axios from "axios";
import { DollarSign } from "lucide-react";
import { NOTE_MAX_LENGTH, OFFER_MAX_USD } from "@/lib/followUp";

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "#f0f4ff",
  width: "100%",
  boxSizing: "border-box",
};

/**
 * Records the buyer's ACTUAL offer as a timeline event. Deliberately separate
 * from Spotr's recommended max offer (a heuristic planning number) — the two
 * must never be conflated in storage or UI.
 */
export default function RecordOfferForm({
  leadId,
  recommendedMaxOfferLabel,
  onRecorded,
}: {
  leadId: string;
  // Preformatted display string for Spotr's heuristic max offer, if available.
  recommendedMaxOfferLabel: string | null;
  onRecorded: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  const parsedAmount = Number(amount);
  const amountValid = Number.isInteger(parsedAmount) && parsedAmount > 0 && parsedAmount <= OFFER_MAX_USD;

  const submit = async () => {
    if (!amountValid) return;
    setBusy(true);
    setError(null);
    try {
      await axios.post("/api/leads/followup", {
        leadId,
        op: "record-offer",
        amountUsd: parsedAmount,
        note: note.trim() ? note.trim() : undefined,
      });
      setSavedLabel(`Offer of $${parsedAmount.toLocaleString("en-US")} recorded`);
      setAmount("");
      setNote("");
      onRecorded();
    } catch (err) {
      console.error("Failed to record offer", err);
      setError(
        axios.isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Couldn't record the offer. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(8,12,20,0.5)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 800, color: "#8b9ab8", textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <DollarSign style={{ width: 14, height: 14 }} aria-hidden="true" />
        Record your offer
      </p>
      <p style={{ fontSize: 11, color: "#8b9ab8" }}>
        This logs the offer you actually made to the seller.
        {recommendedMaxOfferLabel
          ? ` Spotr's heuristic max offer (${recommendedMaxOfferLabel}) is a separate planning estimate, not a record of this offer.`
          : " It is separate from Spotr's heuristic planning estimates."}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#8b9ab8", flex: "0 1 160px" }}>
          Amount (USD)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={OFFER_MAX_USD}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="e.g. 92500"
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#8b9ab8", flex: "1 1 200px" }}>
          Note (optional — no seller contact info)
          <input
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, NOTE_MAX_LENGTH))}
            placeholder="Contingent on inspection…"
            style={inputStyle}
          />
        </label>
      </div>

      {amount && !amountValid && (
        <p style={{ fontSize: 12, color: "#fbbf24" }}>
          Whole dollars only, between $1 and ${OFFER_MAX_USD.toLocaleString("en-US")}.
        </p>
      )}
      {error && <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>}
      {savedLabel && !error && <p style={{ fontSize: 12, color: "#34d399" }}>{savedLabel}</p>}

      <button
        disabled={busy || !amountValid}
        onClick={() => void submit()}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          cursor: busy || !amountValid ? "default" : "pointer",
          border: "1px solid rgba(52,211,153,0.4)",
          background: "rgba(52,211,153,0.1)",
          color: "#34d399",
          opacity: busy || !amountValid ? 0.5 : 1,
        }}
      >
        {busy ? "Recording…" : "Record offer"}
      </button>
    </div>
  );
}
