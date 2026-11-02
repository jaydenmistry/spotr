"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { spring } from "@/lib/motion";

const subscribeNoop = () => () => {};

/**
 * A floating status pill at the bottom of the screen (above the compact tab
 * bar). It springs up from the edge it lives on and drops back the same way.
 */
export function Toast({ show, children }: { show: boolean; children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    // The live region stays mounted so screen readers announce what appears in it.
    <div role="status" aria-live="polite">
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.94 }}
          transition={spring.bouncy}
          className="material toast"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            margin: "0 auto",
            width: "fit-content",
            maxWidth: "calc(100vw - 32px)",
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 10px 10px 18px",
            borderRadius: 999,
            border: "1px solid var(--separator-strong)",
            boxShadow: "var(--shadow-lg)",
            fontSize: 13,
            color: "var(--label-body)",
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
    </div>,
    document.body
  );
}
