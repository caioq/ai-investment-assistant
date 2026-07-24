# Market Data

**Status:** Approved
**Depends on:** none

## Problem

Holdings need real, current B3 prices (and history) to compute portfolio value, allocation, and performance — without hammering a free-tier quote API into rate limits.

## Goals

- Fetch current price + daily change for every ticker the app has holdings for, via brapi.dev.
- Backfill 1y of daily history for a ticker the first time it's added.
- Fetch benchmark series (Ibovespa, CDI) for performance comparison.
- Recompute each user's daily `PortfolioValueSnapshot` after prices update.

## Non-Goals

- Fixed income / crypto price providers — the `PriceProvider` interface is designed to support them later, but only `B3BrapiProvider` (equities) is implemented now.
- Real-time/intraday prices — daily granularity is enough for this use case.
- Any UI in this module — it's a backend-only integration; the dashboard reads the `Asset`/`PriceHistory`/`PortfolioValueSnapshot` rows this module maintains.

## Data Model

```prisma
enum AssetType {
  EQUITY
  FIXED_INCOME // not implemented yet
  CRYPTO       // not implemented yet
}

enum InvestmentStyle {
  SMALL_CAP
  MICRO_CAP
  DIVIDENDS
  VALUE_INVESTING
  TURNAROUND
}

enum RiskRating {
  AAA
  A
  B
  C
}

model Asset {
  id               String           @id @default(cuid())
  ticker           String           @unique
  name             String
  assetType        AssetType        @default(EQUITY)
  sector           String?
  subSector        String?
  currency         String           @default("BRL")
  exchange         String           @default("B3")
  investmentStyle  InvestmentStyle?
  riskRating       RiskRating?
  currentPrice     Float?
  currentChangePct Float?
  priceUpdatedAt   DateTime?
}

model PriceHistory {
  id      String   @id @default(cuid())
  assetId String
  asset   Asset    @relation(fields: [assetId], references: [id])
  date    DateTime @db.Date
  close   Float

  @@unique([assetId, date])
  @@index([assetId, date])
}

enum Benchmark {
  IBOVESPA
  CDI
}

model BenchmarkSnapshot {
  id        String    @id @default(cuid())
  benchmark Benchmark
  date      DateTime  @db.Date
  value     Float

  @@unique([benchmark, date])
}
```

`investmentStyle` and `riskRating` are analytical classifications, not raw market data — brapi.dev doesn't provide them. They're nullable and set manually (from the holdings UI, see [portfolio](../portfolio/spec.md)); this module never writes them.

## API Contract

This module has no required public REST surface — it runs as a scheduled job and is consumed internally by [portfolio](../portfolio/spec.md) and [advisor](../advisor/spec.md). One optional debug endpoint:

| Method | Path | Response |
|---|---|---|
| GET | `/market-data/quote/:ticker` | `{ ticker, price, changePct, updatedAt }` — for manual/debug use, not called by the frontend |

## Behavior Notes

- **Batching is mandatory:** the daily cron collects every distinct ticker across all users' `Holding` rows and makes **one** batched call — `GET https://brapi.dev/api/quote/{T1},{T2},...?token=$BRAPI_TOKEN` — never one request per ticker. This is what keeps the free tier viable as the number of users/tickers grows.
- Cron runs once daily after B3 close (`@nestjs/schedule`, e.g. 18:30 BRT weekdays), updates `Asset.currentPrice/currentChangePct/priceUpdatedAt`, inserts today's `PriceHistory` row per asset, then recomputes `PortfolioValueSnapshot` for every user (`Σ holding.quantity * asset.currentPrice`).
- When a ticker is added to a holding for the first time, a one-off fetch (`range=1y&interval=1d`) backfills `PriceHistory` so the performance chart isn't empty.
- A separate job fetches Ibovespa (via brapi.dev's index coverage) and CDI (e.g. Banco Central SGS API) history into `BenchmarkSnapshot`.
- `getOrRefreshPrice(assetId)`: on-demand refresh for interactive use (so a demo isn't stuck waiting for the next cron run), gated by a 15-minute TTL on `priceUpdatedAt`, and still always executed as a batch call even if triggered by a single asset lookup (queue the ticker, batch on a short debounce).
- Requires `BRAPI_TOKEN` in `.env` — unauthenticated requests hit a much lower rate limit.
- `PriceProvider` is an interface (`getQuote`, `getHistory`) so `FixedIncomeProvider`/`CryptoProvider` can be added later without touching the cron/aggregation logic — only `B3BrapiProvider` exists today.

## Acceptance Criteria

- [ ] Adding 5 holdings with 5 distinct tickers results in exactly 1 brapi.dev request when the cron runs, not 5.
- [ ] After the cron runs, every `Asset` referenced by a `Holding` has a non-null `currentPrice` and a `PriceHistory` row for that day.
- [ ] Adding a brand-new ticker triggers a one-time historical backfill visible in `PriceHistory` (not just today's price).
- [ ] If brapi.dev is unreachable, the cron logs the failure and leaves existing `Asset.currentPrice` values untouched rather than nulling them out or crashing the process.
- [ ] `BenchmarkSnapshot` has daily rows for both `IBOVESPA` and `CDI` covering at least the last year after the benchmark job runs once.
