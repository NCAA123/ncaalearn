import { defineConfig, devices } from "@playwright/test";

// See docs/BOARD_SIM.md "Running the Playwright suite" for required env vars
// (TEST_BASE_URL, TEST_EMAIL, TEST_PASSWORD) and why this can't be run from
// this project's own sandbox (browser binary download blocked here).
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
