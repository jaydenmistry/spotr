// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPaletteShortcut,
  isPlainKey,
  isTypingTarget,
  setSingleKeyShortcutsEnabled,
  singleKeyShortcutsEnabled,
  subscribeShortcutsPreference,
} from "./shortcuts";

function keydown(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, "target", { value: target });
  return event;
}

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("isTypingTarget", () => {
  it("treats text inputs, textareas, selects and editable regions as typing", () => {
    document.body.innerHTML = `
      <input id="text" type="text" /><input id="search" type="search" />
      <textarea id="area"></textarea><select id="sel"></select>
      <div contenteditable="true"><span id="inner">x</span></div>`;
    for (const id of ["text", "search", "area", "sel", "inner"]) {
      expect(isTypingTarget(document.getElementById(id)), id).toBe(true);
    }
  });

  it("does not treat buttons or checkbox inputs as typing", () => {
    document.body.innerHTML = `<button id="b">x</button><input id="c" type="checkbox" />`;
    expect(isTypingTarget(document.getElementById("b"))).toBe(false);
    expect(isTypingTarget(document.getElementById("c"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe("isPlainKey", () => {
  it("allows bare letters and Shift (for ?)", () => {
    expect(isPlainKey(keydown("j"))).toBe(true);
    expect(isPlainKey(keydown("?", { shiftKey: true }))).toBe(true);
  });

  it("rejects modifiers, IME composition, and typing targets", () => {
    expect(isPlainKey(keydown("j", { metaKey: true }))).toBe(false);
    expect(isPlainKey(keydown("j", { ctrlKey: true }))).toBe(false);
    expect(isPlainKey(keydown("j", { altKey: true }))).toBe(false);
    expect(isPlainKey(keydown("j", { isComposing: true }))).toBe(false);
    const input = document.createElement("input");
    expect(isPlainKey(keydown("j", {}, input))).toBe(false);
  });
});

describe("isPaletteShortcut", () => {
  it("uses Ctrl+K off Apple platforms", () => {
    vi.stubGlobal("navigator", { platform: "Linux x86_64" });
    expect(isPaletteShortcut(keydown("k", { ctrlKey: true }))).toBe(true);
    expect(isPaletteShortcut(keydown("k", { metaKey: true }))).toBe(false);
  });

  it("uses ⌘K on Apple platforms", () => {
    vi.stubGlobal("navigator", { platform: "MacIntel" });
    expect(isPaletteShortcut(keydown("K", { metaKey: true }))).toBe(true);
    expect(isPaletteShortcut(keydown("k", { ctrlKey: true }))).toBe(false);
    expect(isPaletteShortcut(keydown("k", { metaKey: true, shiftKey: true }))).toBe(false);
  });
});

describe("single-key shortcut preference", () => {
  it("defaults on, persists off, and notifies subscribers", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeShortcutsPreference(onChange);
    expect(singleKeyShortcutsEnabled()).toBe(true);
    setSingleKeyShortcutsEnabled(false);
    expect(singleKeyShortcutsEnabled()).toBe(false);
    setSingleKeyShortcutsEnabled(true);
    expect(singleKeyShortcutsEnabled()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
