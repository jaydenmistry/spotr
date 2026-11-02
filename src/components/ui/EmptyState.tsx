"use client";

import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { spring } from "@/lib/motion";

/** Centered empty/error state: an icon that settles in, a title, guidance, an action. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  tone = "var(--tint-text)",
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  tone?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.smooth}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "64px 24px",
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-card)",
        border: "1px solid var(--separator)",
        textAlign: "center",
      }}
    >
      <motion.span
        initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ ...spring.bouncy, delay: 0.08 }}
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          display: "grid",
          placeItems: "center",
          marginBottom: 6,
          color: tone,
          background: `color-mix(in srgb, ${tone} 12%, transparent)`,
        }}
      >
        <Icon style={{ width: 26, height: 26 }} />
      </motion.span>
      <p className="t-headline" style={{ color: "var(--label)" }}>{title}</p>
      {body && (
        <p className="t-subhead" style={{ color: "var(--label-secondary)", maxWidth: 420 }}>
          {body}
        </p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </motion.div>
  );
}
