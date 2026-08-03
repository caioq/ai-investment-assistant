# MARKET_DATA_US-4_T-1: getOrRefreshPrice with 15-minute TTL gate

**Story:** [../stories/US-4-on-demand-refresh.md](../stories/US-4-on-demand-refresh.md)
**Status:** Not Started
**GitHub Issue:** #67 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_US-1_T-2

Implement `MarketDataService.getOrRefreshPrice(assetId)` per the spec's Behavior Note: look up the `Asset`; if `priceUpdatedAt` is within the last **15 minutes**, return the stored price without any upstream call; otherwise call `PriceProvider.getQuote([asset.ticker])` — the batched array form from `MARKET_DATA_US-1_T-1`, so an on-demand refresh is "still always executed as a batch call even if triggered by a single asset lookup" — write `currentPrice`/`currentChangePct`/`priceUpdatedAt` back, and return the fresh values. Return shape `{ ticker, price, changePct, updatedAt }`, matching what `MARKET_DATA_US-4_T-2`'s endpoint responds with.

The TTL is the substance of this task and is spec AC-6 ("a second `getOrRefreshPrice` call for the same asset within 15 minutes makes no Yahoo Finance request and returns the stored price"): without it, an interactive caller can hit Yahoo Finance on every render, the same rate-limit failure the spec's batching rule exists to prevent. The cross-request debounce/queue is **not** built here — the spec marks it a future optimization, not a requirement for this version.

**Test:** `apps/api/src/market-data/market-data.service.spec.ts` (extends the file from earlier tasks) — with a mocked `PrismaService` and a stubbed `PriceProvider`, using `jest.useFakeTimers()` to control the clock: (1) **cache hit** — an `Asset` with `priceUpdatedAt` 5 minutes ago returns the stored `currentPrice` and calls `getQuote` **zero** times (`expect(getQuote).not.toHaveBeenCalled()`); (2) **cache miss** — an `Asset` with `priceUpdatedAt` 20 minutes ago calls `getQuote` once with `['PETR4']` (assert the **array** form) and writes the fresh price back; (3) an `Asset` with `priceUpdatedAt: null` (never priced) is treated as a miss. Confirm red first (no `getOrRefreshPrice` method), then green.

**Done when:** the test above passes — assertion (1) in particular, since a passthrough implementation with no TTL satisfies (2) and (3) alone.
