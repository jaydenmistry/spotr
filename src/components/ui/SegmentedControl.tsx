"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { spring } from "@/lib/motion";

export interface Segment<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Accessible name when `label` isn't plain text. */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** "tabs" gives tab semantics (for switching views); "radio" for a setting. */
  role?: "tabs" | "radio";
  size?: "sm" | "md";
}

/**
 * Apple's segmented control: the selected thumb is one physical object that
 * springs between segments rather than each segment lighting up separately.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  ariaLabel,
  role = "radio",
  size = "md",
}: SegmentedControlProps<T>) {
  const id = useId();
  const height = size === "sm" ? 30 : 34;
  const isTabs = role === "tabs";

  return (
    <div
      role={isTabs ? "tablist" : "radiogroup"}
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        padding: 3,
        gap: 2,
        borderRadius: 999,
        background: "rgba(var(--ink-rgb), 0.07)",
        boxShadow: "inset 0 0 0 1px var(--separator)",
      }}
    >
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role={isTabs ? "tab" : "radio"}
            aria-selected={isTabs ? selected : undefined}
            aria-checked={isTabs ? undefined : selected}
            aria-label={segment.ariaLabel}
            onClick={() => onChange(segment.value)}
            className={selected ? "pressable" : "pressable hover-label"}
            style={{
              position: "relative",
              height: height - 6,
              padding: size === "sm" ? "0 11px" : "0 14px",
              borderRadius: 999,
              border: "none",
              background: "transparent",
              color: selected ? "var(--label)" : "var(--label-secondary)",
              fontSize: size === "sm" ? 12 : 13,
              fontWeight: selected ? 600 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {selected && (
              <motion.span
                layoutId={`${id}-thumb`}
                transition={spring.snappy}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  background: "var(--bg-elevated)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(var(--ink-rgb), 0.08)",
                }}
              />
            )}
            <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6 }}>{segment.label}</span>
          </button>
        );
      })}
    </div>
  );
}
