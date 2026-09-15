# DASHBOARD_UI_US-4_T-2: 6M/1Y/ALL range toggle

**Story:** [../stories/US-4-performance-chart.md](../stories/US-4-performance-chart.md)
**Status:** Not Started
**GitHub Issue:** #218 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-1, DASHBOARD_UI_US-4_T-1

`apps/web/components/dashboard/PerformanceRange.tsx` — the `'use client'` wrapper holding the selected range and re-fetching `GET /portfolio/performance?range=6M|1Y|ALL&benchmark=…` on change, re-rendering `PerformanceChart` **without a full page reload** (spec AC).

This is the boundary between server and client rendering on this page, and the reason `PerformanceChart` itself stays presentational: the page server-renders the initial `6M` response and hands it in as `initialData`, so the chart is on screen in the first paint and only *changing* the range costs a request (`CONVENTIONS.md` → "Component conventions": `'use client'` on the smallest leaf that needs state).

- Mark the active range with `aria-pressed`, so the selection is expressed in the accessibility tree and not only by colour.
- Disable the group while a fetch is in flight, and **ignore a response whose range is no longer the selected one** — clicking `ALL` then `1Y` quickly can otherwise land the slower `ALL` response last and leave the chart contradicting the highlighted button. Track the in-flight range and drop stale resolutions.
- A failed fetch keeps the previously rendered series and surfaces an inline retry; blanking the chart because one request failed loses data the user already had.

**Test:** `apps/web/components/dashboard/PerformanceRange.test.tsx` (Vitest + RTL + `userEvent`, api client mocked): (1) initial render shows `initialData` with **no** fetch fired; (2) clicking `1Y` fetches with `range=1Y` and re-renders with the new series; (3) the active button carries `aria-pressed="true"` and the others `"false"`; (4) out-of-order responses — resolve a deferred `ALL` *after* a later `1Y` and assert the chart shows the `1Y` series; (5) a rejected fetch leaves the previous series rendered and shows the retry affordance.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
