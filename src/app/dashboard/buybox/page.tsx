"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ChevronDown, ChevronUp, Info, Plus, RefreshCw, X } from "lucide-react";
import {
  BUY_BOX_PRIORITIES,
  DEFAULT_BUY_BOX,
  type BuyBoxConfig,
  type BuyBoxPriority,
} from "@/lib/buyBox";

interface BuyBoxResponse {
  config: BuyBoxConfig;
  persisted: boolean;
  updatedAt: string | null;
}

const inputStyle: React.CSSProperties = {
  background: "var(--fill)",
  border: "1px solid var(--separator-strong)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--label)",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--label-secondary)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const PRIORITY_COLORS: Record<BuyBoxPriority, string> = {
  Core: "var(--green)",
  Opportunistic: "var(--blue)",
  Avoid: "var(--red)",
};

/** Form state keeps numbers as strings so fields can be emptied while typing. */
interface FormState {
  yearMin: string;
  yearMax: string;
  maxMileage: string;
  acquisitionMin: string;
  acquisitionMax: string;
  targetRetailMin: string;
  targetRetailMax: string;
  targetMinGross: string;
  radiusMiles: string;
  makeRules: Array<{ make: string; priority: BuyBoxPriority }>;
  excludedKeywords: string[];
}

const toForm = (config: BuyBoxConfig): FormState => ({
  yearMin: config.yearMin?.toString() ?? "",
  yearMax: config.yearMax?.toString() ?? "",
  maxMileage: config.maxMileage?.toString() ?? "",
  acquisitionMin: config.acquisitionMin?.toString() ?? "",
  acquisitionMax: config.acquisitionMax?.toString() ?? "",
  targetRetailMin: config.targetRetailMin?.toString() ?? "",
  targetRetailMax: config.targetRetailMax?.toString() ?? "",
  targetMinGross: config.targetMinGross.toString(),
  radiusMiles: config.radiusMiles.toString(),
  makeRules: config.makeRules,
  excludedKeywords: config.excludedKeywords,
});

const numOrNull = (value: string) => (value.trim() === "" ? null : Number(value));

