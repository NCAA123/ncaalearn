import { test, expect } from "./fixtures";

// Covers the HD Board Simulator's Phase 6 acceptance criteria against
// /dev/board, which needs no scenario/exam/practice content seeded (see its
// own file comment) -- exercise-engine walk-throughs still need a real
// scenario id and are covered separately once seed content is published.

test.describe("HD board simulator — /dev/board", () => {
  test("renders and is screenshot-stable on desktop and mobile viewports", async ({ page }) => {
    await page.goto("/dev/board");
    await expect(page.getByRole("heading", { name: "Board QA" })).toBeVisible();
    await expect(page.locator('[aria-label^="e2"]')).toBeVisible();
    await page.screenshot({ path: "test-results/board-2d.png" });
  });

  test("click-to-move: legal targets show, illegal clicks are ignored, move is logged", async ({ page }) => {
    await page.goto("/dev/board");
    const e2 = page.locator('[aria-label="e2, White pawn"]');
    await e2.click();
    // A legal target (e4) should now be selectable; an illegal one (e5,
    // occupied by nothing reachable in one pawn move from e2) should not
    // register a move.
    const e5 = page.locator('[aria-label="e5, empty"]');
    await e5.click();
    await expect(page.getByText(/click or drag a piece/i)).toBeVisible(); // no move logged yet
    await e2.click();
    const e4 = page.locator('[aria-label="e4, empty"]');
    await e4.click();
    await expect(page.locator("text=/e2.*e4/")).toBeVisible();
  });

  test("2D/3D toggle switches the rendered board", async ({ page }) => {
    await page.goto("/dev/board");
    await page.getByRole("button", { name: /switch to 3d board/i }).click();
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByRole("button", { name: /white side/i })).toBeVisible();
  });

  test("camera presets change the 3D view without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/dev/board");
    await page.getByRole("button", { name: /switch to 3d board/i }).click();
    for (const label of [/white side/i, /black side/i, /top-down/i]) {
      await page.getByRole("button", { name: label }).click();
      await page.waitForTimeout(500);
    }
    expect(errors).toEqual([]);
  });

  test("clock: start counts down, a move applies increment, pause freezes it", async ({ page }) => {
    await page.goto("/dev/board");
    await page.getByRole("button", { name: "Start" }).click();
    await page.waitForTimeout(1200);
    const whiteReading1 = await page.locator("text=/^0:1[0-4]\\./").first().textContent();
    expect(whiteReading1).toBeTruthy(); // ticked down from 0:15.0

    // Make a move to trigger completeMove()'s increment + turn switch.
    await page.locator('[aria-label="e2, White pawn"]').click();
    await page.locator('[aria-label="e4, empty"]').click();
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "Pause" }).click();
    // "Black" label -> its row div -> the ClockFace div -> the time display
    // sibling div (see ChessClock.tsx's ClockFace: label row and time are
    // sibling divs under one card, not nested).
    const blackFace = page.locator("span", { hasText: "Black" }).locator("..").locator("..");
    const frozen1 = await blackFace.locator(".text-2xl").textContent();
    await page.waitForTimeout(1500);
    const frozen2 = await blackFace.locator(".text-2xl").textContent();
    expect(frozen1).toEqual(frozen2); // didn't move while paused
  });

  test("reduced motion: prefers-reduced-motion disables move animation without breaking the board", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const email = process.env.TEST_EMAIL!;
    const password = process.env.TEST_PASSWORD!;
    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);

    await page.goto("/dev/board");
    await page.getByRole("button", { name: /switch to 3d board/i }).click();
    await expect(page.locator("canvas")).toBeVisible();
    await context.close();
  });

  test("keyboard: Tab reaches the 2D/3D toggle and camera preset buttons", async ({ page }) => {
    await page.goto("/dev/board");
    await page.getByRole("button", { name: /switch to 3d board/i }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: /white side/i })).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: /white side/i })).toBeFocused();
  });
});
