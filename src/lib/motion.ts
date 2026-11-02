/**
 * Motion vocabulary, after Apple's fluid-interface guidance.
 *
 * Springs are described the way Apple does — a bounce (overshoot) and a
 * perceptual duration ("response") — and map directly onto motion/react's
 * `{ type: "spring", bounce, duration }`. Default to no bounce; only add
 * bounce when a gesture carried momentum into the motion.
 */

export const spring = {
  /** Default for anything that moves on its own: no overshoot. */
  smooth: { type: "spring", bounce: 0, duration: 0.4 },
  /** Small controls: toggles, tab indicators, chips. */
  snappy: { type: "spring", bounce: 0, duration: 0.28 },
  /** After a flick or drag release — momentum earns a little overshoot. */
  bouncy: { type: "spring", bounce: 0.22, duration: 0.45 },
  /** Sheets and drawers (Apple ships damping 0.8 / response 0.3). */
  sheet: { type: "spring", bounce: 0.12, duration: 0.42 },
  /** Large layout reflows: cards re-sorting, grids filtering. */
  layout: { type: "spring", bounce: 0.08, duration: 0.5 },
} as const;

/** Stagger children into view: a list that assembles itself. */
export const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
} as const;

export const listItem = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring.smooth },
} as const;

/**
 * Where a flicked element would come to rest, using Apple's
 * scroll-deceleration projection (Designing Fluid Interfaces, WWDC 2018).
 * `velocity` is in px/s; returns a px offset from the release point.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary: the further the overshoot, the
 * less the element follows. `dimension` is the size of the dragged axis.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  const sign = Math.sign(overshoot);
  const distance = Math.abs(overshoot);
  return (sign * (distance * dimension * constant)) / (dimension + constant * distance);
}
