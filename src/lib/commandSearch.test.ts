import { describe, expect, it } from "vitest";
import { rankCommands, scoreCommand } from "./commandSearch";

const commands = [
  { id: "feed", label: "Opportunity Feed", keywords: ["deals", "ranked"] },
  { id: "pipeline", label: "Pipeline", keywords: ["kanban", "board"] },
  { id: "inventory", label: "Inventory" },
  { id: "buybox", label: "Buy Box", keywords: ["criteria"] },
  { id: "signout", label: "Sign out", keywords: ["log out"] },
];

describe("scoreCommand", () => {
  it("matches everything on an empty query", () => {
    expect(scoreCommand(commands[0], "  ")).toBeGreaterThan(0);
  });

  it("ranks exact > prefix > word start > substring", () => {
    const exact = scoreCommand({ id: "a", label: "Feed" }, "feed");
    const prefix = scoreCommand({ id: "b", label: "Feedback" }, "feed");
    const word = scoreCommand({ id: "c", label: "Opportunity Feed" }, "feed");
    const substring = scoreCommand({ id: "d", label: "Unfeedable" }, "feed");
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(0);
  });

  it("matches initials", () => {
    expect(scoreCommand(commands[3], "bb")).toBeGreaterThan(0);
  });

  it("is case and accent insensitive", () => {
    expect(scoreCommand({ id: "x", label: "Citroën" }, "CITROEN")).toBe(100);
  });

  it("does not fuzzy-skip letters", () => {
    expect(scoreCommand(commands[4], "pipe")).toBe(0);
  });
});

describe("rankCommands", () => {
  it("keeps the original order for an empty query", () => {
    expect(rankCommands(commands, "")).toEqual(commands);
  });

  it("finds commands by keyword", () => {
    expect(rankCommands(commands, "kanban").map((c) => c.id)).toEqual(["pipeline"]);
  });

  it("prefers a label match over a keyword match", () => {
    const ranked = rankCommands(
      [
        { id: "kw", label: "Something", keywords: ["board"] },
        { id: "label", label: "Board" },
      ],
      "board"
    );
    expect(ranked.map((c) => c.id)).toEqual(["label", "kw"]);
  });

  it("drops non-matches", () => {
    expect(rankCommands(commands, "zzz")).toEqual([]);
  });
});
