"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import { X } from "lucide-react";
import { project, rubberband, spring } from "@/lib/motion";
import { useDialogFocus } from "./useDialogFocus";

interface SheetProps {
  onClose: () => void;
  ariaLabel: string;
  /** Rendered in the draggable top region (title, tabs). */
  header: React.ReactNode;
  /** Below the draggable region (e.g. tabs) so it can scroll horizontally. */
  toolbar?: React.ReactNode;
  /** Accessible name of the built-in close button. */
  closeLabel?: string;
  children: React.ReactNode;
}

/** Fallback so a dismissal can never strand the sheet if an animation stalls. */
const CLOSE_FALLBACK_MS = 700;

/**
 * A physical sheet. It rises from the bottom edge and leaves the same way;
 * the header region can be grabbed (even mid-animation) and tracks the
 * pointer 1:1, resisting with a rubber band if pulled upward. On release,
 * the flick's momentum is projected forward — a short, fast flick dismisses
 * just like a long slow drag — and the release velocity carries into the
 * spring so there's no seam between dragging and animating.
 */
const subscribeNoop = () => () => {};

export function Sheet({ onClose, ariaLabel, header, toolbar, closeLabel = "Close", children }: SheetProps) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(typeof window === "undefined" ? 800 : reduceMotion ? 0 : window.innerHeight);
  const opacity = useMotionValue(reduceMotion ? 0 : 1);
  const animation = useRef<AnimationPlaybackControls | null>(null);
  const closing = useRef(false);
  // Portals need document; render nothing during SSR.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  // The scrim is tied to the sheet's position: dragging down lightens it
  // continuously, so the feedback never waits for the gesture to finish.
  const scrimOpacity = useTransform(() => {
    const height = panelRef.current?.offsetHeight || (typeof window === "undefined" ? 800 : window.innerHeight);
    const progress = 1 - Math.min(Math.max(y.get(), 0) / height, 1);
    return progress * opacity.get();
  });

  const runTo = useCallback(
    (target: number, transition: object, velocity = 0) => {
      animation.current?.stop();
      animation.current = animate(y, target, { ...transition, velocity });
      return animation.current;
    },
    [y]
  );

  const requestClose = useCallback(
    (velocity = 0) => {
      if (closing.current) return;
      closing.current = true;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        onClose();
      };
      window.setTimeout(finish, CLOSE_FALLBACK_MS);
      if (reduceMotion) {
        animate(opacity, 0, { duration: 0.18 }).then(finish);
        return;
      }
      const offscreen = (panelRef.current?.offsetHeight || window.innerHeight) + 48;
      runTo(offscreen, { ...spring.smooth, duration: 0.34 }, Math.max(velocity, 0)).finished.then(finish);
    },
    [onClose, opacity, reduceMotion, runTo]
  );

  useDialogFocus(panelRef, () => requestClose());

  // Enter + scroll lock.
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    if (reduceMotion) animate(opacity, 1, { duration: 0.18 });
    else runTo(0, spring.sheet);
    return () => {
      animation.current?.stop();
      document.body.style.overflow = overflow;
    };
    // Mount-only: the sheet enters once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drag-to-dismiss (header region) ─────────────────────────
  const drag = useRef<{ startY: number; startOffset: number; history: { y: number; t: number }[] } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || closing.current || event.button !== 0) return;
    // Controls inside the header keep working as controls.
    if ((event.target as Element).closest("button, a, input, select, textarea, [role='tab']")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    // Interruptible: grabbing mid-flight starts from the on-screen value.
    animation.current?.stop();
    drag.current = { startY: event.clientY, startOffset: y.get(), history: [{ y: event.clientY, t: event.timeStamp }] };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const raw = state.startOffset + (event.clientY - state.startY);
    const height = panelRef.current?.offsetHeight ?? window.innerHeight;
    y.set(raw < 0 ? rubberband(raw, height) : raw);
    state.history.push({ y: event.clientY, t: event.timeStamp });
    while (state.history.length > 2 && event.timeStamp - state.history[0].t > 100) state.history.shift();
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    drag.current = null;
    const first = state.history[0];
    const last = state.history[state.history.length - 1];
    const dt = (last.t - first.t) / 1000;
    const velocity = dt > 0 ? (last.y - first.y) / dt : 0;
    const height = panelRef.current?.offsetHeight ?? window.innerHeight;
    const projected = y.get() + project(velocity);
    if (projected > height * 0.45 && velocity >= 0) requestClose(velocity);
    else runTo(0, spring.bouncy, velocity);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <motion.div
        aria-hidden="true"
        onClick={() => requestClose()}
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--scrim)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          opacity: scrimOpacity,
        }}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className="sheet-panel"
        style={{
          y,
          opacity,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-lg), inset 0 1px 0 var(--material-edge)",
          border: "1px solid var(--separator)",
          outline: "none",
          willChange: "transform",
        }}
      >
        <div
          className="sheet-grabber"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ position: "relative", flexShrink: 0 }}
        >
          <button
            type="button"
            onClick={() => requestClose()}
            aria-label={closeLabel}
            className="pressable hover-fill"
            style={{
              position: "absolute",
              top: 18,
              right: 20,
              zIndex: 1,
              width: 32,
              height: 32,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "var(--fill)",
              border: "none",
              cursor: "pointer",
              color: "var(--label-secondary)",
            }}
          >
            <X style={{ width: 16, height: 16 }} strokeWidth={2.4} />
          </button>
          <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
            <span style={{ width: 38, height: 5, borderRadius: 999, background: "rgba(var(--ink-rgb), 0.22)" }} />
          </div>
          {header}
        </div>
        <div style={{ flexShrink: 0, borderBottom: "1px solid var(--separator)" }}>{toolbar}</div>
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", paddingBottom: "env(safe-area-inset-bottom)" }}>{children}</div>
      </motion.div>
    </div>,
    document.body
  );
}
