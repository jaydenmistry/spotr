// @vitest-environment jsdom
//
// Keyboard shortcuts and palette deep links on the Opportunity Feed. Real
// page, cards, reason dialog and dossier run; only axios, next/navigation and
// next/image are mocked.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";

let searchParams = new URLSearchParams();
let viewer = { email: "buyer@spotr.test", role: "member" };
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: viewer }, status: "authenticated" }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  usePathname: () => "/dashboard/feed",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), isAxiosError: vi.fn(() => false) },
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />
  ),
}));

import axios from "axios";
import { DEFAULT_BUY_BOX } from "@/lib/buyBox";
import { getOpportunityAssessment } from "@/lib/opportunity";
import FeedPage from "./page";

function lead(id: string, title: string, overrides: Record<string, unknown> = {}) {
  const base = {
    id,
    vin: `WP0AB2A99MS2200${id.slice(-2)}`,
    year: 2021,
    make: "Porsche",
    model: "911",
    listingTitle: title,
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
    stage: "New",
    sellerName: null,
    watchedAt: null,
    passedAt: null,
    assignedTo: null,
    nextAction: null,
    nextActionAt: null,
    nextActionCompletedAt: null,
    outcomeReason: null,
    outcomeNote: null,
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
  return { ...base, assessment: getOpportunityAssessment(base, DEFAULT_BUY_BOX) };
}

const LEADS = [lead("lead-01", "First Car"), lead("lead-02", "Second Car"), lead("lead-03", "Third Car")];

function mockFeed(leads = LEADS) {
  (axios.get as Mock).mockImplementation((url: string) => {
    if (url === "/api/leads/feed") {
      return Promise.resolve({
        data: {
          leads,
          total: leads.length,
          matchingTotal: leads.length,
          page: 1,
          pageSize: 15,
          view: "active",
          sort: "score",
          candidateSetCapped: false,
          assessedCount: leads.length,
          buyBoxPersisted: true,
        },
      });
    }
    if (url === "/api/leads/activity") return Promise.resolve({ data: { activities: [] } });
    return Promise.resolve({ data: {} });
  });
}

const focusedCardTitle = () => document.activeElement?.closest("[data-lead-id]")?.getAttribute("data-lead-id");

beforeEach(() => {
  searchParams = new URLSearchParams();
  viewer = { email: "buyer@spotr.test", role: "member" };
  (axios.get as Mock).mockReset();
  (axios.post as Mock).mockReset();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });
  Element.prototype.scrollIntoView = vi.fn();
  // motion's whileInView (score ring) needs it; jsdom has none.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

async function renderFeed() {
  const user = userEvent.setup();
  render(<FeedPage />);
  await screen.findByRole("button", { name: /Open dossier for First Car/ });
  return user;
}

describe("Feed keyboard shortcuts", () => {
  it("j and k move focus between cards", async () => {
    mockFeed();
    const user = await renderFeed();
    await user.keyboard("j");
    expect(focusedCardTitle()).toBe("lead-01");
    await user.keyboard("jj");
    expect(focusedCardTitle()).toBe("lead-03");
    await user.keyboard("j");
    expect(focusedCardTitle()).toBe("lead-03");
    await user.keyboard("k");
    expect(focusedCardTitle()).toBe("lead-02");
  });

  it("w watches the focused card", async () => {
    mockFeed();
    (axios.post as Mock).mockResolvedValue({ data: { ...LEADS[1], watchedAt: "2026-10-29T00:00:00.000Z" } });
    const user = await renderFeed();
    await user.keyboard("jjw");
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith("/api/leads/action", { leadId: "lead-02", action: "watch" })
    );
  });

  it("a does nothing on a teammate's lead for a member, and the card offers no assign button", async () => {
    mockFeed([lead("lead-01", "First Car", { assignedTo: "teammate@spotr.test" })]);
    const user = await renderFeed();
    expect(screen.queryByRole("button", { name: /Unassign|Assign to me|Take over/ })).toBeNull();
    await user.keyboard("ja");
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("a unassigns your own lead", async () => {
    mockFeed([lead("lead-01", "First Car", { assignedTo: "buyer@spotr.test" })]);
    (axios.post as Mock).mockResolvedValue({ data: { ...LEADS[0], assignedTo: null } });
    const user = await renderFeed();
    expect(screen.getByRole("button", { name: "Unassign" })).toBeTruthy();
    await user.keyboard("ja");
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith("/api/leads/action", { leadId: "lead-01", action: "unassign" })
    );
  });

  it("lets an admin take over a teammate's lead, and shows the server's reason if it's refused", async () => {
    viewer = { email: "buyer@spotr.test", role: "admin" };
    mockFeed([lead("lead-01", "First Car", { assignedTo: "teammate@spotr.test" })]);
    (axios.isAxiosError as unknown as Mock).mockReturnValue(true);
    (axios.post as Mock).mockRejectedValue({
      response: { status: 409, data: { error: "Someone changed this lead's assignment. Refresh and try again." } },
    });
    const user = await renderFeed();
    expect(screen.getByRole("button", { name: "Take over" })).toBeTruthy();
    await user.keyboard("ja");
    expect(axios.post).toHaveBeenCalledWith("/api/leads/action", { leadId: "lead-01", action: "assign" });
    expect(await screen.findByText("Someone changed this lead's assignment. Refresh and try again.")).toBeTruthy();
    (axios.isAxiosError as unknown as Mock).mockReturnValue(false);
  });

  it("p opens the pass reason dialog instead of passing", async () => {
    mockFeed();
    const user = await renderFeed();
    await user.keyboard("jp");
    expect(await screen.findByRole("dialog", { name: "Pass on this vehicle" })).toBeTruthy();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("after a keyboard pass, focus lands on the card that took its place", async () => {
    mockFeed();
    (axios.post as Mock).mockResolvedValue({ data: { ...LEADS[1], passedAt: "2026-10-29T00:00:00.000Z" } });
    const user = await renderFeed();
    await user.keyboard("jjp");
    const dialog = await screen.findByRole("dialog", { name: "Pass on this vehicle" });
    await user.selectOptions(within(dialog).getByRole("combobox"), within(dialog).getAllByRole("option")[1]);
    mockFeed([LEADS[0], LEADS[2]]);
    await user.click(within(dialog).getByRole("button", { name: "Pass" }));
    await waitFor(() => expect(focusedCardTitle()).toBe("lead-03"));
  });

  it("o opens the dossier for the focused card", async () => {
    mockFeed();
    const user = await renderFeed();
    await user.keyboard("jo");
    expect(await screen.findByRole("dialog", { name: /First Car dossier/ })).toBeTruthy();
  });

  it("ignores shortcuts while typing in search and while a dialog is open", async () => {
    mockFeed();
    const user = await renderFeed();
    await user.keyboard("/");
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Search opportunities" }));
    await user.keyboard("jw");
    expect(focusedCardTitle()).toBeUndefined();
    expect(axios.post).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Open dossier for Second Car/ }));
    await screen.findByRole("dialog", { name: /Second Car dossier/ });
    await user.keyboard("w");
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("does nothing when single-key shortcuts are turned off", async () => {
    localStorage.setItem("spotr-single-key-shortcuts", "off");
    mockFeed();
    const user = await renderFeed();
    await user.keyboard("j");
    expect(focusedCardTitle()).toBeUndefined();
  });
});

describe("Feed deep links", () => {
  it("applies ?q= and opens the linked dossier", async () => {
    searchParams = new URLSearchParams({ q: "WP0AB2A99MS220002", open: "lead-02" });
    mockFeed([LEADS[1]]);
    render(<FeedPage />);
    expect(await screen.findByRole("dialog", { name: /Second Car dossier/ })).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "Search opportunities" }) as HTMLInputElement).value).toBe(
      "WP0AB2A99MS220002"
    );
    const params = (axios.get as Mock).mock.calls.find(([url]) => url === "/api/leads/feed")![1].params;
    expect(params.q).toBe("WP0AB2A99MS220002");
  });

  it("says so when the linked vehicle is no longer in the feed", async () => {
    searchParams = new URLSearchParams({ q: "GONE", open: "lead-99" });
    mockFeed([]);
    render(<FeedPage />);
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringMatching(/no longer in Opportunities/)
    );
  });

  it("re-opening the same link while already applied still loads and opens", async () => {
    const link = { q: "WP0AB2A99MS220002", open: "lead-02" };
    searchParams = new URLSearchParams(link);
    mockFeed([LEADS[1]]);
    const user = userEvent.setup();
    const { rerender } = render(<FeedPage />);
    await screen.findByRole("dialog", { name: /Second Car dossier/ });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    searchParams = new URLSearchParams();
    rerender(<FeedPage />);
    searchParams = new URLSearchParams(link);
    rerender(<FeedPage />);
    expect(await screen.findByRole("dialog", { name: /Second Car dossier/ })).toBeTruthy();
  });
});
