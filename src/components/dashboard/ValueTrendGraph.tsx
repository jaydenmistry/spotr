"use client";

import { formatCompactCurrency } from "@/lib/vehicleAnalytics";

export default function ValueTrendGraph({
  points,
  movement,
  compact = false,
}: {
  points: number[];
  movement: "Appreciating" | "Depreciating";
  compact?: boolean;
}) {
  const safePoints = points.length > 1 ? points : [100000, 102000];
  const min = Math.min(...safePoints);
  const max = Math.max(...safePoints);
  const range = max - min || 1;
  const width = 240;
  const height = compact ? 54 : 120;
  const padding = compact ? 6 : 14;
  const color = movement === "Appreciating" ? "var(--green)" : "var(--orange)";

  const coordinates = safePoints.map((point, index) => {
    const x = padding + (index / (safePoints.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const fillPath = `${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div style={{ width: "100%", height: compact ? 56 : undefined }}>
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, fontSize: 12, fontWeight: 500, color: "var(--label-secondary)" }}>
          <span>{formatCompactCurrency(min)}</span>
          <span>12 mo projection</span>
          <span>{formatCompactCurrency(max)}</span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
        role="img"
        aria-label={`Spotr projected value trend (estimate): ${movement}`}
      >
        <path d={fillPath} fill={color} opacity="0.12" />
        <path d={path} pathLength={1} className="draw-line" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={compact ? 3 : 4} />
        {coordinates.map((point) => (
          <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r={compact ? 2.4 : 3.5} fill="var(--bg-card)" stroke={color} strokeWidth="2" />
        ))}
      </svg>
    </div>
  );
}
