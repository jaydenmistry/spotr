import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end + visual regression suite. Baselines are generated inside the
 * official Playwright image (`npm run test:e2e:docker -- --update-snapshots`)
 * so local runs and CI render identically.
 */
export default defineConfig<{ theme: "dark" | "light" }>({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", caret: "hide" },
  },
  use: {
    baseURL: "http://localhost:3200",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop-dark",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, storageState: "tests/e2e/.auth/admin.json", theme: "dark" },
    },
    {
      name: "desktop-light",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, storageState: "tests/e2e/.auth/admin.json", theme: "light" },
    },
    {
      name: "mobile-dark",
      dependencies: ["setup"],
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", storageState: "tests/e2e/.auth/admin.json", theme: "dark" },
    },
  ],
  webServer: {
    command: "bash scripts/e2e-server.sh",
    url: "http://localhost:3200/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
