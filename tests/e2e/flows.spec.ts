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
