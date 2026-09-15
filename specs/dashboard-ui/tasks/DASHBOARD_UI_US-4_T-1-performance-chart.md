# DASHBOARD_UI_US-4_T-1: `PerformanceChart` SVG

**Story:** [../stories/US-4-performance-chart.md](../stories/US-4-performance-chart.md)
**Status:** Not Started
**GitHub Issue:** #217 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-2, DASHBOARD_UI_SHARED_T-4

`apps/web/components/dashboard/PerformanceChart.tsx` — hand-rolled SVG line chart with an area fill, mirroring the mockup's technique (line 178: `viewBox="0 0 640 220"`, `preserveAspectRatio="none"`, a `linearGradient` fill under the path). No charting dependency — explicit spec Non-Goal.

Props: `{ series: PortfolioValuePoint[], benchmarkSeries?: PortfolioValuePoint[], benchmarkLabel?: string }`. Presentational; the range toggle and re-fetching are `US-4_T-2`.

- Scale the path to the **combined** min/max of both series, not the portfolio's alone — scaling each independently makes the two lines cross in ways the underlying numbers never did, which is precisely the comparison the overlay exists to support.
- The benchmark renders as a second, dashed, muted line with a legend naming it (`IBOVESPA`/`CDI`), and is omitted entirely when `benchmarkSeries` is absent.
- Because the mockup uses `preserveAspectRatio="none"`, stroke widths stretch with the container. Set `vector-effect="non-scaling-stroke"` on the paths, or the line thins to a hair on a wide screen.
- Guard the degenerate series: **zero points** renders an empty state; **one point** renders a flat baseline, not a zero-length path; an all-equal series makes `max - min` zero, so a naive `(v - min) / (max - min)` divides by zero and yields `NaN` in the `d` attribute — which renders as a silently blank chart, not an error.

The mockup's benchmark legend says "S&P 500". The backend's benchmarks are `IBOVESPA` and `CDI` ([market-data](../../market-data/spec.md)); take the label from the prop, never from the mockup.

**Test:** `apps/web/components/dashboard/PerformanceChart.test.tsx` (Vitest + RTL): (1) a multi-point series renders one `<path>` whose `d` has a command per point and contains no `NaN`; (2) with a `benchmarkSeries`, two paths render and the legend names the benchmark; (3) without one, only the portfolio path renders; (4) both series are scaled to a shared domain — a benchmark point above the portfolio's maximum renders at a higher position (smaller `y`) than every portfolio point; (5) an empty series renders the empty state and no `<path>`; (6) an all-equal series renders a flat path with no `NaN` in `d`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
