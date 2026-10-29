"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, X } from "lucide-react";
import { spring } from "@/lib/motion";

export interface SetupStep {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  /** Where the step happens — a link, or an in-page action. */
  href?: string;
  onAction?: () => void;
}

const DISMISS_KEY = "spotr-setup-dismissed";
const DISMISS_EVENT = "spotr-setup-dismissed";

// Dismissal is a per-viewer convenience, so browser storage is fine; it must
// never be needed for the checklist itself (steps derive from real data).
function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => window.removeEventListener(DISMISS_EVENT, onChange);
}

/** First-run guide: each step ticks itself off as the work actually happens. */
export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  const doneCount = steps.filter((step) => step.done).length;
  const complete = doneCount === steps.length;
  const progress = steps.length ? doneCount / steps.length : 0;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Storage blocked: it just stays visible this session.
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  };

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.section
          aria-label="Get set up"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={spring.smooth}
          style={{ overflow: "hidden", marginBottom: 20 }}
        >
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid rgba(var(--tint-rgb), 0.25)",
              background: "linear-gradient(135deg, rgba(var(--tint-rgb), 0.12), transparent 60%), var(--bg-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: complete ? 0 : 14 }}>
              <ProgressRing progress={progress} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 className="t-headline" style={{ color: "var(--label)" }}>
                  {complete ? "You're all set" : "Get set up"}
                </h2>
                <p className="t-footnote tabular" style={{ color: "var(--label-secondary)" }}>
                  {complete
                    ? "Your desk is configured. You can hide this guide."
                    : `${doneCount} of ${steps.length} done · steps tick off as you work`}
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Hide setup guide"
                className="pressable hover-fill"
                style={{ width: 32, height: 32, borderRadius: 999, display: "grid", placeItems: "center", border: "none", background: "transparent", color: "var(--label-secondary)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            {!complete && (
              <ol style={{ listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                {steps.map((step, index) => (
                  <li key={step.id}>
                    <StepRow step={step} index={index} />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function StepRow({ step, index }: { step: SetupStep; index: number }) {
  const content = (
    <>
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          borderRadius: 999,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 700,
          color: step.done ? "#fff" : "var(--label-secondary)",
          background: step.done ? "var(--green)" : "var(--fill)",
          boxShadow: step.done ? "none" : "inset 0 0 0 1.5px var(--separator-strong)",
          transition: "background-color 240ms ease",
        }}
      >
        {step.done ? (
          <motion.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} style={{ display: "grid" }}>
            <Check size={14} strokeWidth={3} />
          </motion.span>
        ) : (
          index + 1
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: step.done ? "var(--label-secondary)" : "var(--label)", textDecoration: step.done ? "line-through" : "none" }}>
          {step.title}
        </span>
        <span style={{ display: "block", fontSize: 12, color: "var(--label-secondary)" }}>{step.detail}</span>
      </span>
      {!step.done && <ChevronRight aria-hidden="true" size={16} style={{ color: "var(--label-secondary)", flexShrink: 0 }} />}
      <span className="sr-only">{step.done ? "(done)" : "(to do)"}</span>
    </>
  );

  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    height: "100%",
    padding: "10px 12px",
    borderRadius: "var(--radius-md)",
    background: "var(--fill)",
    border: "none",
    textDecoration: "none",
    cursor: step.done ? "default" : "pointer",
  };

  if (step.done || (!step.href && !step.onAction)) return <div style={style}>{content}</div>;
  if (step.href) {
    return (
      <Link href={step.href} className="pressable hover-fill" style={style}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={step.onAction} className="pressable hover-fill" style={style}>
      {content}
    </button>
  );
}

function ProgressRing({ progress }: { progress: number }) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(var(--ink-rgb), 0.1)" strokeWidth="4" />
      <motion.circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke={progress >= 1 ? "var(--green)" : "var(--tint)"}
        strokeWidth="4"
        strokeLinecap="round"
        initial={false}
        animate={{ pathLength: Math.max(progress, 0.001) }}
        transition={spring.smooth}
      />
    </svg>
  );
}
