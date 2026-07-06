import { configDefaults, defineConfig } from "vitest/config";

// The mock application has Playwright E2E tests only. This explicit Vitest
// boundary prevents editor auto-discovery from running Playwright specs in
// Vitest merely because this directory has its own package.json/vite config.
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "tests/**"],
  },
});
