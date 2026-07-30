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
    // The overdue badge is a static badge (no live region), so assert on the
    // action text it renders rather than an aria-label. Scoped to the action
    // string so it can't collide with the "Overdue" header stat label.
    expect(screen.queryByText(/· Call seller/)).toBeNull();
    expect(statValue("Overdue")).toBe("0");

    await openDossier(user);
    await user.click(screen.getByRole("button", { name: /set next action/i }));
    await user.type(screen.getByPlaceholderText(/call seller about service records/i), "Call seller");
    await user.type(screen.getByLabelText("Due"), "2026-07-20T09:00");
    await user.click(screen.getByRole("button", { name: /save next action/i }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    await closeDossier(user);

    await waitFor(() => expect(screen.getByText(/· Call seller/)).toBeTruthy());
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

describe("Pipeline explicit radius filter", () => {
  it("does not filter by distance until the user supplies a radius", async () => {
    const user = userEvent.setup();
    // DEFAULT_BUY_BOX carries a 100-mile radius. A lead 260mi out must still
    // show: the Buy Box radius is never a hidden Pipeline filter.
    mockGets([
      baseLead({ id: "near", listingTitle: "Near Lead", distanceMiles: 12 }),
      baseLead({ id: "far", listingTitle: "Far Lead", distanceMiles: 260 }),
      baseLead({ id: "unknown", listingTitle: "Unknown Distance", distanceMiles: null }),
    ]);
    render(<DashboardPage />);
    await screen.findByText("Far Lead");
    expect(screen.getByText("of 3 shown")).toBeTruthy();

    // Now supply an explicit radius — only then does distance constrain.
    await user.click(screen.getByRole("button", { name: /more filters/i }));
    await user.type(screen.getByLabelText(/maximum distance in miles/i), "50");

    await waitFor(() => expect(screen.queryByText("Far Lead")).toBeNull());
    expect(screen.getAllByText("Near Lead").length).toBeGreaterThan(0);
    // Documented behaviour preserved: unknown distance is never hidden.
    expect(screen.getAllByText("Unknown Distance").length).toBeGreaterThan(0);
    // Surfaced both in the field's help text and in the result summary.
    expect(screen.getAllByText(/within 50 mi/).length).toBeGreaterThan(1);
  });

  it("starts blank and is cleared by Clear all", async () => {
    const user = userEvent.setup();
    mockGets([baseLead({ id: "far", listingTitle: "Far Lead", distanceMiles: 260 })]);
    render(<DashboardPage />);
    await screen.findByRole("button", { name: /more filters/i });
    await user.click(screen.getByRole("button", { name: /more filters/i }));

    const radius = screen.getByLabelText(/maximum distance in miles/i) as HTMLInputElement;
    expect(radius.value).toBe("");

    await user.type(radius, "50");
    await waitFor(() => expect(screen.queryByText("Far Lead")).toBeNull());

    await user.click(screen.getByRole("button", { name: /clear all/i }));
    await waitFor(() => expect(screen.getAllByText("Far Lead").length).toBeGreaterThan(0));
  });
});

describe("Pipeline result-count copy", () => {
  // A plain lead is in `visible` but is NOT an attention entry (not watched,
  // not assigned, nothing scheduled), so the two counts genuinely differ —
  // which is exactly the confusion this copy fix removes.
  const overdueWatched = baseLead({
    id: "od",
    listingTitle: "Overdue Watched",
    watchedAt: pastDue,
    nextAction: "Call",
    nextActionAt: pastDue,
  });

  it("counts rendered attention entries, not the visible-lead total", async () => {
    mockGets([overdueWatched, baseLead({ id: "p1", listingTitle: "Plain One" }), baseLead({ id: "p2", listingTitle: "Plain Two" })]);
    render(<DashboardPage />);
    // Overdue present → defaults to Needs Attention.
    await screen.findByRole("heading", { name: /^Overdue$/ });

    expect(screen.getByText(/1 lead needs attention/)).toBeTruthy();
    // The old copy quoted every visible lead beside a single rendered row.
    expect(screen.queryByText(/of 3 shown/)).toBeNull();
  });

  it("pluralises when several leads need attention", async () => {
    mockGets([
      overdueWatched,
      baseLead({ id: "od2", listingTitle: "Overdue Two", watchedAt: pastDue, nextAction: "Call", nextActionAt: pastDue }),
      baseLead({ id: "p1", listingTitle: "Plain One" }),
    ]);
    render(<DashboardPage />);
    await screen.findByRole("heading", { name: /^Overdue$/ });
    expect(screen.getByText(/2 leads need attention/)).toBeTruthy();
  });

  it("keeps the N-of-M result count on the Board", async () => {
    const user = userEvent.setup();
    mockGets([overdueWatched, baseLead({ id: "p1", listingTitle: "Plain One" }), baseLead({ id: "p2", listingTitle: "Plain Two" })]);
    render(<DashboardPage />);
    await user.click(await screen.findByRole("tab", { name: /^Board$/ }));

    await waitFor(() => expect(screen.getByText("of 3 shown")).toBeTruthy());
    expect(screen.queryByText(/needs? attention$/)).toBeNull();
  });

  it("still flags the Board count as filtered when explicit filters are active", async () => {
    const user = userEvent.setup();
    mockGets([overdueWatched, baseLead({ id: "p1", listingTitle: "Plain One" })]);
    render(<DashboardPage />);
    await user.click(await screen.findByRole("tab", { name: /^Board$/ }));
    await user.click(screen.getByRole("button", { name: /^Watched$/ }));

    await waitFor(() => expect(screen.getByText("of 2 shown")).toBeTruthy());
    expect(screen.getByText(/^filtered/)).toBeTruthy();
  });

  it("shrinks the attention count to match the entries an explicit filter leaves", async () => {
    const user = userEvent.setup();
    mockGets([
      overdueWatched,
      baseLead({
        id: "od2",
        listingTitle: "Overdue Two",
        make: "Toyota",
        watchedAt: pastDue,
        nextAction: "Call",
        nextActionAt: pastDue,
      }),
    ]);
    render(<DashboardPage />);
    await screen.findByRole("heading", { name: /^Overdue$/ });
    expect(screen.getByText(/2 leads need attention/)).toBeTruthy();

    // Search narrows to the Porsche lead only.
    await user.type(screen.getByLabelText(/search leads/i), "Porsche");

    await waitFor(() => expect(screen.getByText(/1 lead needs attention/)).toBeTruthy());
    // Count matches the rows actually rendered.
    expect(screen.getAllByRole("button", { name: /open dossier/i })).toHaveLength(1);
    expect(screen.queryByText("Overdue Two")).toBeNull();
  });

  it("falls back to the empty state with no misleading total when nothing needs attention", async () => {
    const user = userEvent.setup();
    // No follow-ups and nothing watched/assigned → zero attention entries.
    mockGets([baseLead({ id: "p1", listingTitle: "Plain One" }), baseLead({ id: "p2", listingTitle: "Plain Two" })]);
    render(<DashboardPage />);
    // Nothing overdue/due-soon → defaults to Board; switch across manually.
    await user.click(await screen.findByRole("tab", { name: /needs attention/i }));

    await screen.findByText(/Nothing needs attention/i);
    expect(screen.queryByText(/of 2 shown/)).toBeNull();
    expect(screen.queryByText(/0 leads? needs? attention/)).toBeNull();
  });
});

describe("Pipeline radius input sanitising", () => {
  it("rejects zero, negative and non-numeric entries rather than silently disabling the filter", async () => {
    const user = userEvent.setup();
    mockGets([baseLead({ id: "far", listingTitle: "Far Lead", distanceMiles: 260 })]);
    render(<DashboardPage />);
    await user.click(await screen.findByRole("button", { name: /more filters/i }));
    const radius = screen.getByLabelText(/maximum distance in miles/i) as HTMLInputElement;

    // "0" would make Number(x) falsy → Infinity → filter silently inactive.
    await user.type(radius, "0");
    expect(radius.value).toBe("");

    await user.type(radius, "-5");
    expect(radius.value).toBe("5");

    await user.clear(radius);
    await user.type(radius, "abc");
    expect(radius.value).toBe("");

    // Far lead never disappeared, because no valid radius was ever set.
    expect(screen.getAllByText("Far Lead").length).toBeGreaterThan(0);
  });
});

describe("Pipeline movement honesty", () => {
  it("labels the movement control as a Spotr heuristic estimate, never as market data", async () => {
    const user = userEvent.setup();
    mockGets([baseLead()]);
    render(<DashboardPage />);
    await screen.findByRole("button", { name: /more filters/i });
    await user.click(screen.getByRole("button", { name: /more filters/i }));

    expect(screen.getByText(/Spotr projected movement/i)).toBeTruthy();
    expect(screen.getByText(/Estimate based on Spotr heuristic — not market data\./i)).toBeTruthy();

    // Options read as projections, not as factual observed movement.
    const select = screen.getByLabelText(/spotr projected movement/i);
    const labels = within(select).getAllByRole("option").map((o) => o.textContent);
    expect(labels).toEqual(["All projected movement", "Projected upward", "Projected downward"]);
    expect(labels).not.toContain("Appreciating");
    expect(labels).not.toContain("Depreciating");
  });
});

describe("Pipeline follow-up toggle", () => {
  it("clears to all from the overdue state", async () => {
    const user = userEvent.setup();
    mockGets([
      baseLead({ id: "od", listingTitle: "Overdue Lead", nextAction: "a", nextActionAt: pastDue }),
      baseLead({ id: "plain", listingTitle: "Plain Lead" }),
    ]);
    render(<DashboardPage />);
    // Board, so an untouched lead is renderable (Needs Attention correctly
    // omits leads that are neither watched, assigned, nor scheduled).
    await user.click(await screen.findByRole("tab", { name: /^Board$/ }));
    const toggle = screen.getByRole("button", { name: /needs follow-up/i });

    await user.click(toggle); // on → overdue
    await waitFor(() => expect(toggle.getAttribute("aria-pressed")).toBe("true"));
    expect(screen.queryByText("Plain Lead")).toBeNull();

    await user.click(toggle); // off → all
    await waitFor(() => expect(toggle.getAttribute("aria-pressed")).toBe("false"));
    expect(screen.getAllByText("Plain Lead").length).toBeGreaterThan(0);
  });

  it("clears to all from the due-soon state instead of switching to overdue", async () => {
    const user = userEvent.setup();
    mockGets([
      baseLead({ id: "ds", listingTitle: "Due Soon Lead", nextAction: "a", nextActionAt: dueSoon }),
      baseLead({ id: "plain", listingTitle: "Plain Lead" }),
    ]);
    render(<DashboardPage />);
    await user.click(await screen.findByRole("tab", { name: /^Board$/ }));
    // Enter due-soon scope via the Due soon stat card.
    await user.click(screen.getByRole("button", { name: /^Due soon: \d+/ }));

    const toggle = screen.getByRole("button", { name: /needs follow-up/i });
    await waitFor(() => expect(toggle.getAttribute("aria-pressed")).toBe("true"));
    expect(screen.queryByText("Plain Lead")).toBeNull();

    // Regression: this previously switched to overdue and hid everything.
    await user.click(toggle);
    await waitFor(() => expect(toggle.getAttribute("aria-pressed")).toBe("false"));
    expect(screen.getAllByText("Plain Lead").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Due Soon Lead").length).toBeGreaterThan(0);
  });

  it("keeps aria-pressed in step with the visible active state", async () => {
    const user = userEvent.setup();
    mockGets([baseLead({ id: "ds", nextAction: "a", nextActionAt: dueSoon })]);
    render(<DashboardPage />);
    const toggle = await screen.findByRole("button", { name: /needs follow-up/i });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    await user.click(screen.getByRole("button", { name: /^Due soon: \d+/ }));
    await waitFor(() => expect(toggle.getAttribute("aria-pressed")).toBe("true"));
  });
});

describe("Pipeline count consistency", () => {
  it("agrees on Overdue across header stat, control badge, Board pills and Needs Attention", async () => {
    const user = userEvent.setup();
    mockGets([
      baseLead({ id: "o1", listingTitle: "Overdue One", stage: "Contacted", nextAction: "a", nextActionAt: pastDue }),
      baseLead({ id: "o2", listingTitle: "Overdue Two", stage: "Appraisal", nextAction: "b", nextActionAt: pastDue }),
      baseLead({ id: "ds", listingTitle: "Due Soon One", nextAction: "c", nextActionAt: dueSoon }),
      baseLead({ id: "plain", listingTitle: "Plain Lead" }),
      // Terminal + passed leads must never be counted as active/overdue.
      baseLead({ id: "lost", listingTitle: "Lost Lead", stage: "Lost", nextAction: "d", nextActionAt: pastDue }),
      baseLead({ id: "passed", listingTitle: "Passed Lead", passedAt: pastDue, nextAction: "e", nextActionAt: pastDue }),
    ]);
    render(<DashboardPage />);
    await screen.findByRole("button", { name: /^Overdue: \d+/ });

    // Header stat and control-bar badge both read the shared `overdue` set.
    expect(statValue("Overdue")).toBe("2");
    const badge = within(screen.getByRole("button", { name: /needs follow-up/i })).getByText("2");
    expect(badge).toBeTruthy();
    expect(statValue("Due soon")).toBe("1");

    // Board pills sum to the same number.
    await user.click(screen.getByRole("tab", { name: /^Board$/ }));
    await waitFor(() => expect(screen.getAllByText("Overdue One").length).toBeGreaterThan(0));
    const pillTotal = screen
      .getAllByLabelText(/^\d+ overdue in /)
      .reduce((sum, el) => sum + Number(el.getAttribute("aria-label")!.match(/^(\d+)/)![1]), 0);
    expect(pillTotal).toBe(2);

    // Needs Attention lists exactly those two under the Overdue group.
    await user.click(screen.getByRole("tab", { name: /needs attention/i }));
    await screen.findByRole("heading", { name: /^Overdue$/ });
    expect(screen.getAllByText("Overdue One").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Overdue Two").length).toBeGreaterThan(0);
    expect(screen.queryByText("Lost Lead")).toBeNull();
    expect(screen.queryByText("Passed Lead")).toBeNull();
  });

  it("keeps Overdue and Due soon stats meaningful while their own filter is active", async () => {
    const user = userEvent.setup();
    mockGets([
      baseLead({ id: "o1", listingTitle: "Overdue One", nextAction: "a", nextActionAt: pastDue }),
      baseLead({ id: "ds", listingTitle: "Due Soon One", nextAction: "c", nextActionAt: dueSoon }),
      baseLead({ id: "plain", listingTitle: "Plain Lead" }),
    ]);
    render(<DashboardPage />);
    await screen.findByRole("button", { name: /^Overdue: \d+/ });
    expect(statValue("Overdue")).toBe("1");
    expect(statValue("Due soon")).toBe("1");
    expect(statValue("Watching")).toBe("0");

    // Regression: turning Overdue on used to collapse Due soon to 0, because
    // the stats read the fully-filtered set instead of the shared active set.
    await user.click(screen.getByRole("button", { name: /^Overdue: \d+/ }));
    // Default view here is Needs Attention, which now reports its own rendered
    // entry count rather than the visible-lead total.
    await waitFor(() => expect(screen.getByText(/1 lead needs attention/)).toBeTruthy());
    expect(statValue("Overdue")).toBe("1");
    expect(statValue("Due soon")).toBe("1");
  });

  it("narrows the shared stats when an explicit non-follow-up filter is applied", async () => {
    const user = userEvent.setup();
    mockGets([
      baseLead({ id: "o1", listingTitle: "Overdue One", stage: "Contacted", nextAction: "a", nextActionAt: pastDue }),
      baseLead({ id: "o2", listingTitle: "Overdue Two", stage: "Appraisal", nextAction: "b", nextActionAt: pastDue }),
    ]);
    render(<DashboardPage />);
    await screen.findByRole("button", { name: /^Overdue: \d+/ });
    expect(statValue("Overdue")).toBe("2");

    // Stage is an explicit non-follow-up filter, so it DOES move the stats.
    await user.selectOptions(screen.getByLabelText(/filter by stage/i), "Appraisal");
    await waitFor(() => expect(statValue("Overdue")).toBe("1"));
    const badge = within(screen.getByRole("button", { name: /needs follow-up/i })).getByText("1");
    expect(badge).toBeTruthy();
  });

  it("does not change the stats when only the view is switched", async () => {
    const user = userEvent.setup();
    mockGets([
      baseLead({ id: "o1", listingTitle: "Overdue One", nextAction: "a", nextActionAt: pastDue }),
      baseLead({ id: "plain", listingTitle: "Plain Lead" }),
    ]);
    render(<DashboardPage />);
    await screen.findByRole("button", { name: /^Overdue: \d+/ });
    const before = [statValue("Overdue"), statValue("Due soon"), statValue("Watching")];

    await user.click(screen.getByRole("tab", { name: /^Board$/ }));
    await waitFor(() => expect(screen.getAllByText("Plain Lead").length).toBeGreaterThan(0));
    expect([statValue("Overdue"), statValue("Due soon"), statValue("Watching")]).toEqual(before);
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
