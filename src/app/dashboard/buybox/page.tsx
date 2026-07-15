"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ChevronDown, ChevronUp, Crosshair, Info, Plus, RefreshCw, X } from "lucide-react";
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
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "#f0f4ff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#8b9ab8",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const PRIORITY_COLORS: Record<BuyBoxPriority, string> = {
  Core: "#34d399",
  Opportunistic: "#60a5fa",
  Avoid: "#f87171",
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
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
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
      <div style={{ display: "flex", height: "60vh", alignItems: "center", justifyContent: "center", color: "#8b9ab8", fontSize: 15, gap: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,122,26,0.2)", borderTopColor: "#ff7a1a", animation: "spin 0.8s linear infinite" }} />
        Loading buy box…
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: "32px 28px", maxWidth: 760 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            padding: "60px 20px",
            borderRadius: 12,
            border: "1px solid rgba(248,113,113,0.25)",
            background: "rgba(248,113,113,0.05)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, color: "#f87171", fontWeight: 600 }}>{loadError}</p>
          <button
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              setReloadKey((value) => value + 1);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f4ff", cursor: "pointer" }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 28px", maxWidth: 760 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", color: "#f0f4ff", marginBottom: 4 }}>
          <Crosshair style={{ width: 26, height: 26, color: "#ff7a1a" }} />
          Buy Box
        </h1>
        <p style={{ fontSize: 13, color: "#8b9ab8" }}>
          What your desk wants to acquire. {persisted
            ? `Saved${updatedAt ? ` · updated ${new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}.`
            : "Not saved yet — the feed is using neutral defaults until you save."}
        </p>
      </div>

      {/* How this changes recommendations */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          padding: "12px 16px",
          borderRadius: 12,
          background: "rgba(255,122,26,0.06)",
          border: "1px solid rgba(255,122,26,0.2)",
          fontSize: 12.5,
          color: "#c6d0e2",
          lineHeight: 1.6,
        }}
      >
        <Info style={{ width: 15, height: 15, color: "#ff9147", flexShrink: 0, marginTop: 2 }} />
        <span>
          <span style={{ fontWeight: 700, color: "#ff9147" }}>How this changes recommendations:</span>{" "}
          buy-box fit is worth up to 25 of 100 score points (make priority 10, year 4, mileage 4, price band 4, radius 3).
          <span style={{ color: "#f87171", fontWeight: 700 }}> Avoid</span> makes and excluded keywords force a PASS.
          Your <span style={{ fontWeight: 700 }}>gross target</span> directly sets the recommended max offer
          (conservative retail estimate − gross target − cost assumptions), and the acquisition price band caps it.
          Vehicles missing data score lower, never higher.
        </span>
      </div>

      {/* Essentials */}
      <div style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#f0f4ff", marginBottom: 16 }}>Essentials</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 18 }}>
          <div>
            <label style={labelStyle} htmlFor="bb-yearmin">Year range</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input id="bb-yearmin" type="number" placeholder="Any" value={form.yearMin} onChange={set("yearMin")} style={inputStyle} />
              <span style={{ color: "#4a5670", fontSize: 12 }}>to</span>
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
              <span style={{ color: "#4a5670", fontSize: 12 }}>to</span>
              <input aria-label="Acquisition max" type="number" placeholder="No max" value={form.acquisitionMax} onChange={set("acquisitionMax")} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="bb-gross">Target min gross ($)</label>
            <input id="bb-gross" type="number" min={500} value={form.targetMinGross} onChange={set("targetMinGross")} style={inputStyle} />
            <p style={{ fontSize: 11, color: "#4a5670", marginTop: 5 }}>Planning target — drives the recommended max offer.</p>
          </div>
        </div>
      </div>

      {/* Make priorities */}
      <div style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#f0f4ff", marginBottom: 4 }}>Make priorities</h2>
        <p style={{ fontSize: 12, color: "#8b9ab8", marginBottom: 14 }}>
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
              <option key={priority} value={priority} style={{ background: "#0f1520" }}>
                {priority}
              </option>
            ))}
          </select>
          <button
            onClick={addMakeRule}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "1px solid rgba(255,122,26,0.4)", background: "rgba(255,122,26,0.1)", color: "#ff9147", cursor: "pointer" }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Add
          </button>
        </div>

        {form.makeRules.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "#4a5670" }}>No make rules yet — every make is treated neutrally.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rulesByPriority.filter(({ makes }) => makes.length > 0).map(({ priority, makes }) => (
              <div key={priority} style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: PRIORITY_COLORS[priority], textTransform: "uppercase", letterSpacing: "0.05em", width: 100, flexShrink: 0 }}>
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
                      fontWeight: 700,
                      color: "#f0f4ff",
                      background: `${PRIORITY_COLORS[priority]}14`,
                      border: `1px solid ${PRIORITY_COLORS[priority]}40`,
                    }}
                  >
                    {rule.make}
                    <button
                      aria-label={`Remove ${rule.make}`}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, makeRules: prev.makeRules.filter((r) => r.make !== rule.make) }));
                        setSaveMessage(null);
                      }}
                      style={{ display: "grid", placeItems: "center", width: 16, height: 16, borderRadius: 4, background: "none", border: "none", color: "#8b9ab8", cursor: "pointer" }}
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
      <div style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <button
          onClick={() => setShowMore((value) => !value)}
          aria-expanded={showMore}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <span style={{ fontSize: 15, fontWeight: 800, color: "#f0f4ff" }}>More criteria</span>
          {showMore ? <ChevronUp style={{ width: 16, height: 16, color: "#8b9ab8" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "#8b9ab8" }} />}
        </button>

        {showMore && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle} htmlFor="bb-retailmin">Target retail range ($)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: 360 }}>
                <input id="bb-retailmin" type="number" placeholder="No min" value={form.targetRetailMin} onChange={set("targetRetailMin")} style={inputStyle} />
                <span style={{ color: "#4a5670", fontSize: 12 }}>to</span>
                <input aria-label="Target retail max" type="number" placeholder="No max" value={form.targetRetailMax} onChange={set("targetRetailMax")} style={inputStyle} />
              </div>
              <p style={{ fontSize: 11, color: "#4a5670", marginTop: 5 }}>Where you want retail estimates to land (informational for now).</p>
            </div>

            <div>
              <label style={labelStyle} htmlFor="bb-keyword">Excluded keywords</label>
              <p style={{ fontSize: 11.5, color: "#4a5670", marginBottom: 8 }}>
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
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f4ff", cursor: "pointer" }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  Add
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {form.excludedKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 6px 3px 10px", borderRadius: 7, fontSize: 12, fontWeight: 700, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)" }}
                  >
                    {keyword}
                    <button
                      aria-label={`Remove keyword ${keyword}`}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, excludedKeywords: prev.excludedKeywords.filter((k) => k !== keyword) }));
                        setSaveMessage(null);
                      }}
                      style={{ display: "grid", placeItems: "center", width: 16, height: 16, borderRadius: 4, background: "none", border: "none", color: "#8b9ab8", cursor: "pointer" }}
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

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 26px",
            borderRadius: 10,
            border: "none",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            cursor: saving ? "not-allowed" : "pointer",
            background: saving ? "rgba(255,122,26,0.4)" : "linear-gradient(135deg, #ff7a1a, #f59e0b)",
            boxShadow: saving ? "none" : "0 4px 16px rgba(255,122,26,0.35)",
          }}
        >
          {saving ? "Saving…" : "Save buy box"}
        </button>
        {saveMessage && (
          <span style={{ fontSize: 13, fontWeight: 600, color: saveMessage.kind === "ok" ? "#34d399" : "#f87171" }}>
            {saveMessage.text}
          </span>
        )}
      </div>
    </div>
  );
}
