# DASHBOARD_UI_SHARED_T-7: Playwright harness

**Shared by:** US-1, US-2, US-3, US-4, US-5, US-6, US-7
**Status:** Not Started
**GitHub Issue:** #234 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_US-1_T-3

Stand up the browser-e2e harness the repo has been documenting but never had. `CONVENTIONS.md` → "Frontend → Testing" already says *"Playwright specs live under `apps/web/e2e/`, one spec per critical user flow"*; nothing was ever installed. **That line is currently false, and this task is what makes it true** — correct it in the same PR if any detail here diverges.

- Add `@playwright/test` as a devDependency of `apps/web`, plus `"test:e2e": "playwright test"`.
- `apps/web/playwright.config.ts` with `testDir: './e2e'`, a single Chromium project, `animations: 'disabled'`, and **two `webServer` entries** — Playwright accepts an array — booting the Nest API on `3001` and the Next app on `3000`, each with its own `url` healthcheck and `reuseExistingServer: !process.env.CI`. The API's is `GET /health`, which `project-setup` already provides for exactly this purpose.
- `NEXT_PUBLIC_API_URL` must be set for the web server's environment, or the app under test calls the wrong origin and every spec fails identically and confusingly.
- **A seeded fixture user**, created through the real `POST /auth/register` in a global setup rather than by writing to the database — that keeps the harness ignorant of Prisma and exercises the same path a user takes. `apps/api`'s existing e2e fixture-user teardown is the precedent to follow, including its lesson: delete dependent rows (`PortfolioValueSnapshot` and friends) before the user, or the foreign keys block the cleanup.
- Point it at the **test** database (`db-test`, port `5433` per `CONVENTIONS.md` → "Local Postgres"), never the dev one. An e2e suite that wipes fixture users against `db` on port `5432` deletes real local data.
- One smoke spec, `apps/web/e2e/auth.spec.ts`, covering the critical flow this task can reach: visit a `(dashboard)` route unauthenticated → redirected to `/login` → log in as the fixture user → land on the dashboard → log out → back at `/login`, and a direct dashboard visit redirects again.

That smoke spec is also the only end-to-end proof of the auth-guard and logout acceptance criteria: every other test of them mocks `next/headers`, so nothing so far exercises a real cookie round trip through a real browser.

**Test:** `apps/web/e2e/auth.spec.ts` is itself the test. It must pass via `pnpm --filter web test:e2e` from a clean checkout with `docker compose up db-test` running and no servers started by hand — that "from clean" property is the deliverable, since a harness that only works when the author already has two terminals open isn't one. Confirm red first: the spec fails before the config and global setup exist.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
