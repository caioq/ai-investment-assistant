# PORTFOLIO_US-5_T-2: daily PortfolioValueSnapshot population

**Story:** [../stories/US-5-performance.md](../stories/US-5-performance.md)
**Status:** Not Started
**GitHub Issue:** #110 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_SHARED_T-1, PORTFOLIO_SHARED_T-2

Write one `PortfolioValueSnapshot` row per user per day after market-data's daily price refresh completes — `totalValue` = `Σ quantity × (asset.currentPrice ?? avgPrice)`, `totalInvested` = `Σ quantity × avgPrice`, upserted on `@@unique([userId, date])` so a re-run corrects the day rather than throwing.

**Nothing else in this module writes these rows.** Every metric in `GET /portfolio/performance` reads from this table, so without this task the endpoint returns an empty series forever, and it would be easy to ship the rest of US-5 without noticing.

## Both ends of the signal

[market-data](../../market-data/spec.md)'s Goals say it "signals that a price refresh has completed" and that the recompute "is implemented [in portfolio], subscribing to this module's signal." No such signal exists yet — market-data deliberately left its shape to the consumer — so this task builds both halves:

1. **Emit** in market-data: after `MarketDataService.refreshAllQuotes()` succeeds, emit a `market-data.refresh.completed` event. Add `@nestjs/event-emitter` (not currently an `apps/api` dependency) and register `EventEmitterModule.forRoot()` in `app.module.ts` alongside `ScheduleModule.forRoot()`.
2. **Listen** in portfolio: an `@OnEvent('market-data.refresh.completed')` handler in a dedicated `apps/api/src/portfolio/portfolio.listener.ts` (mirroring the `<module>.cron.ts` separation in `CONVENTIONS.md` → "Scheduled jobs" — the handler delegates to `PortfolioService.snapshotAllUsers()` so the logic stays unit-testable without the event bus).

Emit only on success. `refreshAllQuotes` swallows and logs upstream failures (`MARKET_DATA_US-1_T-3`), so it resolves even when Yahoo Finance is unreachable and no prices were written — snapshotting then would record a flat day built from stale prices and permanently corrupt the performance series with a fake data point. Use its `{ refreshed }` return value to decide.

**Why an event rather than a second cron.** A portfolio cron scheduled after market-data's 18:30 job would encode a *guess* about how long the refresh takes; if it ever runs long, the snapshot silently captures the previous day's prices, and the resulting chart is wrong in a way no test would catch. The event fires exactly when prices are actually in the database. It also keeps the dependency pointing the right way — market-data announces, portfolio subscribes, and market-data gains no knowledge of `Holding` or `PortfolioValueSnapshot`, which its own "Module boundary" note forbids.

The listener must not let one user's failure abort the rest — iterate users and catch per user, logging at `error` level.

**Test:** two spec files, both red first.

`apps/api/src/portfolio/portfolio.service.spec.ts` (extends the file from `PORTFOLIO_US-2_T-1`) — with a mocked `PrismaService`: (1) `snapshotAllUsers()` writes one row per user with `totalValue`/`totalInvested` hand-computed from seeded holdings, including the `?? avgPrice` fallback for an unpriced asset; (2) it **upserts** on `(userId, date)`, so a second call for the same day updates rather than throwing; (3) a user whose write rejects doesn't prevent the next user's row from being written.

`apps/api/src/portfolio/portfolio.listener.spec.ts` — (1) the handler is registered for `market-data.refresh.completed` and calls `PortfolioService.snapshotAllUsers()` exactly once when invoked; (2) **no snapshot is taken when the refresh reported `refreshed: 0`** — the assertion that stops a Yahoo outage from writing a fabricated flat day.

**Done when:** both specs pass — the `refreshed: 0` case especially, since it's the one that silently poisons historical data rather than failing visibly.
