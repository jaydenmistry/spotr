// Keyboard-shortcut plumbing shared by the command palette and page-level
// shortcuts. Pure helpers so the guard rules are unit-testable.

export const SHORTCUTS_STORAGE_KEY = "spotr-single-key-shortcuts";
const CHANGE_EVENT = "spotr-shortcuts-change";

/** True while focus is somewhere the user types, so letter keys must pass through. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  if (el.closest("textarea, select, [contenteditable=''], [contenteditable='true']")) return true;
  if (el instanceof HTMLInputElement) {
    // Buttons-as-inputs don't take text.
    return !["button", "submit", "reset", "checkbox", "radio", "range", "color", "file"].includes(el.type);
  }
  return false;
}

/**
 * Whether a plain single-key shortcut may fire for this event: no command
 * modifiers, not mid-IME composition, not typing in a field. Shift is allowed
 * so "?" (Shift+/) works.
 */
export function isPlainKey(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.isComposing || event.key === "Process") return false;
  if (event.defaultPrevented) return false;
  return !isTypingTarget(event.target);
}

/** ⌘K on Apple platforms, Ctrl+K elsewhere. Fires even inside fields. */
export function isPaletteShortcut(event: KeyboardEvent): boolean {
  if (event.altKey || event.shiftKey || event.key.toLowerCase() !== "k") return false;
  return isApplePlatform() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}

export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** Label for the palette shortcut on this platform. */
export function paletteShortcutLabel(): string[] {
  return isApplePlatform() ? ["⌘", "K"] : ["Ctrl", "K"];
}

// Single-key shortcuts can be turned off (WCAG 2.1.4). Stored per browser;
// on by default. ⌘K is a modified chord and is never disabled.
export function singleKeyShortcutsEnabled(): boolean {
  try {
    return localStorage.getItem(SHORTCUTS_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSingleKeyShortcutsEnabled(enabled: boolean) {
  try {
    if (enabled) localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
    else localStorage.setItem(SHORTCUTS_STORAGE_KEY, "off");
  } catch {
    // Storage unavailable — the choice still applies until reload via the event.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeShortcutsPreference(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SHORTCUTS_STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** "g" then a letter navigates. The second key must follow within this window. */
export const SEQUENCE_TIMEOUT_MS = 1000;

export const GO_TO_KEYS: Record<string, string> = {
  f: "/dashboard/feed",
  p: "/dashboard",
  i: "/dashboard/inventory",
  b: "/dashboard/buybox",
  r: "/dashboard/requests",
};

/**
 * Focus an element once it exists — used after navigating to a page whose
 * target hasn't rendered yet (e.g. the Pull listings button). Gives up
 * after `timeoutMs`.
 */
export function focusWhenReady(id: string, timeoutMs = 4000) {
  const started = Date.now();
  const tick = () => {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (Date.now() - started < timeoutMs) window.setTimeout(tick, 80);
  };
  tick();
}
