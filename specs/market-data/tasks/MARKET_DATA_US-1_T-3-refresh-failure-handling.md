# MARKET_DATA_US-1_T-3: provider failure leaves existing prices untouched

**Story:** [../stories/US-1-daily-price-refresh.md](../stories/US-1-daily-price-refresh.md)
**Status:** Not Started
**GitHub Issue:** #60 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_US-1_T-2

Two halves, because the guarantee needs both: the provider must **reject** on every upstream failure mode, and the service must **catch** that rejection.

**Provider half** — in `B3YahooProvider.getQuote` (`apps/api/src/market-data/providers/b3-yahoo.provider.ts`, from `MARKET_DATA_US-1_T-1`), make the failure modes throw explicitly rather than relying on a downstream `TypeError`:

- **Non-2xx:** `fetch` does **not** reject on 4xx/5xx, so a rate-limited `429` currently flows straight into `res.json()`. Check `res.ok` and throw with the status included. Today this only fails loudly by luck — Yahoo's block page is HTML, so `res.json()` happens to throw a `SyntaxError` — but a `429` carrying a JSON error body would parse fine and then die on `payload.spark` being undefined, several lines from the real cause.
- **Malformed payload:** a ticker Yahoo doesn't recognise comes back with an empty `response` array, so `result.response[0].meta` throws `TypeError: cannot read 'meta' of undefined` mid-`map`, losing every other ticker in the batch. Skip entries missing `response[0].meta` instead of destructuring blindly. Likewise guard `chartPreviousClose === 0`, which yields `Infinity` for `changePct` rather than throwing — a poisoned number is worse than a missing one, since it propagates silently into portfolio math.

**Service half** — make `MarketDataService.refreshAllQuotes()` survive an unreachable upstream: wrap the `PriceProvider.getQuote` call so a rejection (network error, non-2xx, malformed payload) is caught, logged via Nest's `Logger` at `error` level, and returned from rather than rethrown — leaving every existing `Asset.currentPrice`/`currentChangePct`/`priceUpdatedAt` exactly as it was, writing **no** `PriceHistory` row, and letting the process continue.

This is spec AC-4 verbatim ("logs the failure and leaves existing `Asset.currentPrice` values untouched rather than nulling them out or crashing the process"). The failure mode being guarded against is specific: a stale-but-real price is useful, a `null` price silently breaks every downstream portfolio-value and allocation computation, and an unhandled rejection inside a cron tick can take the scheduler down with it.

Note the deliberate split of responsibility: the provider fails **loudly and precisely**, and exactly one place — the service — swallows and logs. Catching inside `getQuote` and returning `[]` would mean a provider bug during a live portfolio request degrades to "no prices" with nothing in the logs.

**Test:** two spec files, both red first, then green.

`apps/api/src/market-data/providers/b3-yahoo.provider.spec.ts` (extends the file from `MARKET_DATA_US-1_T-1`), with `jest.spyOn(global, 'fetch')` stubbed per case: (1) a `429` response whose body is **valid JSON** makes `getQuote` reject with the status in the message — this is the case that passes today for the wrong reason, so assert on the message, not merely that it rejects; (2) a payload whose `spark.result[]` contains one entry with an empty `response: []` alongside one well-formed entry returns **only** the well-formed `Quote` rather than throwing, so one bad ticker cannot void the batch; (3) an entry with `chartPreviousClose: 0` is likewise skipped rather than emitting `changePct: Infinity`.

`apps/api/src/market-data/market-data.service.spec.ts` (extends the file from `MARKET_DATA_US-1_T-2`) — with a stubbed `PriceProvider` whose `getQuote` rejects, and a seeded `Asset` that already has `currentPrice: 42`: `refreshAllQuotes()` (1) resolves rather than rejecting; (2) issues **no** `asset.update` and **no** `priceHistory.upsert` call on the mocked `PrismaService`, so the existing `currentPrice` is neither overwritten nor nulled; (3) logs an error (assert via `jest.spyOn(Logger.prototype, 'error')`). Confirm red first (the unguarded call rejects and the test fails on the unhandled rejection), then green.

**Done when:** both specs above pass — the provider rejecting with a useful message on non-2xx, and `refreshAllQuotes()` leaving prices untouched when it does.
