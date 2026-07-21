"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import LeadCard from "./LeadCard";
import OutcomeReasonDialog from "./OutcomeReasonDialog";
import axios from "axios";
import type { LeadRecord } from "@/lib/vehicleAnalytics";
import type { OutcomeReasonCode } from "@/lib/followUp";

import { STAGES } from "@/lib/stages";

const STAGE_COLORS: Record<string, string> = {
  "New Leads": "#60a5fa",
  "Contacted": "#ff9147",
  "Appraisal": "#a78bfa",
  "Offer Made": "#f59e0b",
  "Acquired": "#34d399",
  "Lost": "#f87171",
};

export default function KanbanBoard({
  leads,
  onLeadClick,
  onLeadUpdate,
  now,
}: {
  leads: LeadRecord[];
  onLeadClick: (lead: LeadRecord) => void;
  onLeadUpdate: (updatedLeads: LeadRecord[]) => void;
  /** Shared clock, forwarded to each card's follow-up status. */
  now?: Date;
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
    <>
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
        role="status"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
          borderRadius: 10,
          border: "1px solid rgba(251,191,36,0.4)",
          background: "rgba(251,191,36,0.08)",
          padding: "9px 14px",
          fontSize: 12.5,
          fontWeight: 600,
          color: "#fbbf24",
        }}
      >
        {dropNotice}
        <button
          onClick={() => setDropNotice(null)}
          aria-label="Dismiss"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#fbbf24",
            fontSize: 14,
            fontWeight: 700,
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
          height: "calc(100vh - 20rem)",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 16,
        }}
      >
        {STAGES.map((stage) => {
          const stageLeads = leads.filter(l => l.stage === stage);
          const color = STAGE_COLORS[stage] ?? "#8b9ab8";

          return (
            <div
              key={stage}
              style={{
                display: "flex",
                height: "100%",
                width: 300,
                flexShrink: 0,
                flexDirection: "column",
                borderRadius: 14,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "14px 12px",
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  <h3
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#f0f4ff",
                    }}
                  >
                    {stage}
                  </h3>
                </div>
                <span
                  style={{
                    borderRadius: 100,
                    padding: "2px 9px",
                    fontSize: 11,
                    fontWeight: 700,
                    color,
                    background: `${color}18`,
                  }}
                >
                  {stageLeads.length}
                </span>
              </div>

              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      borderRadius: 10,
                      transition: "background 0.15s",
                      background: snapshot.isDraggingOver
                        ? "rgba(255,122,26,0.04)"
                        : "transparent",
                    }}
                  >
                    {stageLeads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.85 : 1,
                            }}
                          >
                            <LeadCard lead={lead} now={now} onClick={() => onLeadClick(lead)} />
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
    </>
  );
}
