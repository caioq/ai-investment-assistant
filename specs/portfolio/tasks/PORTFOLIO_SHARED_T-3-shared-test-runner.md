# PORTFOLIO_SHARED_T-3: test runner for packages/shared

**Shared by:** US-3, US-5
**Status:** Not Started
**GitHub Issue:** #98 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Set up Vitest in `packages/shared` so the package's pure functions can be unit-tested at all.

**This is a prerequisite, not a nice-to-have.** `packages/shared` currently has no test runner and no `test` script — its `package.json` declares only `build` and `typecheck`. Both `PORTFOLIO_US-3_T-1` (allocation) and `PORTFOLIO_US-5_T-1` (CAGR/volatility/drawdown) put pure functions there because the spec's Behavior Notes and `CLAUDE.md` require it, and both are specified test-first — so without this task each would stall at "write the failing test" with nowhere to put it. It's a `SHARED_` task rather than a step inside one of them because both need it and either may be picked up first.

Add `vitest` as a dev dependency and a `"test": "vitest run"` script, matching how `apps/web` already runs Vitest (`apps/web/vitest.config.ts`, per `CONVENTIONS.md` → "Testing"). Vitest rather than Jest: this is a plain TypeScript package with no Nest runtime, so it needs none of `ts-jest`'s configuration, and it keeps the repo to two runners instead of three.

Colocate specs next to the code as `*.test.ts` (the convention `apps/web` uses). Note `packages/shared/tsconfig.json` currently emits to `dist` via `tsc -p tsconfig.json` — make sure test files don't end up in the published build output, either by excluding `**/*.test.ts` in that tsconfig or by pointing `include` at sources only. A `dist/allocation.test.js` shipped to consumers is harmless but wrong, and it makes `pnpm --filter api build` slower for no reason.

**Test:** This task's deliverable is the runner itself, so the verification is that a trivial spec runs through it: add `packages/shared/src/index.test.ts` asserting the existing `SHARED_PACKAGE_NAME` export equals its expected value, and confirm `pnpm --filter @ai-investment-assistant/shared test` exits `0` having run 1 test. Confirm red first — before the setup, that command fails with "no test script" / "command not found" rather than a passing no-op, which is the distinction that matters here.

Also confirm `pnpm --filter @ai-investment-assistant/shared build` still exits `0` afterwards and that `dist/` contains no `*.test.js`.

**Done when:** `pnpm --filter @ai-investment-assistant/shared test` runs the placeholder spec green, and the build output is free of test files.

**Note for whoever picks this up:** the repo's CI (`.github/workflows/ci.yml`) currently runs lint, typecheck, and two builds — **no test step at all**, so none of the existing ~55 tests are enforced on a PR. That's outside this task's scope (and outside portfolio's spec), but adding a `test` script here without a CI step means these tests won't gate anything either. Flagged separately to the user; see `../stories/README.md` → "Decisions this pass had to make".
