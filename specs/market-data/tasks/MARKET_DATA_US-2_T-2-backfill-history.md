# MARKET_DATA_US-2_T-2: backfillHistory inserts the series idempotently

**Story:** [../stories/US-2-historical-backfill.md](../stories/US-2-historical-backfill.md)
**Status:** Done
**GitHub Issue:** #63 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_SHARED_T-1, MARKET_DATA_US-2_T-1

Implement `MarketDataService.backfillHistory(assetId)`: look up the `Asset`, call `PriceProvider.getHistory(asset.ticker, '1y', '1d')`, and write one `PriceHistory` row per returned point. Must be **idempotent** — use `createMany({ skipDuplicates: true })` (or a per-row upsert) against the `@@unique([assetId, date])` constraint, so calling it twice for the same ticker doesn't throw or double-insert. This is the spec's "one-off fetch (`range=1y&interval=1d`) backfills `PriceHistory` so the performance chart isn't empty."

The public method is the deliverable here; its call site — `POST /portfolio/holdings` creating a brand-new `Asset` — belongs to the [portfolio](../../portfolio/spec.md) module, which doesn't exist yet (see `../stories/US-2-historical-backfill.md` → Notes). Enforcing once-per-ticker in the data layer rather than at the caller is what makes that split safe.

**Test:** `apps/api/src/market-data/market-data.service.spec.ts` (extends the file from `MARKET_DATA_US-1_T-2`) — with a mocked `PrismaService` and a stubbed `PriceProvider` returning a 250-point 1y series: (1) `backfillHistory(assetId)` calls `getHistory` with that asset's ticker, `'1y'`, `'1d'`; (2) writes 250 `PriceHistory` rows carrying the returned dates/closes — spec AC-3 ("a one-time historical backfill visible in `PriceHistory`, not just today's price"), so assert the row count is the full series and not 1; (3) the write is issued with `skipDuplicates: true` (or upsert semantics), so a second `backfillHistory` call for the same asset resolves without throwing. Confirm red first (no `backfillHistory` method), then green.

**Done when:** the test above passes.
