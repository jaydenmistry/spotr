"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import LeadCard from "./LeadCard";
import axios from "axios";
import type { LeadRecord } from "@/lib/vehicleAnalytics";

const STAGES = ["New Leads", "Contacted", "Appraisal", "Offer Made", "Acquired", "Lost"];

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

    // Optimistic UI update
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
      // Revert on failure
      onLeadUpdate(leads);
    }
  };

  if (!mounted) return null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-[calc(100vh-16rem)] gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter(l => l.stage === stage);

          return (
            <div key={stage} className="flex h-full w-80 flex-shrink-0 flex-col rounded-lg bg-gray-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">{stage}</h3>
                <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-600">
                  {stageLeads.length}
                </span>
              </div>

              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto transition-colors ${
                      snapshot.isDraggingOver ? "bg-orange-50" : ""
                    }`}
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
                              opacity: snapshot.isDragging ? 0.8 : 1,
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
