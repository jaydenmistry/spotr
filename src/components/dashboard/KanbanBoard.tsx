"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Clock } from "lucide-react";
import BoardLeadCard from "./BoardLeadCard";
import OutcomeReasonDialog from "./OutcomeReasonDialog";
import axios from "axios";
import { formatCurrency, getVehicleTitle, type LeadRecord } from "@/lib/vehicleAnalytics";
import { getFollowUpStatus, type OutcomeReasonCode } from "@/lib/followUp";
import type { Recommendation } from "@/lib/opportunity";

import { STAGES } from "@/lib/stages";
import { STAGE_COLORS, tone } from "@/lib/ui/colors";

/**
 * Accessible name for a board card's single tab stop. Setting aria-label
 * replaces the computed name entirely, so it has to carry the facts a sighted
 * user triages on — identity, asking price, follow-up urgency — not just
 * "Open dossier". Details beyond these stay in the dossier itself.
 */
function cardAccessibleName(lead: LeadRecord, now?: Date) {
  const status = getFollowUpStatus(lead, now);
  const urgency =
    status === "overdue"
      ? "follow-up overdue"
      : status === "due-soon"
      ? "follow-up due soon"
      : "no urgent follow-up";
  const price = lead.price ? `asking ${formatCurrency(lead.price)}` : "no asking price";
  return `${getVehicleTitle(lead)}, ${price}, ${urgency}. Press Enter to open dossier, Space to start a drag.`;
}

