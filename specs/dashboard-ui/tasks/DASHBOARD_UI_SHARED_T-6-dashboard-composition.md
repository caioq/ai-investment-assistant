# DASHBOARD_UI_SHARED_T-6: dashboard composition test

**Shared by:** US-2, US-3, US-4, US-5, US-7
**Status:** Done (automated test only — see note below; the human visual review this task also calls for is still outstanding)
**GitHub Issue:** #208 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_US-2_T-3, DASHBOARD_UI_US-3_T-2, DASHBOARD_UI_US-4_T-4, DASHBOARD_UI_US-5_T-3, DASHBOARD_UI_US-7_T-5

The last task in the module. Pin the spec AC "Dashboard visually matches the mockup's layout for header, donuts, chart, holdings grid, summary cards, and advisor panel states" as far as an automated test honestly can: assert the assembled `(dashboard)/page.tsx` renders **every** section, in the mockup's order, from one set of stubbed API responses.

Each preceding story tests its own component in isolation; nothing so far proves they are all actually mounted on the page together, which is exactly the regression a later refactor produces.

**Fidelity to the mockup is settled here, by human review, and this task does not pretend a test can do it.** Spend the last step on a side-by-side read against [`resources/UI/portfolio-dashboard.html`](../../../resources/UI/portfolio-dashboard.html) in a browser, and note any deliberate divergence in the PR description. `DASHBOARD_UI_SHARED_T-9` then freezes whatever you approve here as a visual-regression baseline, so the next unintended change fails a PR — but it compares the app against **itself**, never against the prototype (see the spec's Non-Goals for why a diff against the mockup is not achievable). This review is the one and only point where a human confirms the layout matches the design.

**Test:** `apps/web/app/(dashboard)/page.test.tsx` (Vitest + RTL, api client stubbed with one fixture per endpoint): rendering the page yields, in DOM order, the portfolio header, the summary cards, both allocation donuts (sector and stock), the performance chart, the holdings grid, and the advisor panel — asserted via accessible section headings, not CSS classes, so the test survives restyling. Plus: when every stubbed endpoint returns an empty portfolio (no holdings, empty allocation, empty series, `404` from `/advisor/analysis/latest`), the page still renders all sections and throws nothing — the new-user case that hits every empty branch at once.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.

**Implementation note:** the two test cases above are done — `apps/web/app/(dashboard)/page.test.tsx` now has "renders every section, in the mockup's order, from one set of stubbed responses" and "still renders every section's heading, throwing nothing, when every endpoint returns an empty new-user portfolio", both green, both verified red first (temporarily removing `HoldingsGrid` from `(dashboard)/page.tsx` and re-running made both fail for the expected reason, then the removal was reverted — no composition bug found; all six sections were already correctly wired by the five prior wiring tasks). No component or `page.tsx` change was needed. **The human side-by-side visual review against `resources/UI/portfolio-dashboard.html` described above is still outstanding** — that step requires a browser and a human, neither of which this automated pass has, and it has not been performed. Don't read this task's `Done` status as covering that review.
