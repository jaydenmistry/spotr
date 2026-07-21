// @vitest-environment jsdom
//
// Integration tests for the revamped Pipeline: follow-up state propagation
// across board card + stats + filter, view resolution/persistence, combined
// filters, the removed hidden min-price default, safe Pass flow, and optional
// last-activity. Only axios and next/image are mocked — real page/board/stats/
// controls/modal/follow-up wiring runs.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
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

import axios from "axios";
import { DEFAULT_BUY_BOX } from "@/lib/buyBox";
import DashboardPage from "./page";

const TITLE = "2021 Porsche 911 Carrera";

function baseLead(overrides: Record<string, unknown> = {}) {
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
    vdp_url: "https://example.com/listing/1",
    photo_url: "https://example.com/photo.jpg",
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
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    ...overrides,
  };
}

const pastDue = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const dueSoon = new Date(Date.now() + 30 * 60 * 1000).toISOString();

function mockGets(leads: unknown[]) {
  (axios.get as Mock).mockImplementation((url: string) => {
    if (url === "/api/leads") return Promise.resolve({ data: leads });
    if (url === "/api/buybox") {
      return Promise.resolve({ data: { config: DEFAULT_BUY_BOX, persisted: true } });
    }
    if (url === "/api/leads/activity") return Promise.resolve({ data: { activities: [] } });
    return Promise.resolve({ data: {} });
  });
}

/** Reads the numeric value shown on an interactive stat card (Overdue/Due soon/Watching). */
function statValue(name: "Overdue" | "Due soon" | "Watching") {
  const btn = screen.getByRole("button", { name: new RegExp(`^${name}: \\d+`) });
  return within(btn).getAllByText(/^\d+$/)[0]?.textContent ?? "";
}

async function openDossier(user: ReturnType<typeof userEvent.setup>) {
  await user.click((await screen.findAllByText(TITLE))[0]);
  await screen.findByRole("dialog");
}
async function closeDossier(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /close dossier/i }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("Pipeline follow-up propagation (revamp)", () => {
  it("shows a saved past-due action on the board card, Overdue stat, and follow-up filter", async () => {
    const user = userEvent.setup();
    mockGets([baseLead()]); // no follow-up → default view is Board
    (axios.post as Mock).mockResolvedValue({
      data: { lead: baseLead({ nextAction: "Call seller", nextActionAt: pastDue }), activity: { id: "a1" } },
    });

    render(<DashboardPage />);
    await screen.findAllByText(TITLE);
    expect(screen.queryByLabelText(/Follow-up overdue/)).toBeNull();
    expect(statValue("Overdue")).toBe("0");

    await openDossier(user);
    await user.click(screen.getByRole("button", { name: /set next action/i }));
    await user.type(screen.getByPlaceholderText(/call seller about service records/i), "Call seller");
    await user.type(screen.getByLabelText("Due"), "2026-07-20T09:00");
    await user.click(screen.getByRole("button", { name: /save next action/i }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    await closeDossier(user);

    await waitFor(() => expect(screen.getByLabelText(/Follow-up overdue/)).toBeTruthy());
    expect(statValue("Overdue")).toBe("1");

    // The control-bar follow-up filter keeps the lead visible.
    await user.click(screen.getByRole("button", { name: /needs follow-up/i }));
    expect(screen.getAllByText(TITLE).length).toBeGreaterThan(0);
  });

  it("recomputes overdue on the board and stats as the clock passes due time", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      mockGets([baseLead({ nextAction: "Call seller", nextActionAt: dueSoon })]);
      render(<DashboardPage />);
      // due-soon → default view is Needs Attention; the Overdue stat still counts globally.
      await screen.findByRole("tab", { name: /^Board$/ });
      await act(async () => {});
      expect(statValue("Overdue")).toBe("0");

      await act(async () => {
        vi.advanceTimersByTime(60 * 60 * 1000);
      });
      await waitFor(() => expect(statValue("Overdue")).toBe("1"));
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops the lead from the Overdue stat when the action is completed", async () => {
    const user = userEvent.setup();
    const overdue = baseLead({ nextAction: "Call seller", nextActionAt: pastDue, watchedAt: pastDue });
    mockGets([overdue]);
    (axios.post as Mock).mockResolvedValue({
      data: { lead: baseLead({ ...overdue, nextActionCompletedAt: new Date().toISOString() }), activity: { id: "a2" } },
    });

    render(<DashboardPage />);
    await screen.findByRole("tab", { name: /needs attention/i });
    expect(statValue("Overdue")).toBe("1");

    // Complete via the Needs Attention row's Mark done (no dossier needed).
    await user.click(screen.getByRole("button", { name: /mark done/i }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/leads/followup", expect.objectContaining({ op: "complete-next-action" })));
    await waitFor(() => expect(statValue("Overdue")).toBe("0"));
  });
});

describe("Pipeline views", () => {
  it("defaults to Needs Attention when an active lead is overdue, else Board", async () => {
    mockGets([baseLead({ nextAction: "Call", nextActionAt: pastDue })]);
    const { unmount } = render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /needs attention/i }).getAttribute("aria-selected")).toBe("true")
    );
    unmount();
    cleanup();

    mockGets([baseLead()]); // nothing overdue/due-soon
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByRole("tab", { name: /^Board$/ }).getAttribute("aria-selected")).toBe("true"));
  });

  it("keeps the user's selected view through a follow-up update", async () => {
    const user = userEvent.setup();
    const overdue = baseLead({ nextAction: "Call seller", nextActionAt: pastDue, watchedAt: pastDue });
    mockGets([overdue]);
    (axios.post as Mock).mockResolvedValue({
      data: { lead: baseLead({ ...overdue, nextActionCompletedAt: new Date().toISOString() }), activity: { id: "a3" } },
    });

    render(<DashboardPage />);
    // Defaults to attention (overdue exists). User completes the action.
    const attentionTab = await screen.findByRole("tab", { name: /needs attention/i });
    expect(attentionTab.getAttribute("aria-selected")).toBe("true");
    await user.click(screen.getByRole("button", { name: /mark done/i }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    // Even though nothing needs attention now, the view must NOT bounce to Board.
    expect(screen.getByRole("tab", { name: /needs attention/i }).getAttribute("aria-selected")).toBe("true");
  });
});