export default function KanbanBoard({
  leads,
  onLeadClick,
  onLeadUpdate,
  now,
  recommendationOf,
}: {
  leads: LeadRecord[];
  onLeadClick: (lead: LeadRecord) => void;
  onLeadUpdate: (updatedLeads: LeadRecord[]) => void;
  /** Shared clock, forwarded to each card's follow-up status. */
  now?: Date;
  /** Recommendation per lead id, computed once by the page. */
  recommendationOf?: (lead: LeadRecord) => Recommendation | undefined;
}) {
  const [mounted, setMounted] = useState(false);
  // Drag-to-Lost is held here until the buyer picks a standardized reason;
  // the drop is only committed (optimistic UI + PATCH) after confirmation.
  const [pendingLost, setPendingLost] = useState<{ leadId: string } | null>(null);
  const [lostBusy, setLostBusy] = useState(false);
  // Drop rejected client-side (e.g. Passed lead dragged to Lost); the server
  // enforces the same rule with a 409.
  const [dropNotice, setDropNotice] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const commitStageChange = async (
    leadId: string,
    newStage: string,
    outcome?: { reason: OutcomeReasonCode; note: string | null }
  ) => {
    const previousLeads = leads;
    onLeadUpdate(
      leads.map((lead) => (lead.id === leadId ? { ...lead, stage: newStage } : lead))
    );

    try {
      await axios.patch("/api/leads", {
        leadId,
        stage: newStage,
        ...(outcome ? { reason: outcome.reason, note: outcome.note ?? undefined } : {}),
      });
    } catch (error) {
      console.error("Failed to update lead status:", error);
      onLeadUpdate(previousLeads);
      setDropNotice(`Couldn't move that lead to ${newStage} — it's back where it was. Please try again.`);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const newStage = destination.droppableId;
    setDropNotice(null);

    if (newStage === "Lost") {
      // A Passed lead can't also be marked Lost — the two outcomes share the
      // reason fields. Mirrors the server's 409 guard.
      const lead = leads.find((candidate) => candidate.id === draggableId);
      if (lead?.passedAt) {
        setDropNotice("This lead is Passed — restore it from Passed before marking it Lost.");
        return;
      }
      setPendingLost({ leadId: draggableId });
      return;
    }

    await commitStageChange(draggableId, newStage);
  };

  if (!mounted) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {pendingLost && (
        <OutcomeReasonDialog
          title="Mark lead as Lost"
          description="A standardized reason is required so the team can see why this lead didn't work out."
          confirmLabel="Mark Lost"
          busy={lostBusy}
          onCancel={() => setPendingLost(null)}
          onConfirm={(reason, note) => {
            setLostBusy(true);
            void commitStageChange(pendingLost.leadId, "Lost", { reason, note }).finally(() => {
              setLostBusy(false);
              setPendingLost(null);
            });
          }}
        />
      )}
    {dropNotice && (
      <div
        role="alert"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
          borderRadius: "var(--radius-md)",
          boxShadow: "inset 0 0 0 1px rgba(var(--red-rgb), 0.28)",
          background: "rgba(var(--red-rgb), 0.1)",
          padding: "9px 14px",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--red)",
        }}
        className="pop-in"
      >
        {dropNotice}
        <button
          onClick={() => setDropNotice(null)}
          aria-label="Dismiss"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--red)",
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    )}
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 420,
          gap: 12,
          overflowX: "auto",
          paddingBottom: 16,
        }}
      >
        {STAGES.map((stage) => {
          const stageLeads = leads.filter(l => l.stage === stage);
          const color = STAGE_COLORS[stage] ?? "var(--label-secondary)";
          const overdueInStage = stageLeads.filter(
            (l) => getFollowUpStatus(l, now) === "overdue"
          ).length;

          return (
            <div
              key={stage}
              style={{
                display: "flex",
                height: "100%",
                width: 288,
                flexShrink: 0,
                flexDirection: "column",
                borderRadius: "var(--radius-lg)",
                background: `linear-gradient(180deg, ${tone(color, 7)}, transparent 120px), rgba(var(--ink-rgb), 0.025)`,
                border: "1px solid var(--separator)",
                padding: "14px 10px 10px",
              }}
            >
              {/* Column header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: color,
                      boxShadow: `0 0 0 3px ${tone(color, 22)}`,
                      flexShrink: 0,
                    }}
                  />
                  <h3
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--label)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stage}
                  </h3>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {overdueInStage > 0 && (
                    <span
                      aria-label={`${overdueInStage} overdue in ${stage}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        borderRadius: 999,
                        padding: "2px 7px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--red)",
                        background: "rgba(var(--red-rgb), 0.14)",
                        border: "1px solid rgba(var(--red-rgb), 0.35)",
                      }}
                    >
                      <Clock style={{ width: 10, height: 10 }} aria-hidden="true" />
                      {overdueInStage}
                    </span>
                  )}
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "2px 9px",
                      fontSize: 11,
                      fontWeight: 600,
                      color,
                      background: `color-mix(in srgb, ${color} 9%, transparent)`,
                    }}
                  >
                    {stageLeads.length}
                  </span>
                </div>
              </div>

              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      borderRadius: "var(--radius-sm)",
                      padding: 4,
                      transition: "background 0.2s, box-shadow 0.2s",
                      background: snapshot.isDraggingOver ? tone(color, 8) : "transparent",
                      boxShadow: snapshot.isDraggingOver
                        ? `inset 0 0 0 2px color-mix(in srgb, ${color} 40%, transparent)`
                        : "inset 0 0 0 1px transparent",
                    }}
                  >
                    {stageLeads.length === 0 && !snapshot.isDraggingOver && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 76,
                          borderRadius: "var(--radius-sm)",
                          border: "1.5px dashed var(--separator-strong)",
                          fontSize: 11.5,
                          color: "var(--label-secondary)",
                          textAlign: "center",
                          padding: "0 12px",
                        }}
                      >
                        Nothing in {stage}
                      </div>
                    )}
                    {stageLeads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{ ...provided.draggableProps.style, marginBottom: 8 }}
                            // dragHandleProps already supplies role="button" and
                            // tabIndex={0}, so this wrapper is the card's single
                            // tab stop — BoardLeadCard stays a plain div.
                            aria-label={cardAccessibleName(lead, now)}
                            onKeyDown={(event) => {
                              // Space belongs to the dnd keyboard sensor, which
                              // binds it at window in the CAPTURE phase and
                              // preventDefaults it to lift the card. Only Enter
                              // opens the dossier, never mid-drag, and never for
                              // a key already handled upstream.
                              if (event.key !== "Enter") return;
                              if (event.defaultPrevented || snapshot.isDragging) return;
                              if (event.target !== event.currentTarget) return;
                              event.preventDefault();
                              onLeadClick(lead);
                            }}
                          >
                            {/* The library owns the outer transform; the lift
                                (tilt + scale + deeper shadow) lives on an inner layer. */}
                            <div
                              style={{
                                borderRadius: "var(--radius-md)",
                                transform: snapshot.isDragging && !snapshot.isDropAnimating ? "rotate(1.5deg) scale(1.035)" : "none",
                                boxShadow: snapshot.isDragging && !snapshot.isDropAnimating ? "var(--shadow-lg)" : "none",
                                transition: "transform var(--spring-bouncy-duration) var(--spring-bouncy), box-shadow 240ms ease",
                              }}
                            >
                              <BoardLeadCard
                                lead={lead}
                                now={now}
                                recommendation={recommendationOf?.(lead)}
                                onClick={() => onLeadClick(lead)}
                              />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
    </div>
  );
}
