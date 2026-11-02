"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useDialogFocus } from "@/components/ui/useDialogFocus";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { spring } from "@/lib/motion";
import { X } from "lucide-react";
import { NOTE_MAX_LENGTH, OUTCOME_REASONS, type OutcomeReasonCode } from "@/lib/followUp";

const subscribeNoop = () => () => {};


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
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelRef, onCancel, selectRef);

  if (!mounted) return null;

  // Portaled so it always sits above the dossier sheet. Alert-style entrance:
  // the panel settles down from slightly larger while the scrim fades in.
  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--scrim)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding: 20,
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring.smooth}
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--separator)",
          background: "var(--bg-elevated)",
          boxShadow: "var(--shadow-lg)",
          outline: "none",
          padding: "22px 22px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <h3 className="t-headline" style={{ color: "var(--label)", marginBottom: 4 }}>{title}</h3>
            <p className="t-footnote" style={{ color: "var(--label-secondary)" }}>{description}</p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="pressable hover-fill"
            style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 999, border: "none", background: "var(--fill)", cursor: "pointer", color: "var(--label-secondary)", flexShrink: 0 }}
          >
            <X style={{ width: 15, height: 15 }} aria-hidden="true" />
          </button>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--label-secondary)" }}>
          Reason
          <select
            ref={selectRef}
            value={reason}
            onChange={(event) => setReason(event.target.value as OutcomeReasonCode | "")}
            className="field"
            style={{ color: reason ? "var(--label)" : "var(--label-secondary)", fontWeight: 500 }}
          >
            <option value="" disabled>
              Select a reason…
            </option>
            {OUTCOME_REASONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--label-secondary)" }}>
          Note (optional — internal; don&apos;t include seller contact info)
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, NOTE_MAX_LENGTH))}
            rows={3}
            placeholder="Anything worth remembering about this decision…"
            className="field"
            style={{ height: "auto", padding: "9px 12px", resize: "vertical", fontWeight: 400 }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-secondary pressable">
            Cancel
          </button>
          <button
            onClick={() => {
              if (reason) onConfirm(reason, note.trim() ? note.trim() : null);
            }}
            type="button"
            disabled={busy || !reason}
            className="btn btn-destructive pressable"
          >
            {busy ? "Saving…" : confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
