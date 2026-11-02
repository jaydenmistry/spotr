// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import type { LeadRecord } from "@/lib/vehicleAnalytics";
import InventoryPage from "./page";

vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), isAxiosError: () => false },
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />
  ),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: { user: { email: "admin@spotr.com" } }, status: "authenticated" })),
  signOut: vi.fn(),
}));

const mockReplace = vi.fn((url: string) => {
  const query = url.includes("?") ? url.split("?")[1] : "";
  mockSearchParamString = query;
});
let mockSearchParamString = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearchParamString),
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  usePathname: () => "/dashboard/inventory",
}));

import axios from "axios";

function createMockLead(id: string, overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id,
    vin: `VIN-${id}`,
    year: 2021,
    make: "Porsche",
    model: "911",
    listingTitle: `2021 Porsche 911 ${id}`,
    price: 120000,
    miles: 15000,
    distanceMiles: 25,
    searchZip: "30043",
    searchRadius: 100,
    city: "Atlanta",
    state: "GA",
    source: "marketcheck",
    vdp_url: "https://example.com/listing",
    photo_url: "https://example.com/photo.jpg",
    stage: "New Lead",
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
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function mockGetLeads(leads: LeadRecord[]) {
  (axios.get as Mock).mockImplementation((url: string) => {
    if (url === "/api/leads") return Promise.resolve({ data: leads });
    if (url === "/api/leads/activity") return Promise.resolve({ data: { activities: [] } });
    return Promise.resolve({ data: {} });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParamString = "";
  window.scrollTo = vi.fn();
});

afterEach(cleanup);

describe("Inventory Page - Loading and Data Fetching", () => {
  it("renders loading spinner initially while fetching leads", () => {
    (axios.get as Mock).mockImplementation(() => new Promise(() => {}));
    render(<InventoryPage />);
    expect(screen.getByText("Loading inventory…")).toBeTruthy();
  });

  it("fetches and displays lead cards with total count readout", async () => {
    const leads = [
      createMockLead("1", { make: "Porsche", model: "911", price: 120000 }),
      createMockLead("2", { make: "BMW", model: "M3", price: 75000 }),
    ];
    mockGetLeads(leads);

    render(<InventoryPage />);

    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    expect(screen.getByText("Inventory")).toBeTruthy();
    expect(screen.getByText(/Showing/)).toBeTruthy();
    expect(screen.getByText("1–2")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("2021 Porsche 911 1")).toBeTruthy();
    expect(screen.getByText("2021 Porsche 911 2")).toBeTruthy();
  });

  it("handles loading state completion gracefully when API fails", async () => {
    (axios.get as Mock).mockRejectedValue(new Error("API Error"));
    render(<InventoryPage />);

    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());
    // A failed load is reported as a failure (with a retry), not as an empty filter result.
    expect(screen.getByText("Couldn't load inventory")).toBeTruthy();
    expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
    expect(screen.queryByText("No vehicles found matching your specific filters.")).toBeNull();
  });
});

describe("Inventory Page - Keyword Search Filter", () => {
  it("filters vehicles by search keyword matching make, model, or VIN", async () => {
    const user = userEvent.setup();
    const leads = [
      createMockLead("porsche", { make: "Porsche", model: "911 Turbo", listingTitle: "2021 Porsche 911 Turbo", vin: "WP0AA1" }),
      createMockLead("bmw", { make: "BMW", model: "M3 Competition", listingTitle: "2022 BMW M3 Competition", vin: "WBS123" }),
      createMockLead("audi", { make: "Audi", model: "RS6 Avant", listingTitle: "2023 Audi RS6 Avant", vin: "WAU456" }),
    ];
    mockGetLeads(leads);

    render(<InventoryPage />);
    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    expect(screen.getByText("2021 Porsche 911 Turbo")).toBeTruthy();
    expect(screen.getByText("2022 BMW M3 Competition")).toBeTruthy();

    const searchInput = screen.getByPlaceholderText("Make, model, VIN…");
    await user.type(searchInput, "BMW");

    await waitFor(() => {
      expect(screen.getByText("2022 BMW M3 Competition")).toBeTruthy();
      expect(screen.queryByText("2021 Porsche 911 Turbo")).toBeNull();
      expect(screen.queryByText("2023 Audi RS6 Avant")).toBeNull();
    });
  });
});

describe("Inventory Page - Price Range Filtering", () => {
  it("filters vehicles by min price and max price bounds", async () => {
    const user = userEvent.setup();
    const leads = [
      createMockLead("cheap", { id: "cheap", price: 30000, listingTitle: "2018 Mustang" }),
      createMockLead("mid", { id: "mid", price: 60000, listingTitle: "2020 Corvette" }),
      createMockLead("expensive", { id: "expensive", price: 150000, listingTitle: "2022 Ferrari 488" }),
    ];
    mockGetLeads(leads);

    render(<InventoryPage />);
    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    const minInput = screen.getByPlaceholderText("Min $0");
    const maxInput = screen.getByPlaceholderText("Max");

    await user.type(minInput, "50000");
    await user.type(maxInput, "100000");

    await waitFor(() => {
      expect(screen.getByText("2020 Corvette")).toBeTruthy();
      expect(screen.queryByText("2018 Mustang")).toBeNull();
      expect(screen.queryByText("2022 Ferrari 488")).toBeNull();
    });
  });
});

describe("Inventory Page - Distance Radius Filtering", () => {
  it("filters vehicles by maximum distance radius", async () => {
    const user = userEvent.setup();
    const leads = [
      createMockLead("near", { distanceMiles: 15, listingTitle: "Nearby Car" }),
      createMockLead("mid-dist", { distanceMiles: 80, listingTitle: "Mid Distance Car" }),
      createMockLead("far", { distanceMiles: 200, listingTitle: "Faraway Car" }),
    ];
    mockGetLeads(leads);

    render(<InventoryPage />);
    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    const distanceInput = screen.getByPlaceholderText("Max radius");
    expect(screen.getByText("Nearby Car")).toBeTruthy();
    expect(screen.getByText("Mid Distance Car")).toBeTruthy();
    expect(screen.queryByText("Faraway Car")).toBeNull();

    await user.clear(distanceInput);
    await user.type(distanceInput, "50");

    await waitFor(() => {
      expect(screen.getByText("Nearby Car")).toBeTruthy();
      expect(screen.queryByText("Mid Distance Car")).toBeNull();
    });
  });
});

describe("Inventory Page - Market Trend / Movement Filtering", () => {
  it("filters by market movement trend options", async () => {
    const user = userEvent.setup();

    const leads = [
      createMockLead("1", { make: "Porsche", model: "911 GT3", year: 2023, miles: 5000, price: 200000, listingTitle: "Appreciating Lead" }),
      createMockLead("2", { make: "Maserati", model: "Ghibli", year: 2015, miles: 120000, price: 18000, listingTitle: "Depreciating Lead" }),
    ];
    mockGetLeads(leads);

    render(<InventoryPage />);
    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    const selectElements = screen.getAllByRole("combobox");
    const movementSelect = selectElements.find(s =>
      Array.from(s.getElementsByTagName("option")).some(o => o.value === "Appreciating")
    )!;

    expect(movementSelect).toBeTruthy();

    await user.selectOptions(movementSelect, "Appreciating");
    await waitFor(() => {
      expect(screen.getByText("Appreciating Lead")).toBeTruthy();
      expect(screen.queryByText("Depreciating Lead")).toBeNull();
    });

    await user.selectOptions(movementSelect, "Depreciating");
    await waitFor(() => {
      expect(screen.getByText("Depreciating Lead")).toBeTruthy();
      expect(screen.queryByText("Appreciating Lead")).toBeNull();
    });

    await user.selectOptions(movementSelect, "All");
    await waitFor(() => {
      expect(screen.getByText("Appreciating Lead")).toBeTruthy();
      expect(screen.getByText("Depreciating Lead")).toBeTruthy();
    });
  });
});

describe("Inventory Page - Make Checkbox Filters and Make Counts", () => {
  it("displays make breakdown counts and filters when make checkboxes are toggled", async () => {
    const user = userEvent.setup();
    const leads = [
      createMockLead("1", { make: "Porsche", listingTitle: "Porsche 911" }),
      createMockLead("2", { make: "Porsche", listingTitle: "Porsche Cayman" }),
      createMockLead("3", { make: "BMW", listingTitle: "BMW M3" }),
    ];
    mockGetLeads(leads);

    render(<InventoryPage />);
    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    expect(screen.getByText("Porsche")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("BMW")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();

    const bmwCheckbox = screen.getByText("BMW");
    await user.click(bmwCheckbox);

    await waitFor(() => {
      expect(screen.getByText("BMW M3")).toBeTruthy();
      expect(screen.queryByText("Porsche 911")).toBeNull();
      expect(screen.queryByText("Porsche Cayman")).toBeNull();
    });

    const clearAllBtn = screen.getByText("Clear All");
    expect(clearAllBtn).toBeTruthy();

    await user.click(clearAllBtn);

    await waitFor(() => {
      expect(screen.getByText("Porsche 911")).toBeTruthy();
      expect(screen.getByText("BMW M3")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Clear All" })).toBeNull();
    });
  });
});

describe("Inventory Page - Sorting Options", () => {
  it("sorts leads according to selected sort dropdown option", async () => {
    const user = userEvent.setup();
    const leads = [
      createMockLead("mid", { price: 50000, distanceMiles: 50, year: 2020, miles: 40000, listingTitle: "Mid Car" }),
      createMockLead("cheap", { price: 20000, distanceMiles: 100, year: 2018, miles: 80000, listingTitle: "Cheap Car" }),
      createMockLead("expensive", { price: 100000, distanceMiles: 10, year: 2023, miles: 5000, listingTitle: "Expensive Car" }),
    ];
    mockGetLeads(leads);

    render(<InventoryPage />);
    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    const selectElements = screen.getAllByRole("combobox");
    const sortSelect = selectElements.find(s =>
      Array.from(s.getElementsByTagName("option")).some(o => o.value === "Price (Low to High)")
    )!;

    // Change to Price (Low to High)
    await user.selectOptions(sortSelect, "Price (Low to High)");

    await waitFor(() => {
      const titles = screen.getAllByRole("heading", { level: 4 }).map(h => h.textContent);
      expect(titles[0]).toBe("Cheap Car");
      expect(titles[1]).toBe("Mid Car");
      expect(titles[2]).toBe("Expensive Car");
    });

    // Change to Price (High to Low)
    await user.selectOptions(sortSelect, "Price (High to Low)");

    await waitFor(() => {
      const titles = screen.getAllByRole("heading", { level: 4 }).map(h => h.textContent);
      expect(titles[0]).toBe("Expensive Car");
      expect(titles[1]).toBe("Mid Car");
      expect(titles[2]).toBe("Cheap Car");
    });

    // Change to Year (Newest First)
    await user.selectOptions(sortSelect, "Year (Newest First)");

    await waitFor(() => {
      const titles = screen.getAllByRole("heading", { level: 4 }).map(h => h.textContent);
      expect(titles[0]).toBe("Expensive Car"); // 2023
      expect(titles[1]).toBe("Mid Car"); // 2020
      expect(titles[2]).toBe("Cheap Car"); // 2018
    });
  });
});

describe("Inventory Page - Pagination and Auto-Reset", () => {
  it("paginates leads at 24 items per page and allows page navigation", async () => {
    const user = userEvent.setup();
    const leads = Array.from({ length: 30 }, (_, i) =>
      createMockLead(`${i + 1}`, { listingTitle: `Vehicle #${i + 1}` })
    );
    mockGetLeads(leads);

    render(<InventoryPage />);
    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    expect(screen.getByText(/Showing/)).toBeTruthy();
    expect(screen.getByText("1–24")).toBeTruthy();
    expect(screen.getAllByText("30").length).toBeGreaterThan(0);

    expect(screen.getByText("Vehicle #1")).toBeTruthy();
    expect(screen.queryByText("Vehicle #25")).toBeNull();

    const page2Button = screen.getByRole("button", { name: "2" });
    await user.click(page2Button);

    await waitFor(() => {
      expect(screen.getByText("25–30")).toBeTruthy();
      expect(screen.getByText("Vehicle #25")).toBeTruthy();
      expect(screen.queryByText("Vehicle #1")).toBeNull();
      expect(mockReplace).toHaveBeenCalledWith("/dashboard/inventory?page=2", { scroll: false });
    });
  });

  it("resets page to 1 automatically when filters or search terms change", async () => {
    const user = userEvent.setup();
    const leads = Array.from({ length: 30 }, (_, i) =>
      createMockLead(`${i + 1}`, { listingTitle: `Vehicle #${i + 1}` })
    );
    mockGetLeads(leads);

    render(<InventoryPage />);
    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    await user.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(screen.getByText("25–30")).toBeTruthy());

    const minPriceInput = screen.getByPlaceholderText("Min $0");
    await user.type(minPriceInput, "100");

    await waitFor(() => {
      expect(screen.getByText("1–24")).toBeTruthy();
    });
  });

  it("initializes page state from URL searchParams when ?page=2 is passed", async () => {
    mockSearchParamString = "page=2";
    const leads = Array.from({ length: 30 }, (_, i) =>
      createMockLead(`${i + 1}`, { listingTitle: `Vehicle #${i + 1}` })
    );
    mockGetLeads(leads);

    render(<InventoryPage />);
    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    expect(screen.getByText("25–30")).toBeTruthy();
    expect(screen.getByText("Vehicle #25")).toBeTruthy();
    expect(screen.queryByText("Vehicle #1")).toBeNull();
  });

  it("updates page size when selecting a new option from Per Page dropdown", async () => {
    const user = userEvent.setup();
    const leads = Array.from({ length: 30 }, (_, i) =>
      createMockLead(`${i + 1}`, { listingTitle: `Vehicle #${i + 1}` })
    );
    mockGetLeads(leads);

    render(<InventoryPage />);
    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    expect(screen.getByText("1–24")).toBeTruthy();

    const selectElements = screen.getAllByRole("combobox");
    const pageSizeSelect = selectElements.find(s =>
      Array.from(s.getElementsByTagName("option")).some(o => o.value === "12")
    )!;

    expect(pageSizeSelect).toBeTruthy();

    await user.selectOptions(pageSizeSelect, "12");

    await waitFor(() => {
      expect(screen.getByText("1–12")).toBeTruthy();
      expect(screen.getByText("Vehicle #12")).toBeTruthy();
      expect(screen.queryByText("Vehicle #13")).toBeNull();
    });
  });
});

describe("Inventory Page - Empty State", () => {
  it("renders empty state message when no vehicles match active filters", async () => {
    const user = userEvent.setup();
    const leads = [createMockLead("1", { make: "Porsche", listingTitle: "Porsche 911" })];
    mockGetLeads(leads);

    render(<InventoryPage />);
    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    const searchInput = screen.getByPlaceholderText("Make, model, VIN…");
    await user.type(searchInput, "NonExistentMake");

    await waitFor(() => {
      expect(screen.getByText("No vehicles found matching your specific filters.")).toBeTruthy();
      expect(screen.queryByText("Porsche 911")).toBeNull();
    });
  });
});

describe("Inventory Page - Lead Modal / Dossier Integration", () => {
  it("opens LeadModal when clicking a vehicle card and renders lead details", async () => {
    const user = userEvent.setup();
    const lead = createMockLead("modal-test", { listingTitle: "2021 Porsche 911 Carrera GT" });
    mockGetLeads([lead]);

    render(<InventoryPage />);
    await waitFor(() => expect(screen.queryByText("Loading inventory…")).toBeNull());

    const cardTitle = screen.getByText("2021 Porsche 911 Carrera GT");
    await user.click(cardTitle);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: "2021 Porsche 911 Carrera GT" })).toBeTruthy();
  });
});
