# DASHBOARD_UI_SHARED_T-8: run the e2e suite in CI

**Shared by:** US-1, US-2, US-3, US-4, US-5, US-6, US-7
**Status:** Not Started
**GitHub Issue:** #235 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-7

Wire `pnpm --filter web test:e2e` into `.github/workflows/ci.yml` so a broken user flow fails the PR (spec AC). This edits a file `project-setup` owns; that's expected here, not scope creep — the same way `ADVISOR_US-2_T-2` touched `recommended-portfolios`.

The existing workflow already has most of the pieces (`CONVENTIONS.md` → "CI"): a `db-test` service container on `5433`, `prisma migrate deploy`, and job-level `JWT_SECRET`/`FRONTEND_URL`. What this adds:

- `pnpm --filter web exec playwright install --with-deps chromium` before the run. Skipping `--with-deps` is the usual first failure — the browser binary downloads but its shared libraries are missing on the runner, and the error names a `.so` file rather than the real cause.
- The e2e step runs **after** `pnpm --filter api build` and `pnpm --filter web build`, alongside the existing `test:e2e` for the API. `packages/shared/dist` and the generated Prisma client must exist first, per the ordering already documented for the API's suite.
- `NEXT_PUBLIC_API_URL` and `DATABASE_URL` as job-level env, byte-identical to the local values so a failure reproduces locally without a translation step.
- Upload the Playwright HTML report and any failure traces as an artifact on failure (`if: failure()`). A red e2e job with no artifact means re-running locally and hoping it reproduces; a trace means opening it.
- Set `fullyParallel: false` or a single worker for now. The suite shares one fixture user and one database; parallel workers logging in and out as the same user produce flakes that read as real failures.

Flakiness is the thing that kills an e2e suite's credibility. Configure `retries: process.env.CI ? 1 : 0` so a genuinely flaky spec is visible as a retry in the report rather than being silently absorbed or blocking a good PR outright.

**Test:** the CI run itself is the test, and it must be demonstrated both ways: (1) the workflow is green on this PR with the e2e job actually executing the suite — check the log shows specs running, not a skipped or no-op step, which is how a misconfigured `--filter` fails silently (`CONVENTIONS.md` records pnpm's `test` special case for exactly this trap); (2) push a deliberate one-line break to a spec's expected URL, confirm the job goes red and the uploaded artifact contains the trace, then revert it. Both linked in the PR description.

**Done when:** the CI job runs the Playwright suite, is green for correct code, and was demonstrated red for broken code — with both runs linked. Not "the YAML looks right."
