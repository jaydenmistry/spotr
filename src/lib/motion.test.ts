import { describe, expect, it } from "vitest";
import { project, rubberband } from "./motion";

describe("project", () => {
  it("is zero at rest and symmetric in direction", () => {
    expect(project(0)).toBe(0);
    expect(project(-800)).toBeCloseTo(-project(800));
  });

  it("matches Apple's deceleration projection", () => {
    // 1000 px/s at 0.998 → 0.998 / 0.002 = 499px
    expect(project(1000)).toBeCloseTo(499, 5);
  });

  it("projects shorter with a snappier deceleration rate", () => {
    expect(project(1000, 0.99)).toBeLessThan(project(1000, 0.998));
  });
});

describe("rubberband", () => {
  it("passes nothing through at zero overshoot", () => {
    expect(rubberband(0, 600)).toBe(0);
  });

  it("always moves less than the pointer and keeps the sign", () => {
    for (const overshoot of [10, 80, 300, 2000]) {
      const out = rubberband(overshoot, 600);
      expect(out).toBeGreaterThan(0);
      expect(out).toBeLessThan(overshoot);
      expect(rubberband(-overshoot, 600)).toBeCloseTo(-out);
    }
  });

  it("resists progressively and never exceeds the dimension", () => {
    const a = rubberband(100, 600) / 100;
    const b = rubberband(1000, 600) / 1000;
    expect(b).toBeLessThan(a);
    expect(rubberband(1e9, 600)).toBeLessThan(600);
  });

  it("handles a zero-size axis", () => {
    expect(rubberband(50, 0)).toBe(0);
  });
});
