# MARKET_DATA_US-1_T-1: B3YahooProvider.getQuote batched call

**Story:** [../stories/US-1-daily-price-refresh.md](../stories/US-1-daily-price-refresh.md)
**Status:** Not Started
**GitHub Issue:** #58 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_SHARED_T-2

Implement `getQuote(tickers: string[])` on `B3YahooProvider` (`apps/api/src/market-data/providers/b3-yahoo.provider.ts`), issuing exactly **one** request for the whole list: `GET https://query1.finance.yahoo.com/v7/finance/spark?symbols={T1}.SA,{T2}.SA,...&range=1d&interval=1d` — each ticker suffixed with `.SA` for B3, comma-joined into the `symbols` query param. Set a browser-like `User-Agent` header on the request (Yahoo is more likely to reject requests without one); no API key or `.env` variable is needed. Map each entry of the response's `spark.result[]` to the `Quote` type from `MARKET_DATA_SHARED_T-2`: `ticker` from `symbol` with the `.SA` suffix stripped back off, `price` from `response[0].meta.regularMarketPrice`, `changePct` computed as `(regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100` (the `spark` endpoint doesn't return a change-percent field directly, unlike brapi's `regularMarketChangePercent`). Use the global `fetch` (Node 22, per CI's `node-version: 22`) — no new HTTP dependency needed.

This is the task that makes the spec's "Batching is mandatory" rule real, so the call-count assertion below is the point of the test, not an incidental detail.

**Test:** `apps/api/src/market-data/providers/b3-yahoo.provider.spec.ts` — with `jest.spyOn(global, 'fetch')` stubbed to resolve a canned Yahoo `spark` payload for 5 tickers: (1) calling `getQuote(['PETR4','VALE3','ITUB4','BBAS3','WEGE3'])` issues **exactly one** `fetch` call (`expect(fetchSpy).toHaveBeenCalledTimes(1)`) — this is spec AC-1 ("5 distinct tickers results in exactly 1 Yahoo Finance request, not 5"); (2) that call's URL contains all five tickers, each suffixed `.SA`, comma-joined in the `symbols` query param; (3) the returned array maps each result to `{ ticker, price, changePct }`, with `ticker` stripped of its `.SA` suffix and `changePct` correctly computed from `regularMarketPrice`/`chartPreviousClose`. Confirm red first (no `getQuote` implementation), then green.

**Done when:** the test above passes — in particular the `toHaveBeenCalledTimes(1)` assertion, which is what prevents a later refactor from regressing this into an N-request loop.
