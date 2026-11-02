"use client";

import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { spring } from "@/lib/motion";

/**
 * A two-position switch. The thumb springs across; the icon inside rotates
 * out as the next one rotates in. The new theme reveals from the thumb.
 */
export function ThemeToggle({ label = true }: { label?: boolean }) {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isLight}
      aria-label="Dark mode"
      className="pressable hover-fill"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTheme(isLight ? "dark" : "light", { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        width: "100%",
        padding: "8px 10px",
        borderRadius: "var(--radius-sm)",
        border: "none",
        background: "transparent",
        color: "var(--label-secondary)",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {label && <span>Dark mode</span>}
      <span
        style={{
          position: "relative",
          width: 44,
          height: 26,
          borderRadius: 999,
          background: isLight ? "rgba(var(--ink-rgb), 0.16)" : "var(--tint-strong)",
          transition: "background-color 240ms ease",
          flexShrink: 0,
        }}
      >
        <motion.span
          layout
          transition={spring.bouncy}
          style={{
            position: "absolute",
            top: 2,
            left: isLight ? 2 : 20,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            display: "grid",
            placeItems: "center",
            color: isLight ? "#a15c00" : "#3a3a8c",
            overflow: "hidden",
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
              transition={spring.snappy}
              style={{ display: "grid", placeItems: "center" }}
            >
              {isLight ? <Sun size={13} strokeWidth={2.5} /> : <Moon size={12} strokeWidth={2.5} />}
            </motion.span>
          </AnimatePresence>
        </motion.span>
      </span>
    </button>
  );
}
