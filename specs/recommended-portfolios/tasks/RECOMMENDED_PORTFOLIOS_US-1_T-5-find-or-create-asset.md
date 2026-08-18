# RECOMMENDED_PORTFOLIOS_US-1_T-5: extract findOrCreateAsset to MarketDataService

**Story:** [../stories/US-1-ingest-wallet-export.md](../stories/US-1-ingest-wallet-export.md)
**Status:** Not Started
**GitHub Issue:** #147 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

The spec's Behavior Notes require a row whose `CODIGO` isn't yet in `Asset` to create the `Asset`. That find-or-create already exists — inside `PortfolioService.upsertHolding` (`apps/api/src/portfolio/portfolio.service.ts`), private, carrying a P2002 race recovery added after concurrent requests for the same new ticker were found to return 500. Reimplementing it here would duplicate two subtleties that are easy to get wrong and were expensive to find: the uppercase normalisation (without it `petr4` and `PETR4` become two `Asset` rows) and that race recovery.

Move it to `MarketDataService.findOrCreateAsset(ticker: string): Promise<{ asset: Asset; wasCreated: boolean }>` — [market-data](../../market-data/spec.md) owns the `Asset` model, and `portfolio` already depends on `MarketDataService` (it calls `backfillHistory`), so no new dependency edge appears. Then refactor `PortfolioService.upsertHolding` to call it, deleting its private copy.

**Return `wasCreated` and leave the backfill decision to the caller** — do not move the `backfillHistory` trigger inside. `portfolio` backfills a new holding's ticker so the performance chart isn't empty; this module deliberately does not, per the spec's Behavior Notes: recommended wallets have no performance chart, the Advisor needs only `currentPrice` (which market-data's daily cron supplies by iterating `Asset` rows), and backfilling would fire one 1-year fetch per new ticker against a rate-limited unofficial upstream — potentially a whole wallet's worth on one upload, for history nothing reads.

**Test:** `apps/api/src/market-data/market-data.service.spec.ts` (extends the existing file) — with a mocked `PrismaService`: (1) an existing ticker returns it with `wasCreated: false` and issues no `create`; (2) an unseen ticker creates it and returns `wasCreated: true`; (3) a lowercase ticker resolves to the same uppercase `Asset`; (4) **the race case** — `findUnique` returns `null`, `create` rejects with a Prisma `P2002`, and a second `findUnique` returns the winner's row: `findOrCreateAsset` resolves with that row and `wasCreated: false`, so the loser doesn't re-trigger a backfill, rather than surfacing the error; (5) a non-`P2002` failure propagates.

Cases 3–5 are transplanted from behaviour `portfolio.service.spec.ts` currently pins. **`apps/api/src/portfolio/portfolio.service.spec.ts` and `apps/api/test/portfolio.e2e-spec.ts` must both still pass unchanged** — including the concurrent-POST e2e case — which is what proves the refactor preserved behaviour rather than merely relocating code. Confirm red first (no `findOrCreateAsset` on `MarketDataService`), then green.

**Done when:** the tests above pass, `PortfolioService` no longer contains its own find-or-create, and the full `pnpm test` + `pnpm --filter api test:e2e` suites are green.
