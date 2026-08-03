# US-2: Historical backfill for a new ticker

**Status:** Ready
**Traces to:** spec Goal "Backfill 1y of daily history for a ticker the first time it's added." / AC "Backfilling a brand-new ticker produces a full year of `PriceHistory` rows (not just today's price), and running it a second time for the same ticker neither duplicates rows nor errors." (in `../spec.md`)

As a user who just added a stock I've held for years, I want its past year of daily closes loaded immediately, so the performance chart shows a real history instead of starting flat from today.

## Tasks

- [ ] [T-1: B3YahooProvider.getHistory 1y daily series](../tasks/MARKET_DATA_US-2_T-1-yahoo-get-history.md)
- [ ] [T-2: backfillHistory inserts the series idempotently](../tasks/MARKET_DATA_US-2_T-2-backfill-history.md)

## Notes

The spec describes this as "a one-off fetch (`range=1y&interval=1d`) … when a ticker is added to a holding for the first time." The trigger — the `POST /portfolio/holdings` call that creates a brand-new `Asset` — lives in the [portfolio](../../portfolio/spec.md) module, which doesn't exist yet. This story therefore delivers the **backfill capability** (`MarketDataService.backfillHistory(assetId)`) as a public, tested method on the service; wiring the call site into holding creation belongs to portfolio's own breakdown.

That split is intentional rather than a compromise: it keeps the "one-off" semantics enforced where the data is (T-2 is idempotent on the `@@unique([assetId, date])` constraint, so a duplicate trigger can't double-insert or crash), instead of relying on the caller to remember it's a once-per-ticker operation.
