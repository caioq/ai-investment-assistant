# MARKET_DATA_US-3_T-1: Ibovespa history into BenchmarkSnapshot

**Story:** [../stories/US-3-benchmark-series.md](../stories/US-3-benchmark-series.md)
**Status:** Not Started
**GitHub Issue:** #64 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_SHARED_T-1

Implement `MarketDataService.syncIbovespa()`: fetch 1y of daily Ibovespa closes through Yahoo Finance's chart endpoint — ticker `^BVSP`, reusing `PriceProvider.getHistory('^BVSP', '1y', '1d')` from `MARKET_DATA_US-2_T-1` rather than a second bespoke HTTP path — and write one `BenchmarkSnapshot` row per point with `benchmark: 'IBOVESPA'`, `date`, and `value` = that day's close. Idempotent on the `@@unique([benchmark, date])` constraint (`skipDuplicates: true` / upsert) so the job can run daily without throwing on days already stored.

**Test:** `apps/api/src/market-data/market-data.service.spec.ts` (extends the file from earlier tasks) — with a mocked `PrismaService` and a stubbed `PriceProvider` returning a 250-point series: `syncIbovespa()` (1) calls `getHistory` with `'^BVSP'`, `'1y'`, `'1d'`; (2) writes 250 `BenchmarkSnapshot` rows all carrying `benchmark: 'IBOVESPA'`, with `value` taken from each point's `close`; (3) issues the write with `skipDuplicates: true` (or upsert semantics) so a re-run resolves without throwing. Confirm red first (no `syncIbovespa` method), then green.

**Done when:** the test above passes.
