"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Crosshair, Download, Inbox, Keyboard, LayoutGrid, LogOut, Moon, Package, Radar, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { hasOpenDialog } from "@/components/ui/useDialogFocus";
import {
  GO_TO_KEYS,
  SEQUENCE_TIMEOUT_MS,
  focusWhenReady,
  isPaletteShortcut,
  isPlainKey,
  singleKeyShortcutsEnabled,
  subscribeShortcutsPreference,
} from "@/lib/shortcuts";
import { CommandPalette, type Command } from "./CommandPalette";
import { ShortcutsHelp } from "./ShortcutsHelp";

interface CommandPaletteContextValue {
  openPalette: () => void;
  openHelp: () => void;
  /** Whether single-key shortcuts (j, w, g f…) are on for this browser. */
  shortcutsEnabled: boolean;
  /** Page-contributed commands; prefer `useRegisterCommands`. */
  setPageCommands: (key: symbol, commands: Command[] | null) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  openPalette: () => {},
  openHelp: () => {},
  shortcutsEnabled: true,
  setPageCommands: () => {},
});

export function useCommandPalette() {
  return useContext(CommandPaletteContext);
}

/** Adds commands to the palette while the calling component is mounted. */
export function useRegisterCommands(commands: Command[]) {
  const { setPageCommands } = useCommandPalette();
  const [key] = useState(() => Symbol("commands"));
  useEffect(() => {
    setPageCommands(key, commands);
  }, [key, commands, setPageCommands]);
  useEffect(() => () => setPageCommands(key, null), [key, setPageCommands]);
}

const NAV_COMMANDS: Array<Omit<Command, "run" | "group"> & { href: string }> = [
  { id: "go-feed", label: "Opportunity Feed", icon: Radar, href: "/dashboard/feed", shortcut: ["G", "F"], keywords: ["deals", "ranked", "opportunities"] },
  { id: "go-pipeline", label: "Pipeline", icon: LayoutGrid, href: "/dashboard", shortcut: ["G", "P"], keywords: ["kanban", "board", "stages"] },
  { id: "go-inventory", label: "Inventory", icon: Package, href: "/dashboard/inventory", shortcut: ["G", "I"], keywords: ["listings", "browse"] },
  { id: "go-buybox", label: "Buy Box", icon: Crosshair, href: "/dashboard/buybox", shortcut: ["G", "B"], keywords: ["criteria", "settings"] },
  { id: "go-requests", label: "Access requests", icon: Inbox, href: "/dashboard/requests", shortcut: ["G", "R"], keywords: ["team", "inbox", "prospects"] },
];

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pageCommands, setPageCommandsState] = useState<Map<symbol, Command[]>>(() => new Map());
  const shortcutsEnabled = useSyncExternalStore(subscribeShortcutsPreference, singleKeyShortcutsEnabled, () => true);

  const setPageCommands = useCallback((key: symbol, commands: Command[] | null) => {
    setPageCommandsState((prev) => {
      const next = new Map(prev);
      if (commands) next.set(key, commands);
      else next.delete(key);
      return next;
    });
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openHelp = useCallback(() => setHelpOpen(true), []);

  const commands = useMemo<Command[]>(() => {
    const isLight = theme === "light";
    return [
      ...Array.from(pageCommands.values()).flat(),
      ...NAV_COMMANDS.filter((command) => command.href !== pathname).map(({ href, ...command }) => ({
        ...command,
        group: "Go to" as const,
        run: () => router.push(href),
      })),
      {
        id: "pull-listings",
        group: "Actions",
        label: "Pull listings…",
        hint: "Opens Pipeline — pulls are metered, so you start it",
        icon: Download,
        keywords: ["fetch", "marketcheck", "import", "refresh"],
        run: () => {
          if (pathname !== "/dashboard") router.push("/dashboard");
          focusWhenReady("pull-listings");
        },
      },
      {
        id: "toggle-theme",
        group: "Actions",
        label: isLight ? "Switch to dark mode" : "Switch to light mode",
        icon: isLight ? Moon : Sun,
        keywords: ["theme", "appearance", "dark", "light"],
        run: () => setTheme(isLight ? "dark" : "light"),
      },
      {
        id: "shortcuts",
        group: "Actions",
        label: "Keyboard shortcuts",
        icon: Keyboard,
        shortcut: shortcutsEnabled ? ["?"] : undefined,
        hint: shortcutsEnabled ? undefined : "Single-key shortcuts are off — turn them on here",
        keywords: ["help", "keys", "hotkeys"],
        run: () => setHelpOpen(true),
      },
      {
        id: "sign-out",
        group: "Actions",
        label: "Sign out",
        icon: LogOut,
        keywords: ["log out", "logout"],
        run: () => void signOut({ callbackUrl: "/" }),
      },
    ];
  }, [pageCommands, pathname, router, setTheme, theme, shortcutsEnabled]);

  // Capture phase so the chord's second key ("p" in g→p) is claimed before a
  // page-level listener reads it as its own shortcut.
  const pendingG = useRef(0);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isPaletteShortcut(event)) {
        event.preventDefault();
        if (!event.repeat) setPaletteOpen((open) => !open);
        return;
      }
      if (!singleKeyShortcutsEnabled() || hasOpenDialog() || !isPlainKey(event)) {
        pendingG.current = 0;
        return;
      }
      const key = event.key.toLowerCase();
      if (pendingG.current && Date.now() - pendingG.current < SEQUENCE_TIMEOUT_MS) {
        pendingG.current = 0;
        const href = GO_TO_KEYS[key];
        if (href) {
          event.preventDefault();
          router.push(href);
          return;
        }
      }
      pendingG.current = 0;
      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
      } else if (key === "g" && !event.shiftKey) {
        event.preventDefault();
        pendingG.current = Date.now();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [router]);

  const value = useMemo(
    () => ({ openPalette, openHelp, shortcutsEnabled, setPageCommands }),
    [openPalette, openHelp, shortcutsEnabled, setPageCommands]
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      {paletteOpen && <CommandPalette commands={commands} onClose={() => setPaletteOpen(false)} />}
      {helpOpen && <ShortcutsHelp onClose={() => setHelpOpen(false)} shortcutsEnabled={shortcutsEnabled} />}
    </CommandPaletteContext.Provider>
  );
}
