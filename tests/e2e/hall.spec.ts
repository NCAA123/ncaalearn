import { test, expect } from "./fixtures";

// Covers the HD Tournament Hall Simulator's Phase 1/2 acceptance criteria
// against /dev/hall, which needs no scenario content seeded (fixed 8-table
// layout, see its own file comment) -- real scenario-driven walkthroughs are
// covered separately once the hall is wired into a live simulation route.

test.describe("HD tournament hall simulator — /dev/hall", () => {
  test("renders the GLTF-loaded hall shell and tables without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/dev/hall");
    await expect(page.getByRole("heading", { name: "Hall QA" })).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
    await page.waitForTimeout(500); // let useGLTF fetch/parse hall.glb + table-kit.glb
    expect(errors).toEqual([]);
    await page.screenshot({ path: "test-results/hall-overview.png" });
  });

  test("station buttons move the camera through stations without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/dev/hall");
    for (let i = 1; i <= 3; i++) {
      await page.getByRole("button", { name: `Board ${i}` }).click();
      await page.waitForTimeout(400); // let the camera lerp settle
    }
    // Board 3 carries a starting-position FEN -- confirm the page is still
    // healthy with the chess set rendered on top of the real desk mesh.
    await expect(page.getByRole("button", { name: "Board 3" })).toBeVisible();
    expect(errors).toEqual([]);
    await page.screenshot({ path: "test-results/hall-board-3.png" });
  });
});
