# PORTFOLIO_US-5_T-1: CAGR / volatility / max drawdown in packages/shared

**Story:** [../stories/US-5-performance.md](../stories/US-5-performance.md)
**Status:** Done
**GitHub Issue:** #109 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_SHARED_T-3

Add `packages/shared/src/metrics.ts` — the location `CONVENTIONS.md` → "Shared utilities" already anticipates for exactly this — exporting three pure functions over a `{ date: Date; value: number }[]` series sorted ascending by date, re-exported from `packages/shared/src/index.ts`:

- `cagr(series)` — compound annual growth rate: `(last / first) ** (1 / years) - 1`, where `years` is the actual elapsed span between the first and last date (day count / 365.25), **not** the number of data points. Snapshots are weekday-only, so counting points would treat ~252 trading days as 252/365 of a year and inflate every result.
- `volatility(series)` — annualised standard deviation of **daily returns** (`vᵢ / vᵢ₋₁ - 1`), scaled by `√252` (trading days per year), which is what makes it comparable to published figures.
- `maxDrawdown(series)` — the largest peak-to-trough decline as a positive fraction, computed by tracking the running maximum. **Not** `(max - min) / max`: that formula reports a drawdown for a series that only ever rises, because the minimum can precede the maximum.

The spec's Behavior Notes require these be pure and in `packages/shared` "so they're testable in isolation and usable from both API and any future export/report feature" — which is what lets the degenerate cases below be pinned directly instead of through a seeded HTTP round-trip.

Return `0` — never `NaN`, `Infinity`, or a throw — for every degenerate input: a series shorter than two points, a flat series, and (for `cagr`) a first value of `0`. These reach the dashboard as numbers; `NaN` serialises to `null` in JSON and renders as an empty tile with nothing explaining it.

**Test:** `packages/shared/src/metrics.test.ts` — Vitest, colocated, using the runner from `PORTFOLIO_SHARED_T-3`:

1. **`cagr` against a hand-computed case** — 100 → 121 over exactly two years is `0.10` (`toBeCloseTo`). Also assert 100 → 110 over ~1 year on a **weekday-only** series (~252 points) is ≈`0.10`, not ≈`0.145` — the assertion a points-counting implementation fails.
2. **`maxDrawdown` on a strictly increasing series is exactly `0`** — the case `(max - min) / max` gets wrong.
3. `maxDrawdown` on 100 → 120 → 60 → 90 is `0.5` (peak 120 to trough 60), not `0.4` (first value to trough).
4. **`volatility` on a flat series is `0`**, and on a known-variance series matches a hand-computed annualised figure.
5. All three return `0` for `[]` and for a single-point series — no `NaN`, no throw.

Confirm red first (no `metrics.ts`), then green.

**Done when:** the test above passes — cases 1 and 2 especially, since both wrong implementations are the natural first thing to write and both look right until someone compares the number to a broker statement.

This task has no dependency on the database, Nest, or any other portfolio task beyond the test runner, so it can be picked up immediately and in parallel.
