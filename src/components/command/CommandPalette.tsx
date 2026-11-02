"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CarFront, CornerDownLeft, Search, type LucideIcon } from "lucide-react";
import { useDialogFocus } from "@/components/ui/useDialogFocus";
import { Kbd } from "@/components/ui/Kbd";
import { rankCommands } from "@/lib/commandSearch";
import { isApplePlatform } from "@/lib/shortcuts";
import { formatCurrency, formatMiles, getVehicleTitle, type LeadRecord } from "@/lib/vehicleAnalytics";
import { isFixtureLead, type Recommendation } from "@/lib/opportunity";
import { RECOMMENDATION_COLORS, tone } from "@/lib/ui/colors";

export type CommandGroup = "This page" | "Go to" | "Actions";

export interface Command {
  id: string;
  group: CommandGroup;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
  /** Key caps shown on the right, e.g. ["G", "F"]. */
  shortcut?: string[];
  /** Secondary line under the label. */
  hint?: string;
  run: () => void;
}

const GROUP_ORDER: CommandGroup[] = ["This page", "Go to", "Actions"];
const VEHICLE_LIMIT = 5;
const SEARCH_DEBOUNCE_MS = 200;
const MIN_VEHICLE_QUERY = 2;

type VehicleResult = Pick<
  LeadRecord,
  "id" | "vin" | "year" | "make" | "model" | "listingTitle" | "price" | "miles" | "source" | "createdAt"
> & { assessment?: { recommendation: Recommendation } };

type VehicleState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; query: string; results: VehicleResult[]; total: number };

interface Option {
  id: string;
  kind: "command" | "vehicle";
  run: () => void;
}

const subscribeNoop = () => () => {};

/** Ingestion age — when Spotr found it, not seller days-on-market. */
function foundAgo(createdAt: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
  if (days === 0) return "found today";
  if (days < 30) return `found ${days}d ago`;
  return `found ${Math.floor(days / 30)}mo ago`;
}

export function vehicleHref(vehicle: Pick<VehicleResult, "id" | "vin" | "listingTitle" | "year" | "make" | "model">) {
  const q = (vehicle.vin || getVehicleTitle(vehicle)).slice(0, 60);
  return `/dashboard/feed?${new URLSearchParams({ q, open: vehicle.id }).toString()}`;
}

/**
 * ⌘K palette: navigation, actions, page commands, and a live search of open
 * opportunities. Combobox pattern — focus stays in the input and the active
 * option is conveyed with aria-activedescendant.
 */
