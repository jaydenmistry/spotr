"use client";

import { Sheet } from "@/components/ui/Sheet";
import { Kbd, usePaletteShortcutLabel } from "@/components/ui/Kbd";
import { setSingleKeyShortcutsEnabled } from "@/lib/shortcuts";

const SECTIONS: Array<{ title: string; rows: Array<{ keys: string[][]; label: string; sep?: string; adminOnly?: boolean }> }> = [
  {
    title: "Anywhere",
    rows: [
      { keys: [["?"]], label: "Show this list" },
      { keys: [["G", "F"]], label: "Go to Opportunity Feed" },
      { keys: [["G", "P"]], label: "Go to Pipeline" },
      { keys: [["G", "I"]], label: "Go to Inventory" },
      { keys: [["G", "B"]], label: "Go to Buy Box" },
      { keys: [["G", "R"]], label: "Go to Access requests", adminOnly: true },
    ],
  },
  {
    title: "Opportunity Feed",
    rows: [
      { keys: [["J"], ["K"]], label: "Next / previous vehicle", sep: "/" },
      { keys: [["↵"], ["O"]], label: "Open dossier" },
      { keys: [["W"]], label: "Watch / unwatch" },
      { keys: [["A"]], label: "Assign / unassign" },
      { keys: [["P"]], label: "Pass — asks for a reason" },
      { keys: [["Z"]], label: "Undo last pass" },
      { keys: [["/"]], label: "Search the feed" },
      { keys: [["["], ["]"]], label: "Previous / next page", sep: "/" },
    ],
  },
];

const KEY_NAMES: Record<string, string> = { "↵": "Enter", "?": "Question mark", "/": "Slash", "[": "Left bracket", "]": "Right bracket" };

export function ShortcutsHelp({ onClose, shortcutsEnabled, isAdmin }: { onClose: () => void; shortcutsEnabled: boolean; isAdmin: boolean }) {
  const paletteKeys = usePaletteShortcutLabel();

  return (
    <Sheet
      onClose={onClose}
      ariaLabel="Keyboard shortcuts"
      closeLabel="Close keyboard shortcuts"
      size="medium"
      header={
        <div style={{ padding: "8px 72px 16px 24px", borderBottom: "1px solid var(--separator)" }}>
          <h2 className="t-title2" style={{ color: "var(--label)" }}>Keyboard shortcuts</h2>
          <p className="t-footnote" style={{ color: "var(--label-secondary)", marginTop: 4 }}>
            Press <Kbd keys={paletteKeys} /> any time to search pages, actions, and vehicles.
          </p>
        </div>
      }
    >
      <div style={{ padding: "20px 24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
        <label
          htmlFor="single-key-shortcuts"
          className="hover-fill"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--fill)",
            cursor: "pointer",
          }}
        >
          <span>
            <span id="single-key-shortcuts-label" style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--label)" }}>
              Single-key shortcuts
            </span>
            <span id="single-key-shortcuts-description" className="t-footnote" style={{ display: "block", color: "var(--label-secondary)" }}>
              Letter keys like J, W and G F. Turn off if they clash with assistive tech. {paletteKeys.join(paletteKeys[0] === "⌘" ? "" : "+")} always works.
            </span>
          </span>
          <input
            id="single-key-shortcuts"
            type="checkbox"
            role="switch"
            aria-labelledby="single-key-shortcuts-label"
            aria-describedby="single-key-shortcuts-description"
            checked={shortcutsEnabled}
            onChange={(event) => setSingleKeyShortcutsEnabled(event.target.checked)}
            className="switch-input"
          />
        </label>

        <div className="shortcut-grid" style={{ opacity: shortcutsEnabled ? 1 : 0.5, transition: "opacity 0.2s" }}>
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="t-eyebrow" style={{ color: "var(--label-secondary)", marginBottom: 8 }}>{section.title}</h3>
              <dl style={{ margin: 0 }}>
                {section.rows.filter((row) => isAdmin || !row.adminOnly).map((row) => (
                  <div
                    key={row.label}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--separator)" }}
                  >
                    <dt style={{ fontSize: 14, color: "var(--label-body)" }}>{row.label}</dt>
                    <dd style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {row.keys.map((keys, index) => (
                        <span key={keys.join("")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {index > 0 && <span className="t-caption" style={{ color: "var(--label-tertiary)" }}>{row.sep ?? "or"}</span>}
                          <Kbd keys={keys} label={keys.map((key) => KEY_NAMES[key] ?? key).join(" then ")} />
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
