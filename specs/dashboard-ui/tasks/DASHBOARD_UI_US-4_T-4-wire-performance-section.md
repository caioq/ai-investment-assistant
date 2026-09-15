# DASHBOARD_UI_US-4_T-4: wire the performance section

**Story:** [../stories/US-4-performance-chart.md](../stories/US-4-performance-chart.md)
**Status:** Not Started
**GitHub Issue:** #220 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_US-2_T-3, DASHBOARD_UI_US-4_T-2, DASHBOARD_UI_US-4_T-3

Add the performance section to `apps/web/app/(dashboard)/page.tsx`, beside the allocation panel per the mockup's two-column row (line 152): `PerformanceRange` seeded with the `?range=6M&benchmark=IBOVESPA` response the page already fetches for `US-2_T-3`'s daily-change derivation, plus `PerformanceMetrics` from the same payload.

**Reuse that single fetch — don't add a second one.** The page already requests this exact endpoint to derive the header's daily change; fetching it again for the chart doubles the load on a Yahoo-backed series for no new data.

Note the coupling for whoever changes it later: the metrics belong to the *rendered* range, so when the user switches to `1Y`, the metrics must move with the chart rather than keep describing `6M`. That makes `PerformanceMetrics` a child of the client wrapper, not a sibling on the server page.

**Test:** extend `apps/web/app/(dashboard)/page.test.tsx`: (1) the chart and metrics both render from the stubbed performance response; (2) `/portfolio/performance` is requested exactly **once** across the whole page render; (3) after switching the range to `1Y`, the displayed CAGR is the one from the `1Y` response, not the `6M` one.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
