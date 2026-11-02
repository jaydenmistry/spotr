"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { spring } from "@/lib/motion";
import { SpotrMark } from "./SpotrLogo";

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Right-aligned controls; they also ride along in the collapsed bar. */
  actions?: React.ReactNode;
}

/**
 * iOS-style large title. The big title scrolls away with the content; once
 * it's gone, a compact translucent bar fades in at the top carrying the
 * title, so you always know where you are.
 */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), {
      rootMargin: "0px 0px 0px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <AnimatePresence>
        {collapsed && (
          <motion.div
            key="bar"
            aria-hidden="true"
            className="hide-compact material"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring.snappy}
            style={{
              position: "fixed",
              top: 0,
              left: 240,
              right: 0,
              zIndex: 40,
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "0 2.25rem",
              borderBottom: "1px solid var(--separator)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <SpotrMark size={24} />
              <span aria-hidden="true" style={{ width: 1, height: 18, background: "var(--separator-strong)" }} />
              <span className="t-headline" style={{ color: "var(--label)" }}>
                {title}
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <motion.h1
            className="t-large-title"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.smooth}
            style={{ color: "var(--label)" }}
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              className="t-subhead"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.smooth, delay: 0.05 }}
              style={{ color: "var(--label-secondary)", marginTop: 6, maxWidth: 640 }}
            >
              {subtitle}
            </motion.p>
          )}
          <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
        </div>
        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.smooth, delay: 0.08 }}
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}
          >
            {actions}
          </motion.div>
        )}
      </header>
    </>
  );
}