export default function BuyBoxPage() {
  const [form, setForm] = useState<FormState>(toForm(DEFAULT_BUY_BOX));
  const [persisted, setPersisted] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [makeInput, setMakeInput] = useState("");
  const [makePriority, setMakePriority] = useState<BuyBoxPriority>("Core");
  const [keywordInput, setKeywordInput] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    axios
      .get<BuyBoxResponse>("/api/buybox")
      .then((res) => {
        if (cancelled) return;
        setForm(toForm(res.data.config));
        setPersisted(res.data.persisted);
        setUpdatedAt(res.data.updatedAt);
        setLoadError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load buy box", error);
        setLoadError(
          axios.isAxiosError(error) && error.response?.status === 401
            ? "Your session has expired. Please sign in again."
            : "Couldn't load the buy box. Check your connection and try again."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSaveMessage(null);
  };

  const addMakeRule = () => {
    const make = makeInput.trim();
    if (!make) return;
    setForm((prev) => ({
      ...prev,
      makeRules: [
        ...prev.makeRules.filter((rule) => rule.make.toLowerCase() !== make.toLowerCase()),
        { make, priority: makePriority },
      ],
    }));
    setMakeInput("");
    setSaveMessage(null);
  };

  const addKeyword = () => {
    const keyword = keywordInput.trim();
    if (!keyword) return;
    setForm((prev) => ({
      ...prev,
      excludedKeywords: [
        ...prev.excludedKeywords.filter((existing) => existing.toLowerCase() !== keyword.toLowerCase()),
        keyword,
      ],
    }));
    setKeywordInput("");
    setSaveMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await axios.put<BuyBoxResponse>("/api/buybox", {
        yearMin: numOrNull(form.yearMin),
        yearMax: numOrNull(form.yearMax),
        maxMileage: numOrNull(form.maxMileage),
        acquisitionMin: numOrNull(form.acquisitionMin),
        acquisitionMax: numOrNull(form.acquisitionMax),
        targetRetailMin: numOrNull(form.targetRetailMin),
        targetRetailMax: numOrNull(form.targetRetailMax),
        targetMinGross: numOrNull(form.targetMinGross) ?? 3000,
        radiusMiles: numOrNull(form.radiusMiles) ?? 100,
        makeRules: form.makeRules,
        excludedKeywords: form.excludedKeywords,
      });
      setForm(toForm(res.data.config));
      setPersisted(res.data.persisted);
      setUpdatedAt(res.data.updatedAt);
      setSaveMessage({ kind: "ok", text: "Saved. Feed rankings and dossiers now use these settings." });
    } catch (error) {
      const detail =
        axios.isAxiosError(error) && error.response?.status === 401
          ? "Your session has expired. Please sign in again — unsaved changes will be lost."
          : axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Save failed. Please try again.";
      setSaveMessage({ kind: "error", text: detail });
    } finally {
      setSaving(false);
    }
  };

  const rulesByPriority = useMemo(
    () =>
      BUY_BOX_PRIORITIES.map((priority) => ({
        priority,
        makes: form.makeRules.filter((rule) => rule.priority === priority),
      })),
    [form.makeRules]
  );

  if (loading) {
    return (
      <div className="page" aria-busy="true" style={{ maxWidth: 800 }}>
        <div className="skeleton" style={{ width: 160, height: 36, marginBottom: 10 }} />
        <p className="t-footnote" style={{ color: "var(--label-secondary)", marginBottom: 28 }}>Loading buy box…</p>
        {[220, 260, 120].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: h, borderRadius: "var(--radius-lg)", marginBottom: 16 }} />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page" style={{ maxWidth: 800 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            padding: "60px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(var(--red-rgb), 0.25)",
            background: "rgba(var(--red-rgb), 0.05)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, color: "var(--red)", fontWeight: 600 }}>{loadError}</p>
          <button
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              setReloadKey((value) => value + 1);
            }}
            className="btn btn-secondary pressable"
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <PageHeader
        title="Buy Box"
        subtitle={
          <>
            What your desk wants to acquire.{" "}
            {persisted
              ? `Saved${updatedAt ? ` · updated ${new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}.`
              : "Not saved yet — the feed is using neutral defaults until you save."}
          </>
        }
      />

      {/* How this changes recommendations */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          padding: "12px 16px",
          borderRadius: "var(--radius-md)",
          background: "rgba(var(--tint-rgb), 0.06)",
          border: "1px solid rgba(var(--tint-rgb), 0.2)",
          fontSize: 12.5,
          color: "var(--label-body)",
          lineHeight: 1.6,
        }}
      >
        <Info style={{ width: 15, height: 15, color: "var(--tint-text)", flexShrink: 0, marginTop: 2 }} />
        <span>
          <span style={{ fontWeight: 600, color: "var(--tint-text)" }}>How this changes recommendations:</span>{" "}
          buy-box fit is worth up to 25 of 100 score points (make priority 10, year 4, mileage 4, price band 4, radius 3).
          <span style={{ color: "var(--red)", fontWeight: 600 }}> Avoid</span> makes and excluded keywords force a PASS.
          Your <span style={{ fontWeight: 600 }}>gross target</span> directly sets the recommended max offer
          (conservative retail estimate − gross target − cost assumptions), and the acquisition price band caps it.
          Vehicles missing data score lower, never higher.
        </span>
      </div>

      {/* Essentials */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--separator)", borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 14 }}>
        <h2 className="t-headline" style={{ color: "var(--label)", marginBottom: 16 }}>Essentials</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 18 }}>
          <div>
            <label style={labelStyle} htmlFor="bb-yearmin">Year range</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input id="bb-yearmin" type="number" placeholder="Any" value={form.yearMin} onChange={set("yearMin")} style={inputStyle} />
              <span style={{ color: "var(--label-secondary)", fontSize: 12 }}>to</span>
              <input aria-label="Year max" type="number" placeholder="Any" value={form.yearMax} onChange={set("yearMax")} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="bb-miles">Max mileage</label>
            <input id="bb-miles" type="number" placeholder="Any" value={form.maxMileage} onChange={set("maxMileage")} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="bb-radius">Radius (mi)</label>
            <input id="bb-radius" type="number" min={10} max={500} value={form.radiusMiles} onChange={set("radiusMiles")} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <div>
            <label style={labelStyle} htmlFor="bb-acqmin">Acquisition price band ($)</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input id="bb-acqmin" type="number" placeholder="No min" value={form.acquisitionMin} onChange={set("acquisitionMin")} style={inputStyle} />
              <span style={{ color: "var(--label-secondary)", fontSize: 12 }}>to</span>
              <input aria-label="Acquisition max" type="number" placeholder="No max" value={form.acquisitionMax} onChange={set("acquisitionMax")} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="bb-gross">Target min gross ($)</label>
            <input id="bb-gross" type="number" min={500} value={form.targetMinGross} onChange={set("targetMinGross")} style={inputStyle} />
            <p style={{ fontSize: 11, color: "var(--label-secondary)", marginTop: 5 }}>Planning target — drives the recommended max offer.</p>
          </div>
        </div>
      </div>

      {/* Make priorities */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--separator)", borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 14 }}>
        <h2 className="t-headline" style={{ color: "var(--label)", marginBottom: 4 }}>Make priorities</h2>
        <p style={{ fontSize: 12, color: "var(--label-secondary)", marginBottom: 14 }}>
          Unlisted makes stay neutral. Core scores highest; Avoid is a hard exclusion.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Make, e.g. Porsche"
            aria-label="Make to add"
            value={makeInput}
            onChange={(e) => setMakeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMakeRule(); } }}
            style={{ ...inputStyle, width: 200 }}
          />
          <select
            value={makePriority}
            onChange={(e) => setMakePriority(e.target.value as BuyBoxPriority)}
            aria-label="Priority for the make"
            style={{ ...inputStyle, width: 150, cursor: "pointer" }}
          >
            {BUY_BOX_PRIORITIES.map((priority) => (
              <option key={priority} value={priority} style={{ background: "var(--bg-surface)" }}>
                {priority}
              </option>
            ))}
          </select>
          <button
            onClick={addMakeRule}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, border: "1px solid rgba(var(--tint-rgb), 0.4)", background: "rgba(var(--tint-rgb), 0.1)", color: "var(--tint-text)", cursor: "pointer" }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Add
          </button>
        </div>

        {form.makeRules.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--label-secondary)" }}>No make rules yet — every make is treated neutrally.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rulesByPriority.filter(({ makes }) => makes.length > 0).map(({ priority, makes }) => (
              <div key={priority} style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLORS[priority], textTransform: "uppercase", letterSpacing: "0.05em", width: 100, flexShrink: 0 }}>
                  {priority}
                </span>
                {makes.map((rule) => (
                  <span
                    key={rule.make}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "3px 6px 3px 10px",
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--label)",
                      background: `color-mix(in srgb, ${PRIORITY_COLORS[priority]} 8%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${PRIORITY_COLORS[priority]} 25%, transparent)`,
                    }}
                  >
                    {rule.make}
                    <button
                      aria-label={`Remove ${rule.make}`}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, makeRules: prev.makeRules.filter((r) => r.make !== rule.make) }));
                        setSaveMessage(null);
                      }}
                      style={{ display: "grid", placeItems: "center", width: 16, height: 16, borderRadius: 4, background: "none", border: "none", color: "var(--label-secondary)", cursor: "pointer" }}
                    >
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* More criteria (progressive disclosure) */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--separator)", borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 20 }}>
        <button
          onClick={() => setShowMore((value) => !value)}
          aria-expanded={showMore}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--label)" }}>More criteria</span>
          {showMore ? <ChevronUp style={{ width: 16, height: 16, color: "var(--label-secondary)" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "var(--label-secondary)" }} />}
        </button>

        {showMore && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle} htmlFor="bb-retailmin">Target retail range ($)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: 360 }}>
                <input id="bb-retailmin" type="number" placeholder="No min" value={form.targetRetailMin} onChange={set("targetRetailMin")} style={inputStyle} />
                <span style={{ color: "var(--label-secondary)", fontSize: 12 }}>to</span>
                <input aria-label="Target retail max" type="number" placeholder="No max" value={form.targetRetailMax} onChange={set("targetRetailMax")} style={inputStyle} />
              </div>
              <p style={{ fontSize: 11, color: "var(--label-secondary)", marginTop: 5 }}>Where you want retail estimates to land (informational for now).</p>
            </div>

            <div>
              <label style={labelStyle} htmlFor="bb-keyword">Excluded keywords</label>
              <p style={{ fontSize: 11.5, color: "var(--label-secondary)", marginBottom: 8 }}>
                Hard exclusions matched against title, make, model, and trim — e.g. “salvage”, “rebuilt title”, “flood”.
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <input
                  id="bb-keyword"
                  type="text"
                  placeholder="Keyword"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                  style={{ ...inputStyle, width: 200 }}
                />
                <button
                  onClick={addKeyword}
                  className="btn btn-secondary pressable"
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  Add
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {form.excludedKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 6px 3px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "var(--red)", background: "rgba(var(--red-rgb), 0.08)", border: "1px solid rgba(var(--red-rgb), 0.3)" }}
                  >
                    {keyword}
                    <button
                      aria-label={`Remove keyword ${keyword}`}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, excludedKeywords: prev.excludedKeywords.filter((k) => k !== keyword) }));
                        setSaveMessage(null);
                      }}
                      style={{ display: "grid", placeItems: "center", width: 16, height: 16, borderRadius: 4, background: "none", border: "none", color: "var(--label-secondary)", cursor: "pointer" }}
                    >
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save — a floating action bar that stays reachable while editing */}
      <div
        className="material floating-bar"
        style={{
          position: "sticky",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          marginTop: 8,
          padding: "10px 12px 10px 18px",
          borderRadius: 999,
          border: "1px solid var(--separator)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <span aria-live="polite" style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: saveMessage ? (saveMessage.kind === "ok" ? "var(--green)" : "var(--red)") : "var(--label-secondary)" }}>
          {saveMessage ? <span key={saveMessage.text} className="pop-in" style={{ display: "inline-block" }}>{saveMessage.text}</span> : "Changes apply to feed ranking after you save."}
        </span>
        <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn btn-primary pressable">
          {saving ? "Saving…" : "Save buy box"}
        </button>
      </div>
    </div>
  );
}
