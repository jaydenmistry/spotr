// @vitest-environment jsdom
//
// Board card keyboard behaviour, tested through the real @hello-pangea/dnd
// Draggable wrapper rather than on BoardLeadCard in isolation — the previous
// standalone tests could not see the drag-handle interaction at all.
//
// The library's keyboard sensor binds Space at window in the CAPTURE phase and
// preventDefaults it to lift the card, so Space must never also open the
// dossier. Enter is unused by the sensor and is the open key.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";

vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), isAxiosError: () => false },
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />
  ),
}));

import KanbanBoard from "./KanbanBoard";
import type { LeadRecord } from "@/lib/vehicleAnalytics";

const NOW = new Date("2026-07-22T12:00:00.000Z");

function lead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead-1",
    vin: "WP0AB2A99MS220001",
    year: 2021,
    make: "Porsche",
    model: "911",
    listingTitle: "2021 Porsche 911 Carrera",
    price: 128000,
    miles: 12000,
    distanceMiles: 24,
    searchZip: "30043",
    searchRadius: 100,
    city: "Duluth",
    state: "GA",
    source: "marketcheck",
    vdp_url: null,
    photo_url: null,
    stage: "Contacted",
    sellerName: null,
    watchedAt: null,
    passedAt: null,
    assignedTo: null,
    nextAction: null,
    nextActionAt: null,
    nextActionCompletedAt: null,
    outcomeReason: null,
    outcomeNote: null,
    lastActivity: null,
    createdAt: "2026-07-19T12:00:00.000Z",
    updatedAt: "2026-07-19T12:00:00.000Z",
    ...overrides,
  } as LeadRecord;
}

function renderBoard(onLeadClick = vi.fn(), leads: LeadRecord[] = [lead()]) {
  render(
    <KanbanBoard
      leads={leads}
      now={NOW}
      onLeadClick={onLeadClick}
      onLeadUpdate={() => {}}
    />
  );
  return onLeadClick;
}

/** The card's single tab stop: the dnd drag handle carrying our aria-label. */
async function findCardHandle() {
  return screen.findByRole("button", { name: /2021 Porsche 911 Carrera/i });
}

afterEach(cleanup);

describe("KanbanBoard card keyboard activation", () => {
  it("exposes exactly one focusable button per card", async () => {
    renderBoard();
    const handles = await screen.findAllByRole("button", {
      name: /2021 Porsche 911 Carrera/i,
    });
    expect(handles).toHaveLength(1);
    expect(handles[0].getAttribute("tabindex")).toBe("0");
  });

  it("names the card with price and follow-up urgency, not just 'open dossier'", async () => {
    renderBoard(vi.fn(), [
      lead({ nextAction: "Call seller", nextActionAt: "2026-07-20T12:00:00.000Z" }),
    ]);
    const handle = await findCardHandle();
    const name = handle.getAttribute("aria-label")!;
    expect(name).toMatch(/asking \$128,000/i);
    expect(name).toMatch(/follow-up overdue/i);
    expect(name).toMatch(/press enter to open dossier/i);
  });

  it("reports 'no asking price' in the accessible name when price is missing", async () => {
    renderBoard(vi.fn(), [lead({ price: null })]);
    const handle = await findCardHandle();
    expect(handle.getAttribute("aria-label")).toMatch(/no asking price/i);
  });

  it("opens the dossier on Enter", async () => {
    const user = userEvent.setup();
    const onLeadClick = renderBoard();
    const handle = await findCardHandle();

    handle.focus();
    await user.keyboard("{Enter}");
    expect(onLeadClick).toHaveBeenCalledTimes(1);
  });

  it("does NOT open the dossier on Space — that key belongs to the drag sensor", async () => {
    const user = userEvent.setup();
    const onLeadClick = renderBoard();
    const handle = await findCardHandle();

    handle.focus();
    await user.keyboard(" ");
    // Regression: Space previously started a keyboard drag AND opened the modal.
    expect(onLeadClick).not.toHaveBeenCalled();
  });

  it("ignores an Enter already handled upstream (defaultPrevented)", async () => {
    const onLeadClick = renderBoard();
    const handle = await findCardHandle();

    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    event.preventDefault();
    handle.dispatchEvent(event);

    expect(onLeadClick).not.toHaveBeenCalled();
  });

  it("ignores Enter bubbling up from a nested control", async () => {
    const onLeadClick = renderBoard();
    const handle = await findCardHandle();

    const nested = document.createElement("button");
    handle.appendChild(nested);
    nested.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(onLeadClick).not.toHaveBeenCalled();
  });

  it("still opens the dossier on pointer click", async () => {
    const user = userEvent.setup();
    const onLeadClick = renderBoard();
    await user.click(await screen.findByText("2021 Porsche 911 Carrera"));
    expect(onLeadClick).toHaveBeenCalledTimes(1);
  });
});
