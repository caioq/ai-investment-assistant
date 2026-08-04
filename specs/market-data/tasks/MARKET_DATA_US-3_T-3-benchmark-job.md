# MARKET_DATA_US-3_T-3: benchmark job wiring

**Story:** [../stories/US-3-benchmark-series.md](../stories/US-3-benchmark-series.md)
**Status:** Done
**GitHub Issue:** #66 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_US-3_T-1, MARKET_DATA_US-3_T-2

Add a `@Cron` handler — `handleBenchmarkSync()`, alongside the daily price cron from `MARKET_DATA_US-1_T-4` — that runs `syncIbovespa()` and `syncCdi()`. Schedule it as **a separate job** from the price refresh, per the spec's "A separate job fetches Ibovespa … and CDI … history"; run it after the price cron (e.g. `'0 19 * * 1-5'`, `timeZone: 'America/Sao_Paulo'`).

The two syncs must be **independently failure-isolated**: run them so one upstream being down (Yahoo Finance vs. BCB SGS — different providers, different outage windows) still lets the other complete, logging the failure via Nest's `Logger` at `error` level instead of propagating. `Promise.allSettled` expresses this directly; `await`ing them in sequence inside one `try` does not, since the first rejection would skip the second sync entirely.

**Test:** `apps/api/src/market-data/market-data.cron.spec.ts` (extends the file from `MARKET_DATA_US-1_T-4`) — (1) the handler's `@Cron` metadata declares a schedule distinct from the price refresh's, with `timeZone: 'America/Sao_Paulo'`; (2) invoking the handler calls both `syncIbovespa` and `syncCdi` once each; (3) **failure isolation:** with `syncIbovespa` stubbed to reject, invoking the handler still calls `syncCdi`, resolves rather than rejecting, and logs an error. Confirm red first (no benchmark cron handler exists), then green.

**Done when:** the test above passes — assertion (3) especially, since that's the one a naive sequential `await` implementation fails.

**Verifying spec AC-5** ("`BenchmarkSnapshot` has daily rows for both `IBOVESPA` and `CDI` covering at least the last year after the benchmark job runs once") is the manual check that closes this story: with the `db` container up and the job triggered once, confirm both benchmarks have ~1y of rows (`SELECT benchmark, COUNT(*), MIN(date), MAX(date) FROM benchmark_snapshots GROUP BY benchmark;`). It stays a manual step rather than a task test because it depends on live upstream data.
