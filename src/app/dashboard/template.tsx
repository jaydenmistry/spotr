"use client";

import { motion } from "motion/react";
import { spring } from "@/lib/motion";

/**
 * Re-mounts on every dashboard navigation (template, not layout), so each
 * page settles into place instead of popping in. No `filter` here: it
 * would become the containing block for the pages' fixed-position sheets.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.smooth}
    >
      {children}
    </motion.div>
  );
}
