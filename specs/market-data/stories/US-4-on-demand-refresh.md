# US-4: On-demand quote refresh

**Status:** Ready
**Traces to:** spec AC "A second `getOrRefreshPrice` call for the same asset within 15 minutes makes no Yahoo Finance request and returns the stored price." / spec Behavior Note "`getOrRefreshPrice(assetId)`: on-demand refresh for interactive use…, gated by a 15-minute TTL on `priceUpdatedAt`" / spec API Contract `GET /market-data/quote/:ticker` (in `../spec.md`)

As someone demoing the app between cron runs, I want a price I can refresh on demand without waiting until after B3 close, so the dashboard isn't showing yesterday's numbers — while still not re-hitting an unofficial, unsupported API on every page load.

## Tasks

- [ ] [T-1: getOrRefreshPrice with 15-minute TTL gate](../tasks/MARKET_DATA_US-4_T-1-get-or-refresh-price.md)
- [ ] [T-2: GET /market-data/quote/:ticker debug endpoint](../tasks/MARKET_DATA_US-4_T-2-quote-debug-endpoint.md)

## Notes

The TTL is the whole substance of T-1. Without it this method is an unmetered passthrough to Yahoo Finance that any interactive caller can trigger per render, which is exactly the rate-limit problem the spec's batching rule exists to prevent — so the test asserts the **negative** case (a second call inside the TTL window makes no HTTP request) as explicitly as the positive one.

The spec asks that an on-demand refresh be "issued through the same batched `getQuote(tickers[])` path even when triggered by a single asset lookup." T-1 satisfies that by reusing the batched provider method from `MARKET_DATA_US-1_T-1` with a one-element array. The cross-request debounce/queue that would coalesce concurrent lookups into one call is **explicitly a future optimization, not required for this version** (spec Behavior Note) — the TTL already bounds upstream traffic, so there's no task for it here.

`GET /market-data/quote/:ticker` (T-2) is explicitly "for manual/debug use, not called by the frontend" per the spec's API Contract, so it stays a thin read of what T-1 returns.
