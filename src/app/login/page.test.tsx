// @vitest-environment jsdom
//
// Focused reliability tests for the login page: both fields must start empty
// (no stale hardcoded prefill that drifts out of sync with the seeded
// ADMIN_PASSWORD), and the credential submit / error-handling flow must be
// preserved. Only next-auth and next/navigation are mocked.
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
  it("starts with empty email and password fields", () => {
    render(<LoginPage />);
    const email = screen.getByLabelText("Email") as HTMLInputElement;
    const password = screen.getByLabelText("Password") as HTMLInputElement;
    expect(email.value).toBe("");
    expect(password.value).toBe("");
    expect(password.type).toBe("password");
  });

  it("does not ship any demo credentials in the rendered page", () => {
    const { container } = render(<LoginPage />);
    expect(container.querySelector('input[type="password"]')?.getAttribute("value") ?? "").toBe("");
    expect(container.textContent).not.toMatch(/demo@|·\s*password\b/i);
  });

  it("submits the typed credentials and routes to the dashboard on success", async () => {
    const user = userEvent.setup();
    signIn.mockResolvedValue({ error: null });
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "buyer@example.com");
    await user.type(screen.getByLabelText("Password"), "s3cret-typed");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ email: "buyer@example.com", password: "s3cret-typed", redirect: false })
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows an error and stays on the page when credentials are rejected", async () => {
    const user = userEvent.setup();
    (signIn as Mock).mockResolvedValue({ error: "CredentialsSignin" });
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "buyer@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/don't match/i));
    expect(push).not.toHaveBeenCalled();
  });
});
