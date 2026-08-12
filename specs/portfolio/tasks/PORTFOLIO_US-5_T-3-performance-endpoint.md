# PORTFOLIO_US-5_T-3: GET /portfolio/performance

**Story:** [../stories/US-5-performance.md](../stories/US-5-performance.md)
**Status:** Not Started
**GitHub Issue:** #111 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_US-5_T-1, PORTFOLIO_US-5_T-2

Add `GET /portfolio/performance?range=6M|1Y|ALL&benchmark=IBOVESPA|CDI` returning `{ series, benchmarkSeries?, cagr, volatility, maxDrawdown, vsBenchmarkPct }`, per the spec's API Contract.

Read the user's `PortfolioValueSnapshot` rows (scoped to `req.user.id`, ordered by `date` ascending, filtered to `range`) into `series: [{ date, value }]`, then pass that series to `cagr`/`volatility`/`maxDrawdown` from `PORTFOLIO_US-5_T-1`. No metric arithmetic in this module — it lives in `packages/shared`.

When `benchmark` is supplied, load `BenchmarkSnapshot` rows for that benchmark over the same date window into `benchmarkSeries` and compute `vsBenchmarkPct` as the portfolio's total return minus the benchmark's over that window. Both benchmarks are stored as **index levels** — market-data compounds CDI specifically so the two are unit-consistent (see its Data Model note on `BenchmarkSnapshot.value`) — so each side's return is `last / first - 1` and no special-casing per benchmark is needed. Omit `benchmarkSeries` and `vsBenchmarkPct` entirely when `benchmark` isn't supplied; the API Contract marks `benchmarkSeries` optional.

**Compare like with like.** Benchmark rows exist for market days the user may have no snapshot for (and vice versa — snapshots only start when the user's first refresh ran). Align `vsBenchmarkPct` to the **overlapping** window — the later of the two first dates, the earlier of the two last dates — rather than each series' own endpoints. Comparing a 3-month portfolio against a 1-year index is the failure this prevents, and it produces a plausible-looking wrong number rather than an error.

Validate `range` and `benchmark` with an `@IsIn([...])` query DTO behind the global `ValidationPipe`; return `400` for unrecognised values. `range=ALL` means no lower date bound.

**Test:** `apps/api/test/portfolio.e2e-spec.ts` (extends the file from earlier tasks) — with a session cookie and seeded `PortfolioValueSnapshot` rows (insert directly via Prisma; this endpoint reads snapshots and must not depend on the event listener having fired):

1. `?range=ALL` returns `200` with `series` in ascending date order and `cagr`/`volatility`/`maxDrawdown` matching the values `PORTFOLIO_US-5_T-1`'s unit tests pin for the same figures — proving the wiring, not re-testing the math.
2. `?range=6M` excludes snapshots older than six months, and `range=ALL` on the same data returns strictly more points.
3. With `?benchmark=IBOVESPA` and seeded `BenchmarkSnapshot` rows, `benchmarkSeries` is present and `vsBenchmarkPct` equals the hand-computed difference in returns over the window.
4. **Without** `benchmark`, `benchmarkSeries` and `vsBenchmarkPct` are absent, and the request still returns `200`.
5. A benchmark series spanning a **wider** window than the portfolio's yields the same `vsBenchmarkPct` as one trimmed to the overlap — the assertion that catches comparing mismatched windows.
6. A user with no snapshots gets `200` with an empty `series` and zeroed metrics — not `NaN`, not `404`.
7. `?range=bogus` returns `400`; no auth cookie returns `401`.

Confirm red first (no route exists, so the request 404s), then green.

**Done when:** the test above passes — cases 5 and 6 especially: the first is the difference between a meaningful comparison and a confidently wrong one, and the second is what every user sees on their first day.
