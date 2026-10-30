import { test, expect } from "./fixtures";

// Functional journeys. Desktop-dark only — behavior doesn't vary by theme.
test.skip(({ theme, isMobile }) => theme !== "dark" || isMobile, "runs once");

test("request access: validates, submits, and lands in the team inbox", async ({ page }) => {
  await page.goto("/request-access");
  await page.getByRole("button", { name: /request access/i }).last().click();
  await expect(page.getByText("Enter your name.")).toBeVisible();

  await page.getByLabel("Full name").fill("Sam Ortiz");
  await page.getByLabel("Work email").fill("sam@ortizmotors.example");
  await page.getByLabel("Dealership or group").fill("Ortiz Motors");
  await page.getByLabel("Your role").selectOption("Buyer / acquisition manager");
  await page.getByRole("button", { name: /request access/i }).last().click();
  await expect(page.getByText("Request received.")).toBeVisible();

  await page.goto("/dashboard/requests");
  await expect(page.getByText("Sam Ortiz")).toBeVisible();
});

test("dossier: opens from the feed, switches tabs, closes with Escape", async ({ page }) => {
  await page.goto("/dashboard/feed");
  await page.getByRole("button", { name: /^open dossier$/i }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("tab", { name: "Practice chat" }).click();
  await expect(dialog.getByText("Simulated", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("command palette: Ctrl+K, filter, Enter navigates", async ({ page }) => {
  await page.goto("/dashboard/feed");
  // The shell (and its key listener) mounts once the session resolves.
  await page.getByRole("button", { name: "Search or jump to…" }).filter({ visible: true }).first().waitFor();
  await page.keyboard.press("Control+k");
  const input = page.getByRole("combobox", { name: /search commands/i });
  await expect(input).toBeFocused();
  await input.fill("pipe");
  await expect(page.getByRole("option", { name: /Pipeline/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeHidden();
});

test("feed shortcuts: j focuses a card, o opens its dossier", async ({ page }) => {
  await page.goto("/dashboard/feed");
  await page.getByRole("button", { name: /^open dossier$/i }).first().waitFor();
  await page.keyboard.press("j");
  await expect(page.locator("[data-card-focus]").first()).toBeFocused();
  await page.keyboard.press("o");
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("theme toggle switches to light and persists", async ({ browser }) => {
  // Own context: the shared fixture re-applies the project theme on every load.
  const context = await browser.newContext({ storageState: "tests/e2e/.auth/admin.json" });
  const page = await context.newPage();
  await page.goto("/dashboard");
  await page.getByRole("switch", { name: "Dark mode" }).first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await context.close();
});

test("signed-out visitors are sent to login from the dashboard", async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await context.close();
});
