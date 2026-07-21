// @vitest-environment jsdom
//
// Integration test for the Pipeline's follow-up state propagation.
//
// Regression guard for the reported bug: saving a past-due next action in the
// dossier updated the modal but left the board's overdue badge, the TopStats
// count, and the "Needs follow-up only" filter stale. All three read from the
// page's `leads` state, so they must reconcile from the persisted response
// without a refetch or reload.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, type ImgHTMLAttributes } from "react";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    isAxiosError: () => false,
  },
}));

// next/image needs a real loader/runtime; a plain img keeps alt text queryable.
vi.mock("next/image", () => ({
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />
  ),
}));

import axios from "axios";
import { DEFAULT_BUY_BOX } from "@/lib/buyBox";
import DashboardPage from "./page";

// getVehicleTitle prefers listingTitle, so this is what the card renders.
const VEHICLE_TITLE = "2021 Porsche 911 Carrera";

// Passes the page's default filters (min price 75000, 100mi radius) and the
// verified-listing shape LeadCard expects.
const baseLead = {
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
  createdAt: "2026-07-01T12:00:00.000Z",
  updatedAt: "2026-07-01T12:00:00.000Z",
};

const pastDue = new Date(Date.now() - 60 * 60 * 1000).toISOString();

/** Reads a TopStats card's value by its label. */
function statValue(name: string) {
  const label = screen.getByText(name);
  const card = label.parentElement!.parentElement!;
  return card.querySelectorAll("p")[1]?.textContent ?? "";
}

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

async function openDossier(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByText(VEHICLE_TITLE));
  await screen.findByRole("dialog");
}

async function closeDossier(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /close dossier/i }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

beforeEach(() => {
  vi.clearAllMocks();
});

// Vitest globals are off, so RTL's automatic cleanup doesn't register.
afterEach(cleanup);

describe("Pipeline follow-up state propagation", () => {
  it("reflects a newly saved past-due next action on the board, stats, and filter", async () => {
    const user = userEvent.setup();
    mockGets([baseLead]);
    (axios.post as Mock).mockResolvedValue({
      data: {
        lead: { ...baseLead, nextAction: "Call seller", nextActionAt: pastDue },
        activity: { id: "a1" },
      },
    });

    render(<DashboardPage />);

    // Baseline: nothing is overdue yet.
    await screen.findByText(VEHICLE_TITLE);
    expect(screen.queryByLabelText("Follow-up overdue")).toBeNull();
    expect(statValue("Needs Follow-up")).toBe("0");

    await openDossier(user);
    await user.click(screen.getByRole("button", { name: /set next action/i }));
    await user.type(
      screen.getByPlaceholderText(/call seller about service records/i),
      "Call seller"
    );

    const dueInput = screen.getByLabelText("Due");
    // datetime-local: set directly, then notify React.
    await user.clear(dueInput);
    await user.type(dueInput, "2026-07-20T09:00");

    await user.click(screen.getByRole("button", { name: /save next action/i }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    await closeDossier(user);

    // The three surfaces that share getFollowUpStatus must all agree.
    await waitFor(() => expect(screen.getByLabelText("Follow-up overdue")).toBeTruthy());
    expect(statValue("Needs Follow-up")).toBe("1");

    await user.click(screen.getByRole("button", { name: /needs follow-up only/i }));
    expect(screen.getByText(VEHICLE_TITLE)).toBeTruthy();
    expect(screen.getByLabelText("Follow-up overdue")).toBeTruthy();
  });

  // Next enables reactStrictMode by default, so dev double-renders and
  // double-invokes effects — the same path must still reconcile.
  it("reconciles the same way under StrictMode", async () => {
    const user = userEvent.setup();
    mockGets([baseLead]);
    (axios.post as Mock).mockResolvedValue({
      data: {
        lead: { ...baseLead, nextAction: "Call seller", nextActionAt: pastDue },
        activity: { id: "a1" },
      },
    });

    render(
      <StrictMode>
        <DashboardPage />
      </StrictMode>
    );

    await screen.findByText(VEHICLE_TITLE);
    await openDossier(user);
    await user.click(screen.getByRole("button", { name: /set next action/i }));
    await user.type(
      screen.getByPlaceholderText(/call seller about service records/i),
      "Call seller"
    );
    await user.type(screen.getByLabelText("Due"), "2026-07-20T09:00");
    await user.click(screen.getByRole("button", { name: /save next action/i }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    await closeDossier(user);

    await waitFor(() => expect(screen.getByLabelText("Follow-up overdue")).toBeTruthy());
    expect(statValue("Needs Follow-up")).toBe("1");
  });

  // Follow-up status is time-dependent. A lead that crosses its due time while
  // the board sits open must start reporting overdue on all three surfaces
  // without any user interaction or refetch.
  it("recomputes overdue on all three surfaces as the clock passes the due time", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const dueSoon = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockGets([{ ...baseLead, nextAction: "Call seller", nextActionAt: dueSoon }]);

      render(<DashboardPage />);
      await screen.findByText(VEHICLE_TITLE);
      expect(screen.queryByLabelText("Follow-up overdue")).toBeNull();
      expect(statValue("Needs Follow-up")).toBe("0");

      await act(async () => {
        vi.advanceTimersByTime(60 * 60 * 1000);
      });

      await waitFor(() => expect(screen.getByLabelText("Follow-up overdue")).toBeTruthy());
      expect(statValue("Needs Follow-up")).toBe("1");
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops the lead from all three surfaces when the action is completed", async () => {
    const user = userEvent.setup();
    const overdueLead = { ...baseLead, nextAction: "Call seller", nextActionAt: pastDue };
    mockGets([overdueLead]);
    (axios.post as Mock).mockResolvedValue({
      data: {
        lead: { ...overdueLead, nextActionCompletedAt: new Date().toISOString() },
        activity: { id: "a2" },
      },
    });

    render(<DashboardPage />);
    await screen.findByText(VEHICLE_TITLE);
    expect(screen.getByLabelText("Follow-up overdue")).toBeTruthy();
    expect(statValue("Needs Follow-up")).toBe("1");

    await openDossier(user);
    await user.click(screen.getByRole("button", { name: /mark done/i }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    await closeDossier(user);

    await waitFor(() => expect(screen.queryByLabelText("Follow-up overdue")).toBeNull());
    expect(statValue("Needs Follow-up")).toBe("0");

    await user.click(screen.getByRole("button", { name: /needs follow-up only/i }));
    expect(screen.queryByText(VEHICLE_TITLE)).toBeNull();
  });

  it("drops the lead from all three surfaces when the action is cleared", async () => {
    const user = userEvent.setup();
    const overdueLead = { ...baseLead, nextAction: "Call seller", nextActionAt: pastDue };
    mockGets([overdueLead]);
    (axios.post as Mock).mockResolvedValue({
      data: {
        lead: {
          ...overdueLead,
          nextAction: null,
          nextActionAt: null,
          nextActionCompletedAt: null,
        },
        activity: { id: "a3" },
      },
    });

    render(<DashboardPage />);
    await screen.findByText(VEHICLE_TITLE);
    expect(statValue("Needs Follow-up")).toBe("1");

    await openDossier(user);
    await user.click(screen.getByRole("button", { name: /clear/i }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    await closeDossier(user);

    await waitFor(() => expect(screen.queryByLabelText("Follow-up overdue")).toBeNull());
    expect(statValue("Needs Follow-up")).toBe("0");
  });
});
