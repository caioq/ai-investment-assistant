# Market Data

**Status:** Approved
**Depends on:** [project-setup](../project-setup/spec.md)

## Problem

Holdings need real, current B3 prices (and history) to compute portfolio value, allocation, and performance — without hammering an unofficial, undocumented quote API into a rate limit or an outright block.

## Goals

- Fetch current price + daily change for every ticker the app tracks, via Yahoo Finance's public quote/chart endpoints.
- Backfill 1y of daily history for a ticker the first time it's added.
- Fetch benchmark series (Ibovespa, CDI) for performance comparison.
- Signal that a price refresh has completed, so each user's daily `PortfolioValueSnapshot` can be recomputed off it. The recompute itself (`Σ holding.quantity * asset.currentPrice`) reads `Holding` and writes `PortfolioValueSnapshot` — both owned by [portfolio](../portfolio/spec.md) — so it is implemented there, subscribing to this module's signal. The dependency must not run the other way. See "Module boundary" under Behavior Notes.

## Non-Goals

- Fixed income / crypto price providers — the `PriceProvider` interface is designed to support them later, but only `B3YahooProvider` (equities) is implemented now.
- Real-time/intraday prices — daily granularity is enough for this use case.
- Any UI in this module — it's a backend-only integration; the dashboard reads the `Asset`/`PriceHistory`/`BenchmarkSnapshot` rows this module maintains.

## Data Model

```prisma
enum AssetType {
  EQUITY
  FIXED_INCOME // not implemented yet
  CRYPTO       // not implemented yet
}

model Asset {
  id               String    @id @default(uuid(7)) @db.Uuid
  ticker           String    @unique
  name             String
  assetType        AssetType @default(EQUITY) @map("asset_type")
  currency         String    @default("BRL")
  exchange         String    @default("B3")
  currentPrice     Float?    @map("current_price")
  currentChangePct Float?    @map("current_change_pct")
  priceUpdatedAt   DateTime? @map("price_updated_at")
  priceHistory     PriceHistory[]

  @@map("assets")
}

model PriceHistory {
  id      String   @id @default(uuid(7)) @db.Uuid
  assetId String   @map("asset_id") @db.Uuid
  asset   Asset    @relation(fields: [assetId], references: [id])
  date    DateTime @db.Date
  close   Float

  @@unique([assetId, date])
  @@index([assetId, date])
  @@map("price_history")
}

enum Benchmark {
  IBOVESPA
  CDI
}

model BenchmarkSnapshot {
  id        String    @id @default(uuid(7)) @db.Uuid
  benchmark Benchmark
  date      DateTime  @db.Date
  value     Float

  @@unique([benchmark, date])
  @@map("benchmark_snapshots")
}
```

**`Asset` carries no analytical classification.** Sector, sub-sector, investment style, and risk rating are *the user's own* read on a position, not market data — Yahoo Finance publishes none of them. They live on `Holding` (per-user), owned by [portfolio](../portfolio/spec.md), and arrive through that module's holdings CSV. They were on `Asset` in an earlier revision; the move was deliberate. `Asset` is shared master data across every user, so a classification written from one user's upload would silently rewrite what every other user sees — the same objection that keeps `RISCO` out of [recommended-portfolios](../recommended-portfolios/spec.md). Do not add these columns back here.

`BenchmarkSnapshot.value` is always an **index level**, never a rate — a value whose ratio between two dates is the return over that window. This matters because the two benchmarks arrive in different units: Ibovespa is already a level, while CDI is published as a daily interest rate in percent and must be compounded into a level before storage (see Behavior Notes). Storing CDI's raw daily percentage would make `value` mean something different per benchmark and silently corrupt any consumer comparing the two series — notably `vsBenchmarkPct` in [portfolio](../portfolio/spec.md)'s `GET /portfolio/performance`.

When [portfolio](../portfolio/spec.md)'s `Holding` model lands it adds a `holdings Holding[]` back-relation to `Asset`; Prisma requires both sides of that relation, so it's added by that module, not this one.

## API Contract

This module has no required public REST surface — it runs as a scheduled job and is consumed internally by [portfolio](../portfolio/spec.md) and [advisor](../advisor/spec.md). One optional debug endpoint:

| Method | Path | Response |
|---|---|---|
| GET | `/market-data/quote/:ticker` | `{ ticker, price, changePct, updatedAt }` — for manual/debug use, not called by the frontend |

## Behavior Notes