describe("Pipeline filters", () => {
  it("shows all eligible leads by default (no hidden min-price)", async () => {
    // A cheap lead that the old 75000 default would have hidden.
    mockGets([baseLead({ id: "cheap", price: 8000, listingTitle: "2015 Honda Civic" }), baseLead()]);
    render(<DashboardPage />);
    await screen.findByText("2015 Honda Civic");
    expect(screen.getAllByText(TITLE).length).toBeGreaterThan(0);
    // Both leads visible despite one being well under the old 75000 default.
    expect(screen.getByText("of 2 shown")).toBeTruthy();
  });

  it("intersects watched and overdue filters instead of replacing", async () => {
    const user = userEvent.setup();
    mockGets([
      baseLead({ id: "watched-overdue", listingTitle: "Watched Overdue", watchedAt: pastDue, nextAction: "a", nextActionAt: pastDue }),
      baseLead({ id: "watched-only", listingTitle: "Watched Only", watchedAt: pastDue }),
      baseLead({ id: "overdue-only", listingTitle: "Overdue Only", nextAction: "a", nextActionAt: pastDue }),
    ]);
    render(<DashboardPage />);
    await screen.findByRole("tab", { name: /^Board$/ });
    await user.click(screen.getByRole("tab", { name: /^Board$/ }));

    // Turn on Watched, then Needs follow-up (overdue) → only the intersection.
    await user.click(screen.getByRole("button", { name: /^Watched$/ }));
    await user.click(screen.getByRole("button", { name: /needs follow-up/i }));

    await waitFor(() => expect(screen.getAllByText("Watched Overdue").length).toBeGreaterThan(0));
    expect(screen.queryByText("Watched Only")).toBeNull();
    expect(screen.queryByText("Overdue Only")).toBeNull();
  });
});

describe("Pipeline safe actions", () => {
  it("opens the reason dialog when Pass is clicked and blocks confirm until a reason is chosen", async () => {
    const user = userEvent.setup();
    mockGets([baseLead()]);
    render(<DashboardPage />);
    await openDossier(user);

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Pass$/ }));
    // The reason dialog (labeled by its title) appears with a disabled confirm.
    const reasonDialog = await screen.findByRole("dialog", { name: /Pass on this vehicle/i });
    const confirm = within(reasonDialog).getByRole("button", { name: /^Pass$/ }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    // axios.post must not have fired (no bypass).
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe("Pipeline last-activity", () => {
  it("renders leads with and without lastActivity without error", async () => {
    mockGets([
      baseLead({ id: "with", listingTitle: "Has Activity", lastActivity: { type: "note_added", summary: "Note added", createdAt: pastDue } }),
      baseLead({ id: "without", listingTitle: "No Activity", lastActivity: null }),
    ]);
    render(<DashboardPage />);
    // Board cards mount a frame after the tabs (dnd RAF gate), so poll.
    await screen.findByText("Has Activity");
    expect(screen.getByText("No Activity")).toBeTruthy();
    // Summary renders for the lead that has activity (combined with a timestamp).
    expect(screen.getByText(/Note added/)).toBeTruthy();
  });
});
