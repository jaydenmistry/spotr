// @vitest-environment jsdom
//
// Focused reliability tests for the login page: the password field must start
// empty (no stale hardcoded prefill that drifts out of sync with the seeded
// ADMIN_PASSWORD), and the existing credential submit / error-handling flow
// must be preserved. Only next-auth and next/navigation are mocked.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signIn = vi.fn();
const push = vi.fn();

vi.mock("next-auth/react", () => ({ signIn: (...args: unknown[]) => signIn(...args) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import LoginPage from "./page";

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("LoginPage reliability", () => {
  it("starts with an empty password field and a real placeholder", () => {
    render(<LoginPage />);
    const password = screen.getByPlaceholderText("Enter password") as HTMLInputElement;
    expect(password.value).toBe("");
    expect(password.type).toBe("password");
  });

  it("does not ship any hardcoded password string in the rendered page", () => {
    const { container } = render(<LoginPage />);
    // The old stale prefill/hint literally rendered the word "password" as a
    // credential value; guard against that specific regression returning.
    expect(container.querySelector('input[type="password"]')?.getAttribute("value") ?? "").toBe("");
    expect(container.textContent).not.toMatch(/·\s*password\b/);
  });

  it("submits the typed credentials and routes to the dashboard on success", async () => {
    const user = userEvent.setup();
    signIn.mockResolvedValue({ error: null });
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Enter password"), "s3cret-typed");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ email: "demo@spotrcars.com", password: "s3cret-typed", redirect: false })
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows an error and stays on the page when credentials are rejected", async () => {
    const user = userEvent.setup();
    (signIn as Mock).mockResolvedValue({ error: "CredentialsSignin" });
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Enter password"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText(/invalid credentials/i)).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
