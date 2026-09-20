import { test as base, expect } from "@playwright/test";

// Every route this suite touches sits behind auth (dev/board included, per
// its own file comment). Logs in once per test using TEST_EMAIL/TEST_PASSWORD
// -- there is no seeded "test account" in this codebase, so these must point
// at a real account with academy_admin or super_admin rights (needed for
// /dev/board's dependency-free QA, and to preview unpublished scenarios --
// see NOTES.md's account-mismatch writeup for why that distinction matters).
export const test = base.extend({
  page: async ({ page }, use) => {
    const email = process.env.TEST_EMAIL;
    const password = process.env.TEST_PASSWORD;
    if (!email || !password) {
      throw new Error(
        "TEST_EMAIL and TEST_PASSWORD must be set to run this suite -- see docs/BOARD_SIM.md.",
      );
    }
    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await use(page);
  },
});

export { expect };
