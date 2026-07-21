import { describe, expect, it } from "vitest";
import { isStage, isTerminalStage, STAGES, TERMINAL_STAGES } from "./stages";

describe("isStage", () => {
  it("accepts every kanban stage", () => {
    for (const stage of STAGES) {
      expect(isStage(stage)).toBe(true);
    }
  });

  it("rejects unknown stages and non-strings", () => {
    expect(isStage("Archived")).toBe(false);
    expect(isStage("new leads")).toBe(false);
    expect(isStage("")).toBe(false);
    expect(isStage(null)).toBe(false);
    expect(isStage(42)).toBe(false);
  });
});

describe("TERMINAL_STAGES", () => {
  it("is a subset of the kanban stages", () => {
    for (const stage of TERMINAL_STAGES) {
      expect(STAGES).toContain(stage);
    }
  });
});

describe("isTerminalStage", () => {
  it("accepts exactly the terminal stages", () => {
    expect(isTerminalStage("Acquired")).toBe(true);
    expect(isTerminalStage("Lost")).toBe(true);
  });

  it("rejects open stages and free-text values", () => {
    expect(isTerminalStage("New Leads")).toBe(false);
    expect(isTerminalStage("Offer Made")).toBe(false);
    expect(isTerminalStage("legacy-stage-value")).toBe(false);
    expect(isTerminalStage("")).toBe(false);
  });
});
