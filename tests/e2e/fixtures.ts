import { test as base, expect, type Page } from "@playwright/test";

/** Adds a per-project `theme` option and applies it before any page script runs. */
export const test = base.extend<{ theme: "dark" | "light" }>({
  theme: ["dark", { option: true }],
  page: async ({ page, theme }, provide) => {
    await page.addInitScript((value) => {
      try {
        localStorage.setItem("spotr-theme", value);
      } catch {}
    }, theme);
    await provide(page);
  },
});

export { expect };

/** Text that depends on the current date/time — masked in screenshots. */
export function timeSensitive(page: Page) {
  return [
    page.getByText(/^Due /),
    page.getByText(/overdue|due in \d/),
    page.getByText(/\b(AM|PM)\b/),
    page.getByText(/©/),
  ];
}

/**
 * Server-set timestamps (e.g. a request the flows test just created) change
 * width from run to run and re-wrap their line, which a mask can't hide.
 */
export async function pinTimestamps(page: Page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("span.tabular")) {
      if (/\b(AM|PM)\b/.test(el.textContent ?? "")) el.textContent = "Jan 1, 9:00 AM";
    }
  });
}

/** Lets entrance transitions and data loads settle before a snapshot. */
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}
