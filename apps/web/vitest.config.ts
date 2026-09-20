import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // `e2e/` holds Playwright specs (DASHBOARD_UI_SHARED_T-7), run via
    // `pnpm test:e2e`, never Vitest — Vitest's default include glob
    // otherwise picks up `e2e/*.spec.ts` too and chokes on `@playwright/
    // test`'s `test()` import ("did not expect test() to be called here"),
    // since it isn't running under the Playwright runner.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
