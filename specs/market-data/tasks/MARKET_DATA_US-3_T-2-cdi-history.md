# MARKET_DATA_US-3_T-2: CDI history into BenchmarkSnapshot

**Story:** [../stories/US-3-benchmark-series.md](../stories/US-3-benchmark-series.md)
**Status:** Done
**GitHub Issue:** #65 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_SHARED_T-1

Implement `MarketDataService.syncCdi()`: fetch 1y of daily CDI from the Banco Central SGS API (spec Behavior Note) — `GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=DD/MM/YYYY&dataFinal=DD/MM/YYYY`, series **12** (CDI, daily), which returns `[{ data: 'DD/MM/YYYY', valor: '0.043739' }, ...]`. No token required. Write one `BenchmarkSnapshot` row per business day with `benchmark: 'CDI'`, idempotent on `@@unique([benchmark, date])`.

**SGS returns a daily interest rate in percent, not a price level.** Per the spec's "CDI is compounded into an index before storage" Behavior Note and its `BenchmarkSnapshot.value` Data Model note, store `value` as a **compounded index** — start at `100` on the series' first day and apply `index *= (1 + valor / 100)` for each subsequent day — so `value` means the same kind of thing for `CDI` as for `IBOVESPA` (a level whose ratio between two dates is the return over that window). Storing the raw daily percentage would make any consumer that compares the two series, or computes `vsBenchmarkPct` from them (see [portfolio](../../portfolio/spec.md) `GET /portfolio/performance`), silently wrong.

Note SGS dates are `DD/MM/YYYY` (not ISO) and `valor` is a **string** — both need explicit parsing.

**Test:** `apps/api/src/market-data/market-data.service.spec.ts` (extends the file from earlier tasks) — with a mocked `PrismaService` and `jest.spyOn(global, 'fetch')` resolving a canned 3-day SGS payload of `[{data:'01/07/2026',valor:'0.040000'},{data:'02/07/2026',valor:'0.040000'},{data:'03/07/2026',valor:'0.040000'}]`: `syncCdi()` (1) writes 3 `BenchmarkSnapshot` rows with `benchmark: 'CDI'`; (2) parses `01/07/2026` to 2026-07-01 UTC midnight (**not** 2026-01-07 — the day/month swap is the single most likely bug here); (3) compounds rather than storing the raw rate — first row `value === 100`, second `100 * 1.0004 === 100.04`, third `100.04 * 1.0004` (assert with `toBeCloseTo`); (4) writes with `skipDuplicates: true` (or upsert semantics). Confirm red first (no `syncCdi` method), then green.

**Done when:** the test above passes.
