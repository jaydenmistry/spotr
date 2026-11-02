import { useId } from "react";

/**
 * The Spotr mark: a spotter's lens — an open ring with a locked-on point —
 * on the signal gradient. The wordmark is set lowercase in the display face.
 */
export function SpotrMark({ size = 32 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8a6bff" />
          <stop offset="0.55" stopColor="#5b7bff" />
          <stop offset="1" stopColor="#3ea6ff" />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}-g)`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="none" stroke={`url(#${id}-s)`} />
      <path d="M22.6 11.2A8 8 0 1 0 24 16" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.1" fill="#fff" />
    </svg>
  );
}

export function SpotrLogo({ size = 32, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.32 }}>
      <SpotrMark size={size} />
      {wordmark && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: size * 0.66,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            color: "var(--label)",
            lineHeight: 1,
          }}
        >
          spotr
        </span>
      )}
    </span>
  );
}
