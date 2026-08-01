# MARKET_DATA_US-1_T-3: provider failure leaves existing prices untouched

**Story:** [../stories/US-1-daily-price-refresh.md](../stories/US-1-daily-price-refresh.md)
**Status:** Not Started
**GitHub Issue:** #60 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_US-1_T-2

Make `MarketDataService.refreshAllQuotes()` survive an unreachable upstream: wrap the `PriceProvider.getQuote` call so a rejection (network error, non-2xx, malformed payload) is caught, logged via Nest's `Logger` at `error` level, and returned from rather than rethrown — leaving every existing `Asset.currentPrice`/`currentChangePct`/`priceUpdatedAt` exactly as it was, writing **no** `PriceHistory` row, and letting the process continue.

This is spec AC-4 verbatim ("logs the failure and leaves existing `Asset.currentPrice` values untouched rather than nulling them out or crashing the process"). The failure mode being guarded against is specific: a stale-but-real price is useful, a `null` price silently breaks every downstream portfolio-value and allocation computation, and an unhandled rejection inside a cron tick can take the scheduler down with it.

**Test:** `apps/api/src/market-data/market-data.service.spec.ts` (extends the file from `MARKET_DATA_US-1_T-2`) — with a stubbed `PriceProvider` whose `getQuote` rejects, and a seeded `Asset` that already has `currentPrice: 42`: `refreshAllQuotes()` (1) resolves rather than rejecting; (2) issues **no** `asset.update` and **no** `priceHistory.upsert` call on the mocked `PrismaService`, so the existing `currentPrice` is neither overwritten nor nulled; (3) logs an error (assert via `jest.spyOn(Logger.prototype, 'error')`). Confirm red first (the unguarded call rejects and the test fails on the unhandled rejection), then green.

**Done when:** the test above passes.
