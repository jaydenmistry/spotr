"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  /** `origin` is where the change was triggered — the new theme grows from there. */
  setTheme: (theme: Theme, origin?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

// The <html data-theme> attribute is the source of truth (the pre-paint
// script sets it before React loads), so React subscribes to it.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const getSnapshot = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const getServerSnapshot = (): Theme => "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") root.dataset.theme = "light";
  else delete root.dataset.theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (private mode) — the theme still applies for this visit.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme, origin?: { x: number; y: number }) => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const commit = () => applyTheme(next);

    // A circular reveal from the toggle eases the brightness jump instead of
    // flashing the whole screen at once.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (!doc.startViewTransition || reduceMotion) {
      commit();
      return;
    }
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty("--theme-r", `${radius}px`);
    doc.startViewTransition(commit);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
