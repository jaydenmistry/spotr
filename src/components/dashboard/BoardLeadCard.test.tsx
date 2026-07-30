// @vitest-environment jsdom
//
// Slim board card: listing freshness, keyboard operability without hijacking
// nested controls, and the historic (non-instructional) treatment of
// recommendations on closed-out leads.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";

vi.mock("next/image", () => ({
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />
  ),
}));

import BoardLeadCard from "./BoardLeadCard";
import type { LeadRecord } from "@/lib/vehicleAnalytics";

const NOW = new Date("2026-07-22T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

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
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
    ...overrides,
  } as LeadRecord;
}

afterEach(cleanup);

describe("BoardLeadCard listing freshness", () => {
  it.each([
    [daysAgo(0), "Seen today"],
    [daysAgo(3), "Seen 3d ago"],
    [daysAgo(14), "Seen 2w ago"],
    [daysAgo(90), "Seen 3mo ago"],
  ])("renders %s as %s", (createdAt, expected) => {
    render(<BoardLeadCard lead={lead({ createdAt })} onClick={() => {}} now={NOW} />);
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it("never uses 'Listed' wording, which would imply a verified seller posting time", () => {
    const { container } = render(<BoardLeadCard lead={lead()} onClick={() => {}} now={NOW} />);
    expect(container.textContent).not.toMatch(/Listed/);
  });

  it.each([
    ["missing", null],
    ["unparseable", "not-a-date"],
    ["in the future", new Date(NOW.getTime() + 86_400_000).toISOString()],
  ])("shows 'Age unknown' when the timestamp is %s", (_label, createdAt) => {
    render(
      <BoardLeadCard
        lead={lead({ createdAt: createdAt as unknown as string })}
        onClick={() => {}}
        now={NOW}
      />
    );
    expect(screen.getByText("Age unknown")).toBeTruthy();
  });

  it("discloses the timestamp is Spotr record time, not a verified posting time", () => {
    render(<BoardLeadCard lead={lead()} onClick={() => {}} now={NOW} />);
    const age = screen.getByText("Seen 3d ago");
    expect(age.getAttribute("title")).toMatch(/not a verified seller posting time/i);
  });
});

describe("BoardLeadCard interaction surface", () => {
  // Keyboard activation deliberately lives on the dnd drag handle in
  // KanbanBoard, not here — see KanbanBoard.test.tsx. This card must NOT add a
  // competing focus target, or every card gets two tab stops and a
  // button-inside-button.
  it("adds no focusable element and no button role of its own", () => {
    const { container } = render(<BoardLeadCard lead={lead()} onClick={() => {}} now={NOW} />);
    expect(container.querySelector('[role="button"]')).toBeNull();
    expect(container.querySelector("[tabindex]")).toBeNull();
  });

  it("still opens on pointer click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container } = render(<BoardLeadCard lead={lead()} onClick={onClick} now={NOW} />);
    await user.click(container.firstElementChild as HTMLElement);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("BoardLeadCard last-activity PII containment", () => {
  it("does not render buyer free text from a next_action_set summary", () => {
    const { container } = render(
      <BoardLeadCard
        lead={lead({
          lastActivity: {
            type: "next_action_set",
            summary: 'Next action set: "Call seller Jane at 404-555-0199"',
            createdAt: daysAgo(1),
          },
        })}
        onClick={() => {}}
        now={NOW}
      />
    );
    expect(container.textContent).not.toContain("404-555-0199");
    expect(container.textContent).not.toContain("Jane");
    expect(screen.getByText(/Next action set ·/)).toBeTruthy();
  });

  it("does not render buyer free text from a next_action_completed summary", () => {
    const { container } = render(
      <BoardLeadCard
        lead={lead({
          lastActivity: {
            type: "next_action_completed",
            summary: 'Completed next action: "Texted seller 404-555-0199"',
            createdAt: daysAgo(1),
          },
        })}
        onClick={() => {}}
        now={NOW}
      />
    );
    expect(container.textContent).not.toContain("404-555-0199");
    expect(screen.getByText(/Next action completed ·/)).toBeTruthy();
  });

  it("never attaches a tooltip carrying free-text summaries", () => {
    render(
      <BoardLeadCard
        lead={lead({
          lastActivity: {
            type: "next_action_set",
            summary: 'Next action set: "Call 404-555-0199"',
            createdAt: daysAgo(1),
          },
        })}
        onClick={() => {}}
        now={NOW}
      />
    );
    const line = screen.getByText(/Next action set ·/);
    expect(line.getAttribute("title")).toBeNull();
  });

  it("fails closed for unknown activity types", () => {
    const { container } = render(
      <BoardLeadCard
        lead={lead({
          lastActivity: {
            type: "some_future_type",
            summary: "Leaked seller detail 404-555-0199",
            createdAt: daysAgo(1),
          },
        })}
        onClick={() => {}}
        now={NOW}
      />
    );
    expect(container.textContent).not.toContain("404-555-0199");
    expect(screen.getByText(/Some future type ·/)).toBeTruthy();
  });

  it("still shows template-only summaries verbatim, with a tooltip", () => {
    render(
      <BoardLeadCard
        lead={lead({
          lastActivity: { type: "stage_changed", summary: "Stage changed: New Leads → Contacted", createdAt: daysAgo(1) },
        })}
        onClick={() => {}}
        now={NOW}
      />
    );
    const line = screen.getByText(/Stage changed: New Leads → Contacted ·/);
    expect(line.getAttribute("title")).toBe("Stage changed: New Leads → Contacted");
  });

  it("never renders seller identity fields even when present on the lead", () => {
    const { container } = render(
      <BoardLeadCard
        lead={lead({ sellerName: "Jane Doe", sellerPhone: "404-555-0199" })}
        onClick={() => {}}
        now={NOW}
      />
    );
    expect(container.textContent).not.toContain("Jane Doe");
    expect(container.textContent).not.toContain("404-555-0199");
    expect(container.innerHTML).not.toContain("404-555-0199");
  });
});

describe("BoardLeadCard recommendation treatment", () => {
  it("shows an active recommendation as a live chip on open leads", () => {
    render(<BoardLeadCard lead={lead()} onClick={() => {}} now={NOW} recommendation="BUY" />);
    const chip = screen.getByText("BUY");
    expect(chip.getAttribute("title")).toMatch(/estimate, not market data/i);
  });

  it("downgrades the recommendation to historic on a passed lead", () => {
    render(
      <BoardLeadCard
        lead={lead({ passedAt: daysAgo(1) })}
        onClick={() => {}}
        now={NOW}
        recommendation="BUY"
      />
    );
    expect(screen.queryByText("BUY")).toBeNull();
    const historic = screen.getByText("was BUY");
    expect(historic.getAttribute("title")).toMatch(/not a current instruction/i);
  });

  it("downgrades the recommendation to historic on a terminal-stage lead", () => {
    render(
      <BoardLeadCard
        lead={lead({ stage: "Lost" })}
        onClick={() => {}}
        now={NOW}
        recommendation="INVESTIGATE"
      />
    );
    expect(screen.queryByText("INVESTIGATE")).toBeNull();
    expect(screen.getByText("was INVESTIGATE")).toBeTruthy();
  });
});
