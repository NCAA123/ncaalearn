import { defineConfig } from "vitest/config";
import path from "node:path";

// Separate from playwright.config.ts's testDir ("./tests/e2e") -- vitest's
// default include glob (**/*.{test,spec}.*) would otherwise also try to
// collect the Playwright specs and fail, since `@playwright/test`'s
// `test.describe` isn't a vitest global.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
