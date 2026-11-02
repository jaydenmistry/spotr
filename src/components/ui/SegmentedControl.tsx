"use client";

import { useId, useRef } from "react";
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
  /** Tabs only: buttons get id `${idPrefix}-${value}` and control `${idPrefix}-panel`. */
  idPrefix?: string;
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
  idPrefix,
}: SegmentedControlProps<T>) {
  const id = useId();
  const height = size === "sm" ? 30 : 34;
  const isTabs = role === "tabs";
  // If nothing matches the value, the first segment keeps the tab stop.
  const hasSelection = segments.some((segment) => segment.value === value);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Roving focus: one tab stop for the whole control; arrows/Home/End move
  // the selection (automatic activation, like native tabs and radios).
  const onKeyDown = (event: React.KeyboardEvent) => {
    const current = segments.findIndex((segment) => segment.value === value);
    const last = segments.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? (current + 1) % segments.length
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? (current - 1 + segments.length) % segments.length
        : event.key === "Home"
        ? 0
        : event.key === "End"
        ? last
        : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(segments[next].value);
    buttonsRef.current[next]?.focus();
  };

  return (
    <div
      role={isTabs ? "tablist" : "radiogroup"}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={{
        display: "inline-flex",
        padding: 3,
        gap: 2,
        borderRadius: 999,
        background: "rgba(var(--ink-rgb), 0.07)",
        boxShadow: "inset 0 0 0 1px var(--separator)",
      }}
    >
      {segments.map((segment, index) => {
        const selected = segment.value === value;
        return (
          <button
            key={segment.value}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            type="button"
            tabIndex={selected || (!hasSelection && index === 0) ? 0 : -1}
            id={isTabs && idPrefix ? `${idPrefix}-${segment.value}` : undefined}
            aria-controls={isTabs && idPrefix ? `${idPrefix}-panel` : undefined}
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
