"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import LeadCard from "./LeadCard";
import axios from "axios";
import type { LeadRecord } from "@/lib/vehicleAnalytics";

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
  onLeadUpdate
}: {
  leads: LeadRecord[];
  onLeadClick: (lead: LeadRecord) => void;
  onLeadUpdate: (updatedLeads: LeadRecord[]) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

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

    const updatedLeads = leads.map(lead =>
      lead.id === draggableId ? { ...lead, stage: newStage } : lead
    );

    onLeadUpdate(updatedLeads);

    try {
      await axios.patch("/api/leads", {
        leadId: draggableId,
        stage: newStage
      });
    } catch (error) {
      console.error("Failed to update lead status:", error);
      onLeadUpdate(leads);
    }
  };

  if (!mounted) return null;

  return (
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
                            <LeadCard lead={lead} onClick={() => onLeadClick(lead)} />
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
  );
}
