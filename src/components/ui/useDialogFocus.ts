"use client";

import { useEffect, useRef } from "react";

// Open dialogs, innermost last. Only the top one owns Escape and Tab, so a
// prompt opened over the dossier sheet closes alone and keeps focus inside it.
const stack: symbol[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal focus behaviour: focus moves in on open, Tab cycles within the
 * dialog, Escape dismisses the topmost dialog only, and focus returns to the
 * element that opened it on close.
 */
export function useDialogFocus(
  containerRef: React.RefObject<HTMLElement | null>,
  onEscape: () => void,
  initialFocusRef?: React.RefObject<HTMLElement | null>
) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    const id = Symbol("dialog");
    stack.push(id);
    const opener = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => (initialFocusRef?.current ?? containerRef.current)?.focus());

    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      const container = containerRef.current;
      if (!container) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && container.contains(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      const index = stack.indexOf(id);
      if (index !== -1) stack.splice(index, 1);
      if (opener && document.contains(opener)) opener.focus();
    };
    // Mount-only: the dialog's lifetime is the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
