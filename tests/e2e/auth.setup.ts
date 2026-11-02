import { test as setup, expect } from "@playwright/test";

setup("sign in as the e2e admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("e2e@spotr.test");
  await page.getByLabel("Password").fill("e2e-orchid-lantern-29");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: "tests/e2e/.auth/admin.json" });
});
