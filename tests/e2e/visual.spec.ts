import { test, expect, settle, timeSensitive } from "./fixtures";

// Visual regression across themes and viewports (see playwright.config.ts).
// Update baselines with: npm run test:e2e:docker -- --update-snapshots

const PUBLIC_PAGES = [
  { name: "landing", path: "/" },
  { name: "request-access", path: "/request-access" },
  { name: "privacy", path: "/privacy" },
  { name: "not-found", path: "/this-page-does-not-exist" },
];

const APP_PAGES = [
  { name: "feed", path: "/dashboard/feed" },
  { name: "pipeline", path: "/dashboard" },
  { name: "inventory", path: "/dashboard/inventory" },
  { name: "buybox", path: "/dashboard/buybox" },
  { name: "requests", path: "/dashboard/requests" },
];

for (const { name, path } of PUBLIC_PAGES) {
  test(`public: ${name}`, async ({ page }) => {
    await page.goto(path);
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { mask: timeSensitive(page) });
  });
}

test("public: login", async ({ browser, theme }) => {
  // Signed-out context: the shared storage state would redirect away.
  const context = await browser.newContext({ storageState: undefined, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.addInitScript((value) => localStorage.setItem("spotr-theme", value), theme);
  await page.goto("/login");
  await settle(page);
  await expect(page).toHaveScreenshot("login.png");
  await context.close();
});

for (const { name, path } of APP_PAGES) {
  test(`app: ${name}`, async ({ page }) => {
    await page.goto(path);
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { mask: timeSensitive(page) });
  });
}

test("app: dossier", async ({ page }) => {
  await page.goto("/dashboard/feed");
  await settle(page);
  await page.getByRole("button", { name: /^open dossier$/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("dossier.png", { mask: timeSensitive(page) });
});

test("app: command palette", async ({ page }) => {
  await page.goto("/dashboard/feed");
  await settle(page);
  await page.getByRole("button", { name: "Search or jump to…" }).filter({ visible: true }).first().click();
  await expect(page.getByRole("combobox", { name: /search commands/i })).toBeFocused();
  await settle(page);
  await expect(page).toHaveScreenshot("command-palette.png", { mask: timeSensitive(page) });
});

test("app: keyboard shortcuts", async ({ page }) => {
  await page.goto("/dashboard/feed");
  await settle(page);
  await page.keyboard.press("Shift+?");
  await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("keyboard-shortcuts.png", { mask: timeSensitive(page) });
});
