"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { NOTE_MAX_LENGTH, OUTCOME_REASONS, type OutcomeReasonCode } from "@/lib/followUp";

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#f0f4ff",
};

/**
 * Modal prompt for the standardized outcome reason required when a lead is
 * Passed (feed/dossier) or marked Lost (kanban). Shared so the reason
 * taxonomy and UX stay identical across all three flows.
 */
export default function OutcomeReasonDialog({
  title,
  description,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: (reason: OutcomeReasonCode, note: string | null) => void;
  onCancel: () => void;
}) {
  // Starts unselected on purpose: the buyer must actively choose a reason —
  // a pre-selected default would silently mislabel Pass/Lost history.
  const [reason, setReason] = useState<OutcomeReasonCode | "">("");
  const [note, setNote] = useState("");
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    selectRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(4,7,12,0.7)",
        backdropFilter: "blur(4px)",
        padding: 20,
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "var(--bg-card)",
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#f0f4ff", marginBottom: 4 }}>{title}</h3>
            <p style={{ fontSize: 12, color: "#8b9ab8" }}>{description}</p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            style={{ ...buttonStyle, padding: 6, color: "#8b9ab8" }}
          >
            <X style={{ width: 15, height: 15 }} aria-hidden="true" />
          </button>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#8b9ab8" }}>
          Reason
          <select
            ref={selectRef}
            value={reason}
            onChange={(event) => setReason(event.target.value as OutcomeReasonCode | "")}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 13,
              color: reason ? "#f0f4ff" : "#8b9ab8",
              fontWeight: 600,
            }}
          >
            <option value="" disabled style={{ background: "#131926" }}>
              Select a reason…
            </option>
            {OUTCOME_REASONS.map((option) => (
              <option key={option.code} value={option.code} style={{ background: "#131926" }}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#8b9ab8" }}>
          Note (optional — internal; don&apos;t include seller contact info)
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, NOTE_MAX_LENGTH))}
            rows={3}
            placeholder="Anything worth remembering about this decision…"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 13,
              color: "#f0f4ff",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onCancel} disabled={busy} style={{ ...buttonStyle, color: "#8b9ab8" }}>
            Cancel
          </button>
          <button
            onClick={() => {
              if (reason) onConfirm(reason, note.trim() ? note.trim() : null);
            }}
            disabled={busy || !reason}
            style={{
              ...buttonStyle,
              background: "rgba(248,113,113,0.12)",
              borderColor: "rgba(248,113,113,0.45)",
              color: "#f87171",
              cursor: busy || !reason ? "not-allowed" : "pointer",
              opacity: busy || !reason ? 0.5 : 1,
            }}
          >
            {busy ? "Saving…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
