import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

// The test (never dev) Postgres — CONVENTIONS.md -> "Local Postgres
// (docker-compose)": db-test on port 5433, database
// investment_assistant_test, postgres/postgres credentials. An e2e run
// that pointed at the dev db on 5432 would wipe/register fixture users
// against real local data.
const TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/investment_assistant_test?schema=public';

export default defineConfig({
  testDir: './e2e',
  globalSetup: path.resolve(__dirname, 'e2e/global-setup.ts'),
  // The suite shares one fixture user and one database (see
  // global-setup.ts) — parallel workers logging in/out as the same user
  // produce flakes that read as real failures, not the app's. Single
  // worker "for now" (DASHBOARD_UI_SHARED_T-8), revisit if per-worker
  // fixture users are ever added.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // 1, not Playwright's usual 2, in CI: a genuinely flaky spec should be
  // visible as a retry in the report, not silently absorbed.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Disable CSS/transition animations so screenshots/assertions aren't
    // flaky on transient in-between-frame states.
    // https://playwright.dev/docs/api/class-testoptions#test-options-launch-options
    // (kept here rather than per-test since every spec in this suite
    // should get it, including future visual-regression specs.)
  },

  expect: {
    // Same rationale as above — Playwright's built-in toggle for the
    // "disable CSS animations/transitions" behaviour lives on the
    // screenshot-comparison options, not a standalone flag, so it's set
    // here for every screenshot assertion this suite (or a later
    // visual-regression task) makes.
    toHaveScreenshot: { animations: 'disabled' },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Playwright accepts an array of webServer entries — one per process this
  // suite needs booted. Both get their own `url` healthcheck and
  // `reuseExistingServer: !process.env.CI` so a developer who already has
  // `pnpm dev` running locally doesn't get a second, conflicting instance,
  // while CI always boots its own from a clean checkout.
  webServer: [
    {
      // `packages/shared` is built first — `apps/api` resolves
      // `@ai-investment-assistant/shared` to its `dist` output and `nest
      // start` has no `prebuild` hook of its own (only `nest build` does,
      // via the `prebuild` script in `apps/api/package.json`). `prisma
      // generate` because `apps/api/generated/prisma` is gitignored
      // (CONVENTIONS.md -> "Module structure") and a clean checkout won't
      // have it; `migrate deploy` applies any migration `db-test` is
      // missing — idempotent, so safe to always run rather than trying to
      // detect whether it's already current. All three must finish before
      // `nest start`, and must run here (not in globalSetup) since
      // Playwright starts `webServer` entries before running `globalSetup`.
      command:
        'pnpm --filter @ai-investment-assistant/shared build && pnpm --filter api exec prisma generate && pnpm --filter api exec prisma migrate deploy && pnpm --filter api start',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: path.resolve(__dirname, '../..'),
      env: {
        // Explicit env, not a dependency on apps/api/.env (which normally
        // points at the dev db on 5432 for local `pnpm dev`) — this harness
        // must work the same way on any machine, clean checkout included.
        DATABASE_URL: TEST_DATABASE_URL,
        JWT_SECRET: 'e2e-test-secret',
        FRONTEND_URL: 'http://localhost:3000',
        PORT: '3001',
        // The suite logs in/registers repeatedly from one IP; the default
        // auth throttle (5/min, AUTH_UI_SHARED_T-5) would 429 it.
        AUTH_THROTTLE_LIMIT: '1000',
      },
    },
    {
      // `next dev`, not `next start` — the latter requires a prior `next
      // build` (a production bundle) that a clean checkout won't have yet,
      // and this harness must work "from a clean checkout ... no servers
      // started by hand" per the task's own Test field. `dev` has no
      // `prebuild` hook (only the `build` script does, per CONVENTIONS.md
      // -> "Shared utilities"), so `packages/shared` is built explicitly
      // first — `apps/web` resolves it to `packages/shared/dist`.
      command:
        'pnpm --filter @ai-investment-assistant/shared build && pnpm --filter web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: path.resolve(__dirname, '../..'),
      env: {
        // Without this the app under test calls the default
        // http://localhost:3001 origin implicitly anyway (see
        // apps/web/lib/api-client.ts's default), but set it explicitly so
        // this harness never silently depends on that default matching the
        // API webServer entry above.
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
        PORT: '3000',
      },
    },
  ],
});
