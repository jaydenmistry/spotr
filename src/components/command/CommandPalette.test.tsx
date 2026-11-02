// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/dashboard/feed",
}));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("axios", () => ({
  default: { get: vi.fn(), isCancel: () => false },
}));

import axios from "axios";
import { CommandPaletteProvider } from "./CommandPaletteProvider";

beforeEach(() => {
  push.mockReset();
  (axios.get as Mock).mockReset();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function setup({ isAdmin = false }: { isAdmin?: boolean } = {}) {
  const user = userEvent.setup();
  render(
    <CommandPaletteProvider isAdmin={isAdmin}>
      <button type="button">Opener</button>
    </CommandPaletteProvider>
  );
  return user;
}

describe("CommandPalette", () => {
  it("opens with Ctrl+K, filters, and navigates with Enter", async () => {
    const user = setup();
    await user.keyboard("{Control>}k{/Control}");
    const input = await screen.findByRole("combobox", { name: /search commands/i });
    await waitFor(() => expect(document.activeElement).toBe(input));

    await user.type(input, "pipe");
    const option = screen.getByRole("option", { name: /Pipeline/ });
    expect(option.getAttribute("aria-selected")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toBe(option.id);

    await user.keyboard("{Enter}");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByRole("dialog", { name: "Command palette" })).toBeNull();
  });

  it("runs a keyboard-chosen command only after Enter is released", async () => {
    const user = setup();
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByRole("combobox"), "pipe");
    await user.keyboard("{Enter>}");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(push).not.toHaveBeenCalled();
    await user.keyboard("{/Enter}");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("hides the current page and moves the selection with arrow keys", async () => {
    const user = setup();
    await user.keyboard("{Control>}k{/Control}");
    await screen.findByRole("combobox");
    expect(screen.queryByRole("option", { name: /^Opportunity Feed/ })).toBeNull();
    const options = screen.getAllByRole("option");
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{ArrowDown}");
    expect(options[1].getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(options[options.length - 1].getAttribute("aria-selected")).toBe("true");
  });

  it("closes on Escape and returns focus to the opener", async () => {
    const user = setup();
    const opener = screen.getByRole("button", { name: "Opener" });
    opener.focus();
    await user.keyboard("{Control>}k{/Control}");
    await screen.findByRole("combobox");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Command palette" })).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("searches open opportunities and labels the price as asking", async () => {
    (axios.get as Mock).mockResolvedValue({
      data: {
        total: 1,
        leads: [
          {
            id: "lead-9",
            vin: "WP0AB2A99MS220001",
            year: 2021,
            make: "Porsche",
            model: "911",
            listingTitle: null,
            price: 128000,
            source: "marketcheck",
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });
    const user = setup();
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByRole("combobox"), "porsche");
    const option = await screen.findByRole("option", { name: /2021 Porsche 911/ });
    expect(option.textContent).toMatch(/Asking \$128,000/);
    expect(option.textContent).toMatch(/marketcheck · found today/);
    expect((axios.get as Mock).mock.calls[0][1].params).toMatchObject({ q: "porsche", view: "active" });

    await user.click(option);
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/dashboard/feed?q=WP0AB2A99MS220001&open=lead-9")
    );
  });

  it("shows a message when vehicle search fails", async () => {
    (axios.get as Mock).mockRejectedValue(new Error("boom"));
    const user = setup();
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByRole("combobox"), "civic");
    expect(await screen.findByText(/Couldn.t search vehicles/)).toBeTruthy();
  });

  it("opens the shortcuts list with ? and can turn single-key shortcuts off", async () => {
    const user = setup();
    await user.keyboard("?");
    const toggle = await screen.findByRole("switch", { name: /Single-key shortcuts/ });
    expect((toggle as HTMLInputElement).checked).toBe(true);
    await user.click(toggle);
    expect(localStorage.getItem("spotr-single-key-shortcuts")).toBe("off");
  });

  it("navigates with g-then-letter sequences, and not when shortcuts are off", async () => {
    const user = setup();
    await user.keyboard("gi");
    expect(push).toHaveBeenCalledWith("/dashboard/inventory");

    localStorage.setItem("spotr-single-key-shortcuts", "off");
    push.mockReset();
    await user.keyboard("gi");
    expect(push).not.toHaveBeenCalled();
  });

  it("offers Access requests only to admins", async () => {
    const user = setup();
    await user.keyboard("gr");
    expect(push).not.toHaveBeenCalled();
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByRole("combobox"), "access");
    expect(screen.queryByRole("option", { name: /Access requests/ })).toBeNull();
    cleanup();

    const admin = setup({ isAdmin: true });
    await admin.keyboard("gr");
    expect(push).toHaveBeenCalledWith("/dashboard/requests");
  });
});
