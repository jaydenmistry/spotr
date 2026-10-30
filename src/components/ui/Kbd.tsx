"use client";

import { useSyncExternalStore } from "react";
import { paletteShortcutLabel } from "@/lib/shortcuts";

/** A row of key caps, e.g. ["⌘", "K"]. Decorative unless `label` is given. */
export function Kbd({ keys, label }: { keys: string[]; label?: string }) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}
    >
      {keys.map((key, index) => (
        <kbd key={`${key}-${index}`} className="kbd">
          {key}
        </kbd>
      ))}
    </span>
  );
}

const subscribeNoop = () => () => {};

/** ⌘K on Apple platforms, Ctrl K elsewhere; hydration-safe. */
export function usePaletteShortcutLabel() {
  return useSyncExternalStore(subscribeNoop, () => paletteShortcutLabel().join(" "), () => "⌘ K").split(" ");
}
