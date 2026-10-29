"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * A number that counts to its new value instead of jumping. The text node is
 * written directly each frame (no React re-render per frame), and the final
 * value is always rendered on the server and for reduced motion.
 */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  duration = 0.9,
  countUp = false,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  /** Count up from zero on mount, not just between later values. */
  countUp?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(countUp ? 0 : value);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduceMotion || from.current === value) {
      el.textContent = format(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        el.textContent = format(latest);
      },
    });
    from.current = value;
    return () => controls.stop();
    // `format` is usually an inline closure; the value drives the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reduceMotion]);

  return (
    <span ref={ref} className="tabular">
      {format(value)}
    </span>
  );
}
