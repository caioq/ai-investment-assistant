# US-4: Track performance against a benchmark

**Status:** Ready
**Traces to:** spec Goal "a performance line chart with benchmark overlay and range toggle" / spec AC "Performance chart range toggle (6M/1Y/ALL) re-fetches and re-renders without a full page reload" (in `../spec.md`)

As an investor, I want my portfolio's value over time plotted against Ibovespa or CDI across a range I choose, so that I can tell whether I'm actually beating what I could have bought instead.

## Tasks

- [ ] [T-1: `PerformanceChart` SVG](../tasks/DASHBOARD_UI_US-4_T-1-performance-chart.md)
- [ ] [T-2: 6M/1Y/ALL range toggle](../tasks/DASHBOARD_UI_US-4_T-2-range-toggle.md)
- [ ] [T-3: `PerformanceMetrics`](../tasks/DASHBOARD_UI_US-4_T-3-performance-metrics.md)
- [ ] [T-4: wire the performance section](../tasks/DASHBOARD_UI_US-4_T-4-wire-performance-section.md)

## Notes

**Hand-rolled SVG, no charting library** — an explicit spec Non-Goal, and the mockup already demonstrates the technique. Budget for the arithmetic accordingly: the failure mode of a hand-rolled chart isn't an exception, it's a `NaN` in the path's `d` attribute rendering as a silently blank panel. `T-1`'s test asserts against `NaN` directly for that reason, and covers the three degenerate series (zero points, one point, all-equal) that each produce one.

**Both series share one scale.** Scaling the portfolio and the benchmark independently makes the lines cross where the numbers never did — which destroys the exact comparison the overlay exists for.

**The split between `T-1` and `T-2` is the server/client boundary.** The chart is presentational and server-rendered from the page's initial `6M` fetch; only the range toggle is `'use client'`. That's `CONVENTIONS.md`'s "smallest leaf that needs state" rule, and it's what keeps the chart in the first paint.

**Metrics belong to the rendered range.** When the user switches to `1Y`, the CAGR beside the chart has to move with it, which makes `PerformanceMetrics` a child of the client wrapper rather than a sibling on the server page.

**Read the metrics, don't recompute them.** `packages/shared/src/metrics.ts` owns `cagr`/`volatility`/`maxDrawdown` and the API already applies them. A browser-side reimplementation would drift.

**The mockup's benchmark legend says "S&P 500".** The backend's benchmarks are `IBOVESPA` and `CDI`. Take the label from the prop.
