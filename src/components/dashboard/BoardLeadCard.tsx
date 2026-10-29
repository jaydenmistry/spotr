"use client";

import { Clock, Eye, MapPin, UserRound } from "lucide-react";
import Image from "next/image";
import {
  formatCurrency,
  formatDistance,
  getVehicleTitle,
  type LeadRecord,
} from "@/lib/vehicleAnalytics";
import type { Recommendation } from "@/lib/opportunity";
import { isTerminalStage } from "@/lib/stages";
import { getFollowUpStatus } from "@/lib/followUp";
import { RECOMMENDATION_COLORS } from "@/lib/ui/colors";

/**
 * Slim board card. Carries only what a buyer needs to triage a column at a
 * glance — identity, asking price, recommendation, follow-up, last activity.
 * Score breakdowns, economics, trend graphs and provenance stay in the dossier.
 */


const badgeBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.01em",
  whiteSpace: "nowrap",
};

/** "in 6h" / "5h ago" — compact and unit-aware. */
function relativeTime(iso: string, now: Date) {
  const deltaMs = new Date(iso).getTime() - now.getTime();
  if (!Number.isFinite(deltaMs)) return "";
  const abs = Math.abs(deltaMs);
  const minutes = Math.round(abs / 60000);
  const value =
    minutes < 60
      ? `${Math.max(minutes, 1)}m`
      : minutes < 60 * 24
      ? `${Math.round(minutes / 60)}h`
      : `${Math.round(minutes / (60 * 24))}d`;
  return deltaMs >= 0 ? `in ${value}` : `${value} ago`;
}

function initialsOf(email: string) {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : local.slice(0, 2);
  return letters.toUpperCase();
}

export default function BoardLeadCard({
  lead,
  onClick,
  now,
  recommendation,
}: {
  lead: LeadRecord;
  onClick: () => void;
  now?: Date;
  recommendation?: Recommendation;
}) {
  const status = getFollowUpStatus(lead, now);
  const isOverdue = status === "overdue";
  const isDueSoon = status === "due-soon";
  const clock = now ?? new Date();
  // Passed outranks Watching, and closed-out leads drop the badge entirely —
  // same precedence the feed and the full card use.
  const showPassed = Boolean(lead.passedAt);
  const showWatching =
    !lead.passedAt && Boolean(lead.watchedAt) && !isTerminalStage(lead.stage);

  return (
    <div
      onClick={onClick}
      className="hover-lift"
      style={{
        cursor: "pointer",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-card)",
        border: "1px solid var(--separator)",
        boxShadow: isOverdue ? "inset 3px 0 0 var(--red), var(--shadow-sm)" : "var(--shadow-sm)",
        padding: "10px 11px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Identity: thumbnail + title + asking price */}
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
        <div
          style={{
            position: "relative",
            width: 54,
            height: 42,
            flexShrink: 0,
            borderRadius: 7,
            overflow: "hidden",
            background: "var(--bg-surface)",
          }}
        >
          {lead.photo_url ? (
            <Image
              src={lead.photo_url}
              alt=""
              fill
              unoptimized
              sizes="54px"
              style={{ objectFit: "cover" }}
            />
          ) : null}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            title={getVehicleTitle(lead)}
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--label)",
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {getVehicleTitle(lead)}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 3,
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--label)" }}>
              {lead.price ? formatCurrency(lead.price) : "No asking price"}
            </span>
            {recommendation && (
              <span
                title="Spotr heuristic recommendation"
                style={{
                  ...badgeBase,
                  color: RECOMMENDATION_COLORS[recommendation],
                  background: `color-mix(in srgb, ${RECOMMENDATION_COLORS[recommendation]} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${RECOMMENDATION_COLORS[recommendation]} 27%, transparent)`,
                }}
              >
                {recommendation}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quiet meta */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11.5,
          color: "var(--label-secondary)",
        }}
      >
        <span>{lead.miles ? `${new Intl.NumberFormat("en-US").format(lead.miles)} mi` : "Miles unknown"}</span>
        <span style={{ color: "var(--label-secondary)" }}>·</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <MapPin style={{ width: 10, height: 10, color: "var(--label-secondary)" }} aria-hidden="true" />
          {formatDistance(lead.distanceMiles)}
        </span>
      </div>

      {/* Follow-up: overdue is loud, due-soon is quiet but visible. Both use
          icon + words, never colour alone. */}
      {isOverdue && lead.nextAction && (
        <div
          role="status"
          aria-label={`Follow-up overdue: ${lead.nextAction}`}
          style={{
            ...badgeBase,
            display: "flex",
            color: "var(--red)",
            background: "rgba(var(--red-rgb), 0.12)",
            border: "1px solid rgba(var(--red-rgb), 0.4)",
            padding: "4px 8px",
            fontSize: 11.5,
          }}
        >
          <Clock style={{ width: 11, height: 11, flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontWeight: 700 }}>Overdue</span>
          <span
            style={{
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            · {lead.nextAction}
          </span>
        </div>
      )}
      {isDueSoon && lead.nextAction && lead.nextActionAt && (
        <p
          style={{
            fontSize: 11.5,
            color: "var(--yellow)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <Clock style={{ width: 10, height: 10, flexShrink: 0 }} aria-hidden="true" />
          Due {relativeTime(lead.nextActionAt, clock)} · {lead.nextAction}
        </p>
      )}

      {/* Last activity — one truncated line; the full trail is in the dossier. */}
      {lead.lastActivity && (
        <p
          title={lead.lastActivity.summary}
          style={{
            fontSize: 11,
            color: "var(--label-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {lead.lastActivity.summary} · {relativeTime(lead.lastActivity.createdAt, clock)}
        </p>
      )}

      {/* Footer: decision badges + assignee */}
      {(showPassed || showWatching || lead.assignedTo) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", gap: 5, minWidth: 0 }}>
            {showPassed && (
              <span
                style={{
                  ...badgeBase,
                  color: "var(--red)",
                  background: "rgba(var(--red-rgb), 0.1)",
                  border: "1px solid rgba(var(--red-rgb), 0.3)",
                }}
              >
                Passed
              </span>
            )}
            {showWatching && (
              <span
                style={{
                  ...badgeBase,
                  color: "var(--tint-text)",
                  background: "rgba(var(--tint-rgb), 0.12)",
                  border: "1px solid rgba(var(--tint-rgb), 0.35)",
                }}
              >
                <Eye style={{ width: 10, height: 10 }} aria-hidden="true" />
                Watching
              </span>
            )}
          </div>
          {lead.assignedTo && (
            <span
              title={`Assigned to ${lead.assignedTo}`}
              aria-label={`Assigned to ${lead.assignedTo}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                flexShrink: 0,
                borderRadius: 999,
                padding: "2px 7px",
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--blue)",
                background: "rgba(var(--blue-rgb), 0.12)",
                border: "1px solid rgba(var(--blue-rgb), 0.3)",
              }}
            >
              <UserRound style={{ width: 9, height: 9 }} aria-hidden="true" />
              {initialsOf(lead.assignedTo)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
