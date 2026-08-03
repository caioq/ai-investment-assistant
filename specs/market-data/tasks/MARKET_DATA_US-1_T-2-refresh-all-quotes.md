# MARKET_DATA_US-1_T-2: refreshAllQuotes writes Asset prices + daily PriceHistory

**Story:** [../stories/US-1-daily-price-refresh.md](../stories/US-1-daily-price-refresh.md)
**Status:** Done
**GitHub Issue:** #59 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_SHARED_T-1, MARKET_DATA_US-1_T-1

Implement `MarketDataService.refreshAllQuotes()`: read every `Asset` row's `ticker`, pass the whole list to `PriceProvider.getQuote(tickers)` in one call, then for each returned quote update that `Asset`'s `currentPrice`, `currentChangePct`, and `priceUpdatedAt`, and upsert a `PriceHistory` row for today (`date` = today at UTC midnight, matching `@db.Date`; `close` = the quote's price). Return a summary (e.g. `{ refreshed: number }`) so the cron in `MARKET_DATA_US-1_T-4` and the debug endpoint have something to log.

Iterating `Asset` (rather than `Holding`) is what the spec's "Module boundary" Behavior Note requires — `Holding` belongs to the not-yet-built [portfolio](../../portfolio/spec.md) module, and every held ticker has an `Asset` row by construction. See `../stories/README.md` → "Dependency ordering". Upsert (not insert) on the `@@unique([assetId, date])` constraint so re-running the same day updates that day's close instead of throwing.

**Test:** `apps/api/src/market-data/market-data.service.spec.ts` — with a mocked `PrismaService` and a stubbed `PriceProvider` (per `CONVENTIONS.md` → "Testing": unit tests mock `PrismaService`): given 3 seeded `Asset` rows, `refreshAllQuotes()` (1) calls `getQuote` **once** with all 3 tickers; (2) writes `currentPrice`/`currentChangePct`/`priceUpdatedAt` for each asset from the matching quote; (3) upserts one `PriceHistory` row per asset for today's date with `close` equal to that asset's quoted price — spec AC-2 ("every `Asset` … has a non-null `currentPrice` and a `PriceHistory` row for that day"). Confirm red first (no `refreshAllQuotes` method), then green.

**Done when:** the test above passes.
