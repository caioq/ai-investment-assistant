# DASHBOARD_UI_US-4_T-3: `PerformanceMetrics`

**Story:** [../stories/US-4-performance-chart.md](../stories/US-4-performance-chart.md)
**Status:** Not Started
**GitHub Issue:** #219 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-2, DASHBOARD_UI_SHARED_T-4

`apps/web/components/dashboard/PerformanceMetrics.tsx` — the stat strip beside the chart: CAGR, volatility, max drawdown, and performance vs. the selected benchmark, all read straight off the `GET /portfolio/performance` response (`cagr`, `volatility`, `maxDrawdown`, `vsBenchmarkPct`).

**Read these, don't recompute them.** `packages/shared/src/metrics.ts` already owns the maths and the API already applies it; a second implementation in the browser is the kind of duplication `CONVENTIONS.md` exists to prevent, and it would drift.

- All four are ratios from the API — decide once whether the wire format is `0.12` or `12` and label accordingly. Getting this wrong renders a 12% CAGR as 1200% and looks like a data bug rather than a formatting one.
- `maxDrawdown` is a loss: render it with the negative tone and an explicit minus, whatever sign the API sends.
- Those helpers return `0` for a series shorter than two points rather than `NaN`, so a new portfolio legitimately shows `0.0%` across the board. Pair each with a short caption naming the window ("since first snapshot") so a genuine zero isn't read as a broken number.
- `vsBenchmarkPct` is absent when no benchmark was requested — render an em-dash, not `0%`.

**Test:** `apps/web/components/dashboard/PerformanceMetrics.test.tsx` (Vitest + RTL): (1) all four metrics render with their labels and the agreed percentage formatting; (2) `maxDrawdown` renders with the negative tone and a minus sign; (3) a positive `vsBenchmarkPct` gets the positive tone, a negative one the negative tone; (4) an omitted `vsBenchmarkPct` renders an em-dash and no tone; (5) an all-zero response renders `0.0%` values and no `NaN`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
