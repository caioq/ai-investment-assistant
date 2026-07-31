# MARKET_DATA_US-1_T-4: daily cron wiring after B3 close

**Story:** [../stories/US-1-daily-price-refresh.md](../stories/US-1-daily-price-refresh.md)
**Status:** Done
**GitHub Issue:** #61 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_US-1_T-2

Add `@nestjs/schedule` as an `apps/api` dependency (not currently installed), register `ScheduleModule.forRoot()` in `apps/api/src/app.module.ts`, and add a `@Cron` handler — `MarketDataService.handleDailyRefresh()` or a dedicated `market-data.cron.ts` — that calls `refreshAllQuotes()` once daily after B3 close, per the spec's Behavior Note: **18:30 BRT, weekdays only** (`'30 18 * * 1-5'` with `timeZone: 'America/Sao_Paulo'` — set the timezone explicitly rather than relying on the host clock, which is UTC in CI and in any container deploy).

**Test:** `apps/api/src/market-data/market-data.cron.spec.ts` — asserts the schedule declaration and the delegation, without waiting on wall-clock time: (1) reading the `SchedulerRegistry` (or the `@Cron` metadata via `Reflect.getMetadata` on the handler) shows a cron expression of `30 18 * * 1-5` and `timeZone: 'America/Sao_Paulo'`; (2) invoking the handler directly calls `MarketDataService.refreshAllQuotes` exactly once. Confirm red first (no cron handler exists), then green.

**Done when:** the test above passes. Note the schedule itself is asserted as metadata rather than by advancing timers — the value being protected here is "it's registered for the right time in the right timezone," which is exactly what silently rots when a deploy's host clock is UTC.