- **Module boundary:** this module owns `Asset`, `PriceHistory`, and `BenchmarkSnapshot` and is built **before** [portfolio](../portfolio/spec.md), which owns `Holding` and `PortfolioValueSnapshot`. Nothing here may read or write those two tables — the dependency runs one way, portfolio → market-data (its `Holding.asset` relation needs `Asset`). Anything phrased below in terms of "tickers the app tracks" therefore means **`Asset` rows**, which is equivalent in practice: per portfolio's own Behavior Notes, adding a holding for an unknown ticker creates the `Asset` row, so every held ticker has one by construction.
- **Batching is mandatory:** the daily cron collects every distinct ticker in `Asset` and makes **one** batched call — `GET https://query1.finance.yahoo.com/v7/finance/spark?symbols={T1}.SA,{T2}.SA,...&range=1d&interval=1d` — never one request per ticker. This is what keeps request volume low against an API with no published quota and no SLA (see "Why Yahoo Finance" below).
- Cron runs once daily after B3 close (`@nestjs/schedule`, e.g. 18:30 BRT weekdays — set the timezone explicitly rather than relying on the host clock, which is UTC in CI and in container deploys), updates `Asset.currentPrice/currentChangePct/priceUpdatedAt`, and upserts today's `PriceHistory` row per asset. Recomputing `PortfolioValueSnapshot` is triggered after this completes but implemented in [portfolio](../portfolio/spec.md), per "Module boundary" above.
- When a ticker is added to a holding for the first time, a one-off fetch (`range=1y&interval=1d`) backfills `PriceHistory` so the performance chart isn't empty. This module exposes the backfill as a callable method; the call site (holding creation) lives in [portfolio](../portfolio/spec.md). It must be idempotent against `@@unique([assetId, date])`, so a repeated trigger can't double-insert.
- A separate job fetches Ibovespa (via Yahoo Finance's chart endpoint, ticker `^BVSP` — no `.SA` suffix, it's an index not a B3-listed equity) and CDI (Banco Central SGS API, series 12) history into `BenchmarkSnapshot`. Separate from the price cron so one upstream being down doesn't block the other — the two syncs are failure-isolated from each other, and a failure is logged rather than propagated.
- **CDI is compounded into an index before storage:** SGS returns a daily rate in percent (`valor`, a string, with `data` as `DD/MM/YYYY`). Store the series as a level starting at `100` on its first day, applying `index *= (1 + valor / 100)` per day, so `BenchmarkSnapshot.value` is unit-consistent with Ibovespa (see Data Model).
- `getOrRefreshPrice(assetId)`: on-demand refresh for interactive use (so a demo isn't stuck waiting for the next cron run), gated by a 15-minute TTL on `priceUpdatedAt`, and issued through the same batched `getQuote(tickers[])` path even when triggered by a single asset lookup. The TTL is the requirement; a cross-request debounce/queue that coalesces concurrent lookups into one call is a **future optimization, not required for this version** — the TTL already bounds upstream traffic, and adding a queue before there's measured contention would be speculative.
- If Yahoo Finance is unreachable, the failure is logged and existing `Asset.currentPrice` values are left untouched — never nulled, never allowed to crash the job. A stale-but-real price is usable; a null one breaks every downstream value and allocation computation.
- **Why Yahoo Finance, not a documented paid API:** brapi.dev's actual free tier caps at 1 ticker per request (no batching) and 3 months of history — incompatible with "batching is mandatory" above; batching only exists on its paid plans. Yahoo Finance's `/v7/finance/spark` (batched quotes) and `/v8/finance/chart` (history, `events=div` for dividends) endpoints are free with no published quota, but they're **unofficial and undocumented** — no ToS-backed support, no SLA, and Yahoo has tightened parts of this surface before (its richer `/v7/finance/quote` endpoint now requires a session-cookie-derived crumb token, which is why `getQuote` uses `/spark` instead — it stays token-free). Acceptable for a personal project; would need re-evaluation for anything commercial. No API key or `.env` variable is required for either endpoint, but requests must set a browser-like `User-Agent` header or they're more likely to be rejected.
- `PriceProvider` is an interface (`getQuote`, `getHistory`) so `FixedIncomeProvider`/`CryptoProvider` can be added later without touching the cron/aggregation logic — only `B3YahooProvider` exists today.

## Acceptance Criteria

- [ ] With 5 distinct tickers in `Asset`, one cron run results in exactly 1 Yahoo Finance request, not 5.
- [ ] After the cron runs, every `Asset` has a non-null `currentPrice` and a `PriceHistory` row for that day.
- [ ] Backfilling a brand-new ticker produces a full year of `PriceHistory` rows (not just today's price), and running it a second time for the same ticker neither duplicates rows nor errors.
- [ ] If Yahoo Finance is unreachable, the cron logs the failure and leaves existing `Asset.currentPrice` values untouched rather than nulling them out or crashing the process.
- [ ] `BenchmarkSnapshot` has daily rows for both `IBOVESPA` and `CDI` covering at least the last year after the benchmark job runs once, with `CDI` stored as a compounded index level rather than a raw daily rate.
- [ ] A second `getOrRefreshPrice` call for the same asset within 15 minutes makes no Yahoo Finance request and returns the stored price.
