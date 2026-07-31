# MARKET_DATA_US-1_T-1: B3BrapiProvider.getQuote batched call

**Story:** [../stories/US-1-daily-price-refresh.md](../stories/US-1-daily-price-refresh.md)
**Status:** Done
**GitHub Issue:** #58 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_SHARED_T-2

Implement `getQuote(tickers: string[])` on `B3BrapiProvider` (`apps/api/src/market-data/providers/b3-brapi.provider.ts`), issuing exactly **one** request for the whole list: `GET https://brapi.dev/api/quote/{T1},{T2},...?token=$BRAPI_TOKEN` (comma-joined tickers, `BRAPI_TOKEN` from `process.env` — already declared in `.env.example`). Map each entry of brapi's `results[]` to the `Quote` type from `MARKET_DATA_SHARED_T-2` (`regularMarketPrice` → `price`, `regularMarketChangePercent` → `changePct`). Use the global `fetch` (Node 22, per CI's `node-version: 22`) — no new HTTP dependency needed.

This is the task that makes the spec's "Batching is mandatory" rule real, so the call-count assertion below is the point of the test, not an incidental detail.

**Test:** `apps/api/src/market-data/providers/b3-brapi.provider.spec.ts` — with `jest.spyOn(global, 'fetch')` stubbed to resolve a canned brapi payload of 5 results: (1) calling `getQuote(['PETR4','VALE3','ITUB4','BBAS3','WEGE3'])` issues **exactly one** `fetch` call (`expect(fetchSpy).toHaveBeenCalledTimes(1)`) — this is spec AC-1 ("5 distinct tickers results in exactly 1 brapi.dev request, not 5"); (2) that call's URL contains all five tickers comma-joined in one path segment and the `token` query param; (3) the returned array maps each result to `{ ticker, price, changePct }`. Confirm red first (no `getQuote` implementation), then green.

**Done when:** the test above passes — in particular the `toHaveBeenCalledTimes(1)` assertion, which is what prevents a later refactor from regressing this into an N-request loop.