export function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [vehicles, setVehicles] = useState<VehicleState>({ status: "idle" });
  useDialogFocus(panelRef, onClose, inputRef);

  const trimmed = query.trim();
  const wantsVehicles = trimmed.length >= MIN_VEHICLE_QUERY;

  // Vehicle search: debounced, and stale responses are aborted.
  useEffect(() => {
    if (!wantsVehicles) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setVehicles({ status: "loading" });
      try {
        const res = await axios.get<{ leads: VehicleResult[]; total: number }>("/api/leads/feed", {
          params: { q: trimmed, view: "active", sort: "score" },
          signal: controller.signal,
        });
        setVehicles({ status: "done", query: trimmed, results: res.data.leads.slice(0, VEHICLE_LIMIT), total: res.data.total });
      } catch (error) {
        if (axios.isCancel(error)) return;
        setVehicles({ status: "error" });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed, wantsVehicles]);

  const ranked = useMemo(() => rankCommands(commands, trimmed), [commands, trimmed]);
  // While searching, the group holding the best match comes first so Enter
  // on the pre-selected row runs the best match, not the first group's.
  const grouped = useMemo(() => {
    const order = trimmed ? Array.from(new Set(ranked.map((command) => command.group))) : GROUP_ORDER;
    return order
      .map((group) => ({ group, items: ranked.filter((command) => command.group === group) }))
      .filter((section) => section.items.length > 0);
  }, [ranked, trimmed]);
  // Results for an older query count as still loading — never actionable.
  const vehicleState: VehicleState =
    vehicles.status === "done" && vehicles.query !== trimmed ? { status: "loading" } : vehicles;
  const vehicleResults = useMemo(
    () => (wantsVehicles && vehicles.status === "done" && vehicles.query === trimmed ? vehicles.results : []),
    [wantsVehicles, vehicles, trimmed]
  );

  // Flattened in display order so arrow keys follow what's on screen.
  const options = useMemo<Option[]>(() => {
    const list: Option[] = grouped.flatMap((section) =>
      section.items.map((command) => ({ id: command.id, kind: "command" as const, run: command.run }))
    );
    for (const vehicle of vehicleResults) {
      list.push({ id: `vehicle-${vehicle.id}`, kind: "vehicle", run: () => router.push(vehicleHref(vehicle)) });
    }
    return list;
  }, [grouped, vehicleResults, router]);

  const safeIndex = options.length === 0 ? -1 : Math.min(activeIndex, options.length - 1);
  const optionId = (id: string) => `${baseId}-opt-${id}`;
  const activeOption = safeIndex >= 0 ? options[safeIndex] : null;

  useEffect(() => {
    if (!activeOption) return;
    document.getElementById(optionId(activeOption.id))?.scrollIntoView({ block: "nearest" });
    // optionId is derived from baseId, which is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOption]);

  // Close first so focus returns to the opener, then act — a command that
  // moves focus (e.g. to the search box) must run after that restore. From
  // the keyboard, wait for Enter to come back up: a held Enter would
  // otherwise auto-repeat onto whatever the command focuses (e.g. the
  // metered Pull listings button).
  const choose = (option: Option, viaKeyboard = false) => {
    onClose();
    if (!viaKeyboard) {
      window.setTimeout(option.run, 0);
      return;
    }
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      window.removeEventListener("keyup", onKeyUp, true);
      window.setTimeout(option.run, 0);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Enter") run();
    };
    window.addEventListener("keyup", onKeyUp, true);
    window.setTimeout(run, 1500);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    // keyCode 229: Safari reports the IME-confirming Enter as not composing.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    // Ctrl+N / Ctrl+P are emacs-style on Apple platforms only; elsewhere
    // they're the browser's new-window and print.
    const emacs = event.ctrlKey && isApplePlatform();
    if (event.key === "ArrowDown" || (emacs && event.key === "n")) {
      event.preventDefault();
      if (options.length) setActiveIndex((safeIndex + 1) % options.length);
    } else if (event.key === "ArrowUp" || (emacs && event.key === "p")) {
      event.preventDefault();
      if (options.length) setActiveIndex((safeIndex - 1 + options.length) % options.length);
    } else if (event.key === "Home" && event.ctrlKey) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && event.ctrlKey) {
      event.preventDefault();
      setActiveIndex(Math.max(0, options.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeOption && !event.repeat) choose(activeOption, true);
    }
  };

  const statusText = (() => {
    const commandCount = ranked.length;
    if (!wantsVehicles) return `${commandCount} command${commandCount === 1 ? "" : "s"}`;
    if (vehicleState.status === "loading" || vehicleState.status === "idle") return `${commandCount} commands, searching vehicles`;
    if (vehicleState.status === "error") return `${commandCount} commands, vehicle search failed`;
    return `${commandCount} commands, ${vehicleResults.length} vehicles`;
  })();

  if (!mounted) return null;

  const indexById = new Map(options.map((option, index) => [option.id, index]));
  const renderOption = (
    option: {
      id: string;
      label: string;
      icon: LucideIcon;
      hint?: string;
      shortcut?: string[];
      meta?: React.ReactNode;
      badge?: React.ReactNode;
    },
    onChoose: () => void
  ) => {
    const index = indexById.get(option.id) ?? -1;
    const active = index === safeIndex;
    const Icon = option.icon;
    return (
      <div
        key={option.id}
        id={optionId(option.id)}
        role="option"
        aria-selected={active}
        className="palette-option"
        data-active={active || undefined}
        onPointerMove={() => {
          if (!active) setActiveIndex(index);
        }}
        onClick={onChoose}
      >
        <span className="palette-option-icon" aria-hidden="true">
          <Icon size={16} strokeWidth={2} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{option.label}</span>
          {(option.hint || option.meta) && (
            <span className="t-caption" style={{ display: "block", color: "var(--label-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {option.meta ?? option.hint}
            </span>
          )}
        </span>
        {option.badge}
        {option.shortcut && (
          <span className="keyboard-only">
            <Kbd keys={option.shortcut} />
          </span>
        )}
        {active && <CornerDownLeft size={14} aria-hidden="true" style={{ color: "var(--label-tertiary)", flexShrink: 0 }} />}
      </div>
    );
  };

  return createPortal(
    <div
      className="palette-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Command palette" tabIndex={-1} className="palette-panel">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", borderBottom: "1px solid var(--separator)" }}>
          <Search size={18} aria-hidden="true" style={{ color: "var(--label-secondary)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={`${baseId}-list`}
            aria-activedescendant={activeOption ? optionId(activeOption.id) : undefined}
            aria-autocomplete="list"
            aria-label="Search commands and vehicles"
            placeholder="Search or jump to…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
              if (event.target.value.trim().length < MIN_VEHICLE_QUERY) setVehicles({ status: "idle" });
            }}
            onKeyDown={onKeyDown}
            className="palette-input"
          />
          <button type="button" onClick={onClose} className="pressable hide-compact" aria-label="Close command palette" style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
            <Kbd keys={["esc"]} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="pressable show-compact"
            style={{ border: "none", background: "transparent", padding: "8px 0 8px 4px", color: "var(--tint-text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>

        {/* Pointer-down outside an option keeps focus in the input so the
            arrow keys keep working. */}
        <div className="palette-list" onMouseDown={(event) => event.preventDefault()}>
          <div id={`${baseId}-list`} role="listbox" aria-label="Results">
            {grouped.map((section, index) => (
              <div key={section.group} role="group" aria-labelledby={`${baseId}-group-${index}`}>
                <p id={`${baseId}-group-${index}`} role="presentation" className="palette-group t-eyebrow">
                  {section.group}
                </p>
                {section.items.map((command) => renderOption(command, () => choose({ id: command.id, kind: "command", run: command.run })))}
              </div>
            ))}

            {vehicleResults.length > 0 && (
              <div role="group" aria-labelledby={`${baseId}-vehicles`}>
                <p id={`${baseId}-vehicles`} role="presentation" className="palette-group t-eyebrow">
                  Open opportunities
                </p>
                {vehicleResults.map((vehicle) =>
                  renderOption(
                    {
                      id: `vehicle-${vehicle.id}`,
                      label: getVehicleTitle(vehicle),
                      icon: CarFront,
                      meta: (
                        <>
                          {vehicle.price ? <>Asking <span className="tabular">{formatCurrency(vehicle.price)}</span></> : "No asking price"}
                          {" · "}
                          {formatMiles(vehicle.miles)} · {isFixtureLead(vehicle) ? "Sample data" : vehicle.source || "Unknown source"} ·{" "}
                          {foundAgo(vehicle.createdAt)}
                        </>
                      ),
                      badge: vehicle.assessment && (
                        <span
                          title="Spotr estimate (heuristic), not a market quote"
                          className="t-caption"
                          style={{
                            flexShrink: 0,
                            padding: "2px 7px",
                            borderRadius: 999,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            color: RECOMMENDATION_COLORS[vehicle.assessment.recommendation],
                            background: tone(RECOMMENDATION_COLORS[vehicle.assessment.recommendation], 13),
                          }}
                        >
                          {vehicle.assessment.recommendation}
                          <span className="sr-only"> (Spotr estimate)</span>
                        </span>
                      ),
                    },
                    () => choose({ id: `vehicle-${vehicle.id}`, kind: "vehicle", run: () => router.push(vehicleHref(vehicle)) })
                  )
                )}
              </div>
            )}
          </div>

          {/* Notes sit outside the listbox: only options and groups belong in it. */}
          {wantsVehicles && vehicleResults.length === 0 && (
            <p className="palette-group t-eyebrow">Open opportunities</p>
          )}
          {wantsVehicles && vehicleState.status !== "done" && vehicleState.status !== "error" && (
            <p className="palette-note" aria-hidden="true">Searching vehicles…</p>
          )}
          {wantsVehicles && vehicleState.status === "error" && (
            <p className="palette-note" style={{ color: "var(--red)" }}>Couldn&apos;t search vehicles. Try again.</p>
          )}
          {vehicleState.status === "done" && vehicleResults.length === 0 && (
            <p className="palette-note">No open opportunities match “{trimmed}”. Passed vehicles aren&apos;t searched here.</p>
          )}
          {vehicleState.status === "done" && vehicleState.total > vehicleResults.length && (
            <p className="palette-note">
              Top {vehicleResults.length} of {vehicleState.total} by Spotr score (an estimate) — refine the search to narrow it.
            </p>
          )}

          {options.length === 0 && !wantsVehicles && <p className="palette-note" style={{ padding: "18px 16px" }}>No commands match “{trimmed}”.</p>}
        </div>

        <div className="palette-footer hide-compact" aria-hidden="true">
          <span><Kbd keys={["↑", "↓"]} /> move</span>
          <span><Kbd keys={["↵"]} label="Enter" /> open</span>
          <span><Kbd keys={["esc"]} /> close</span>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {statusText}
        </p>
      </div>
    </div>,
    document.body
  );
}
