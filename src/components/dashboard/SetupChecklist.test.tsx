// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetupChecklist, type SetupStep } from "./SetupChecklist";

const steps = (done: boolean[]): SetupStep[] =>
  ["Save your buy box", "Pull listings", "Shortlist a car"].map((title, i) => ({
    id: String(i),
    title,
    detail: "",
    done: done[i],
    href: "/x",
  }));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("SetupChecklist", () => {
  it("shows progress derived from the steps", () => {
    render(<SetupChecklist steps={steps([true, false, false])} />);
    expect(screen.getByText("1 of 3 done · steps tick off as you work")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Pull listings/ })).toBeTruthy();
    // Completed steps aren't links.
    expect(screen.queryByRole("link", { name: /Save your buy box/ })).toBeNull();
  });

  it("switches to the all-set state when every step is done", () => {
    render(<SetupChecklist steps={steps([true, true, true])} />);
    expect(screen.getByText("You're all set")).toBeTruthy();
  });

  it("stays hidden after it's dismissed", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<SetupChecklist steps={steps([false, false, false])} />);
    await user.click(screen.getByRole("button", { name: "Hide setup guide" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Get set up" })).toBeNull());
    unmount();
    render(<SetupChecklist steps={steps([false, false, false])} />);
    expect(screen.queryByText("Get set up")).toBeNull();
  });
});
