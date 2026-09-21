# DASHBOARD_UI_SHARED_T-9: visual-regression baseline

**Shared by:** US-2, US-3, US-4, US-5, US-7
**Status:** Done
**GitHub Issue:** #236 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-6, DASHBOARD_UI_SHARED_T-7

Add a Playwright visual-regression spec for the assembled dashboard, with a committed baseline screenshot, so unintended layout drift fails a PR instead of being noticed three weeks later.

**Read the Non-Goal first.** This compares the app against **its own committed baseline**, never against the mockup. [`resources/UI/portfolio-dashboard.html`](../../../resources/UI/portfolio-dashboard.html) is a declarative prototype: 78 `{{ }}` template bindings, an `<x-dc>` custom element, a 64KB `support.js` runtime, and hardcoded demo data (a user named Jordan, a cash balance, an S&P 500 benchmark) this UI deliberately does not reproduce. A diff against it fails by design on every one of those. What this task automates is *"the dashboard still looks like it did yesterday"*, which is genuinely worth having; *"the dashboard looks like the mockup"* is settled by human review when the baseline is approved, and `SHARED_T-6` says so.

Three things make or break this, and all three are the difference between a useful check and one the team disables within a month:

- **Baselines are platform-specific.** Font rasterisation and scrollbar metrics differ between macOS and Linux, so a baseline generated on a laptop fails on every CI run with a diff no human can see. Generate and update baselines **inside the `mcr.microsoft.com/playwright:v*-jammy` container** so local and CI rasterise identically, and document the exact `docker run … --update-snapshots` command in `apps/web/e2e/README.md`. Anyone who regenerates a baseline natively will hand-wave past this and break the job for everyone else.
- **The page must be deterministic.** Every number on this dashboard is data-driven and half of them are time-derived. Seed the fixture user with a fixed set of holdings and snapshots, pin the clock, stub the prices, and `mask:` the "generated at" footer in the advisor panel. An unmasked timestamp fails the diff once a minute.
- **Wait for the real thing, not a timeout.** The chart is a client-rendered SVG and the advisor panel resolves after its own fetch. Await a locator that only exists once the section has painted; `waitForTimeout` produces a suite that passes on a fast machine and fails in CI.

Scope it to **one full-page screenshot of the dashboard at a single desktop viewport**, plus one of the empty-portfolio state. Not every component, not every breakpoint — a baseline set nobody wants to re-approve is one nobody re-approves, and then the whole check gets `--update-snapshots`'d blindly.

**Test:** `apps/web/e2e/dashboard-visual.spec.ts` — `expect(page).toHaveScreenshot()` against committed baselines for the populated and empty dashboards. Demonstrated both ways, like `SHARED_T-8`: green as committed, and red for a deliberate one-line CSS change (a changed gap or padding), with the diff image in the uploaded artifact, then reverted. A visual check never shown to fail is indistinguishable from one that cannot.

**Done when:** the spec and its baselines are committed, the check is green, and it was demonstrated red for a deliberate layout change — with the regeneration command documented in `apps/web/e2e/README.md`.
