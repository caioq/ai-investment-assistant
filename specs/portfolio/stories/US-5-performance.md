# US-5: Track performance against a benchmark

**Status:** Ready
**Traces to:** spec Goal "Compute portfolio summary … and performance over time, including comparison against a benchmark." / spec API Contract `GET /portfolio/performance` / spec Behavior Note "`cagr`/`volatility`/`maxDrawdown` are computed from `PortfolioValueSnapshot` (and `BenchmarkSnapshot` for `vsBenchmarkPct`); these are pure functions and should live in `packages/shared`…" (in `../spec.md`)

As an investor, I want my portfolio's value over time next to Ibovespa or CDI, so "am I actually doing well?" has an answer better than the raw gain number.

## Tasks

- [ ] [T-1: CAGR / volatility / max drawdown in packages/shared](../tasks/PORTFOLIO_US-5_T-1-metrics-shared.md)
- [ ] [T-2: daily PortfolioValueSnapshot population](../tasks/PORTFOLIO_US-5_T-2-daily-snapshot.md)
- [ ] [T-3: GET /portfolio/performance](../tasks/PORTFOLIO_US-5_T-3-performance-endpoint.md)

## Notes

**T-2 is the load-bearing one, and it's easy to miss.** Every metric in this story is computed *from* `PortfolioValueSnapshot`, but nothing in the spec's API Contract ever writes a snapshot row — the table would stay empty and `GET /portfolio/performance` would return an empty series forever. [market-data](../../market-data/spec.md) deliberately left this to us: its Goals say it "signals that a price refresh has completed" and that the recompute "is implemented [in portfolio], subscribing to this module's signal." T-2 builds both ends of that signal. See the task for why an event beats scheduling a second cron and hoping it lands after the first.

**T-1 is pure and unblocked** — CAGR, volatility, and max drawdown over a `{date, value}[]` series, no database, no Nest. It can start immediately, in parallel with everything else. These are the calculations `CONVENTIONS.md` → "Shared utilities" already anticipates at `packages/shared/src/metrics.ts`.

The three metrics have genuinely fiddly edge cases that only a pure unit test will pin down — a series shorter than two points, a flat series (zero volatility, zero drawdown, not `NaN`), and a series that only ever rises (drawdown must be `0`, and a naive "peak minus trough" implementation returns something non-zero). T-1 enumerates them.

`vsBenchmarkPct` is what makes this a *comparison* rather than a chart: it needs `BenchmarkSnapshot` rows from market-data, which are already populated and stored as index levels — deliberately unit-consistent between `IBOVESPA` and `CDI` precisely so this endpoint can compare them the same way (see market-data's Data Model note on `BenchmarkSnapshot.value`).
