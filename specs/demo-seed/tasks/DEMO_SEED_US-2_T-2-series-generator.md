# DEMO_SEED_US-2_T-2: Deterministic price-series generator

**Story:** [../stories/US-2-demo-account.md](../stories/US-2-demo-account.md)
**Status:** Not Started
**GitHub Issue:** #362 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Create `apps/api/prisma/seed/series.ts` with no Prisma dependency, exporting:
- `weekdaysEndingAt(end: Date, count: number): Date[]`: `count` weekday dates at UTC midnight, ascending, and the last one is `end`, or the last weekday on or before `end`.
- `randomWalk({ key, endValue, dates, dailyVolatility }): { date: Date; close: number }[]`: a reproducible walk using a small seeded PRNG (e.g. mulberry32 seeded from a hash of `key`), generated backwards from `endValue` so the last close is **exactly** `endValue`, with every close above zero.
- `compoundedIndex({ dates, annualRatePct, start = 100 })`: the CDI-shaped index, `start` on the first date, compounded daily at `(1 + annualRatePct/100)^(1/252) - 1`.

Date handling must match `todayAtUtcMidnight()` in the portfolio and market-data services.

**Test:** `apps/api/test/demo-seed/series.e2e-spec.ts` (unit-style, no database):
1. `weekdaysEndingAt(2026-09-26 [a Saturday], 5)` returns Mon 21 to Fri 25 September at UTC midnight, with no Saturday or Sunday.
2. Two `randomWalk` calls with identical input return deep-equal output. A different `key` returns different output.
3. `randomWalk` over 250 dates: the length is 250, the last close is exactly `endValue`, every close is > 0, and the dates match the input.
4. `compoundedIndex` over 252 dates at 10.5%: the first value is 100, values strictly increase, and the last value ≈ 110.5 (within 0.1).

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
