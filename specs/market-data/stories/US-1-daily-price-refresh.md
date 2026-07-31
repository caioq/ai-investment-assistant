# US-1: Daily price refresh

**Status:** Ready
**Traces to:** spec Goal "Fetch current price + daily change for every ticker the app tracks, via brapi.dev." / AC "With 5 distinct tickers in `Asset`, one cron run results in exactly 1 brapi.dev request, not 5." / AC "After the cron runs, every `Asset` has a non-null `currentPrice` and a `PriceHistory` row for that day." / AC "If brapi.dev is unreachable, the cron logs the failure and leaves existing `Asset.currentPrice` values untouched rather than nulling them out or crashing the process." (in `../spec.md`)

As the platform, I want every tracked B3 ticker's current price and daily change refreshed once a day in a single batched request, so portfolio value and performance are computed from real prices without burning through brapi.dev's free-tier rate limit.

## Tasks

- [x] [T-1: B3BrapiProvider.getQuote batched call](../tasks/MARKET_DATA_US-1_T-1-brapi-get-quote-batched.md)
- [ ] [T-2: refreshAllQuotes writes Asset prices + daily PriceHistory](../tasks/MARKET_DATA_US-1_T-2-refresh-all-quotes.md)
- [ ] [T-3: provider failure leaves existing prices untouched](../tasks/MARKET_DATA_US-1_T-3-refresh-failure-handling.md)
- [ ] [T-4: daily cron wiring after B3 close](../tasks/MARKET_DATA_US-1_T-4-daily-cron.md)

## Notes

**Batching is the point of this story, not an optimization detail.** The spec calls it mandatory: one `GET https://brapi.dev/api/quote/{T1},{T2},...?token=$BRAPI_TOKEN` for all tickers, never one request per ticker. T-1 pins that down with an explicit "exactly 1 HTTP call for 5 tickers" assertion so a later refactor can't quietly regress it into an N-request loop.

The refresh iterates **`Asset` rows, not `Holding` rows**, per the spec's "Module boundary" Behavior Note — the `portfolio` module and its `Holding` table don't exist yet, and every held ticker gets an `Asset` row by construction anyway. See `README.md` → "Dependency ordering"; this is the constraint most likely to be "fixed" back into a bug by someone reading the tasks without the spec.

Recomputing `PortfolioValueSnapshot` after prices update is **not** in this story — it reads `Holding` and writes `PortfolioValueSnapshot`, both owned by [portfolio](../../portfolio/spec.md), which implements it by subscribing to this module. See `README.md` → "Out of scope for this pass".
