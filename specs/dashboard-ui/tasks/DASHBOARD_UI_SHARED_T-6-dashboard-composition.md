# DASHBOARD_UI_SHARED_T-6: dashboard composition test

**Shared by:** US-2, US-3, US-4, US-5, US-7
**Status:** Not Started
**GitHub Issue:** #208 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_US-2_T-3, DASHBOARD_UI_US-3_T-2, DASHBOARD_UI_US-4_T-4, DASHBOARD_UI_US-5_T-3, DASHBOARD_UI_US-7_T-5

The last task in the module. Pin the spec AC "Dashboard visually matches the mockup's layout for header, donuts, chart, holdings grid, summary cards, and advisor panel states" as far as an automated test honestly can: assert the assembled `(dashboard)/page.tsx` renders **every** section, in the mockup's order, from one set of stubbed API responses.

Each preceding story tests its own component in isolation; nothing so far proves they are all actually mounted on the page together, which is exactly the regression a later refactor produces.

**Pixel fidelity is not automated and this task does not pretend otherwise.** Spend the last step of it on a side-by-side read against [`resources/UI/portfolio-dashboard.html`](../../../resources/UI/portfolio-dashboard.html) in a browser, and note any deliberate divergence in the PR description. A screenshot-diff harness would be the real answer; it needs Playwright, which this repo doesn't have yet (see the stories index → "Flagged for you").

**Test:** `apps/web/app/(dashboard)/page.test.tsx` (Vitest + RTL, api client stubbed with one fixture per endpoint): rendering the page yields, in DOM order, the portfolio header, the summary cards, both allocation donuts (sector and stock), the performance chart, the holdings grid, and the advisor panel — asserted via accessible section headings, not CSS classes, so the test survives restyling. Plus: when every stubbed endpoint returns an empty portfolio (no holdings, empty allocation, empty series, `404` from `/advisor/analysis/latest`), the page still renders all sections and throws nothing — the new-user case that hits every empty branch at once.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
