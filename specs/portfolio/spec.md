# Portfolio

**Status:** Approved
**Depends on:** [auth](../auth/spec.md), [market-data](../market-data/spec.md)

## Problem

The user needs to record which B3 stocks they hold (ticker, quantity, average price) and see them rolled up into allocation and summary views — this is the core data the rest of the platform (dashboard, AI Advisor) is built on.

## Goals

- Add holdings manually or via CSV upload.
- Edit/remove holdings.
- Compute allocation by sector, sub-sector, stock, investment style, and risk rating.
- Compute portfolio summary (invested, current value, gain/loss, return %) and performance over time, including comparison against a benchmark.

## Non-Goals

- Multiple portfolios per user — there is exactly one portfolio per user, implicitly the set of that user's `Holding` rows. No `Portfolio` entity exists. (If multi-portfolio is ever needed, reintroduce a `Portfolio` model and swap `userId` → `portfolioId` on `Holding` and `PortfolioValueSnapshot`.)
- Brokerage integration — holdings are entered by the user, not pulled from a broker account.
- Dividend tracking — out of scope for this version. The focus is concentration by asset/sector/style as input for the AI Advisor, not income tracking.

## Data Model

```prisma
model Holding {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  assetId     String
  asset       Asset     @relation(fields: [assetId], references: [id])
  quantity    Float
  avgPrice    Float
  metadata    Json?     // future per-asset-type fields (fixed income maturity, crypto wallet, etc.) — no migration needed
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([userId, assetId])
  @@index([userId])
}

model PortfolioValueSnapshot {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  date          DateTime @db.Date
  totalValue    Float
  totalInvested Float

  @@unique([userId, date])
  @@index([userId, date])
}
```

`Holding` links to `Asset` (owned by the [market-data](../market-data/spec.md) spec), which is where `currentPrice`, `sector`, `investmentStyle`, and `riskRating` live — market data is shared across users, holdings are per-user positions. `investmentStyle` and `riskRating` are edited from the holdings UI even though they're stored on `Asset`, since that's where the user is looking at a specific stock.

## API Contract

All endpoints scoped to `req.user.id` (see [auth](../auth/spec.md)); no `portfolioId`/`userId` accepted from the client.

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/portfolio/holdings` | — | `Holding[]` joined with `Asset` |
| POST | `/portfolio/holdings` | `{ ticker, quantity, avgPrice }` | created `Holding` (creates the `Asset` row if the ticker is new) |
| POST | `/portfolio/holdings/upload-csv` | multipart CSV: `ticker,quantity,avgPrice` | `{ created, updated, errors[] }` |
| PATCH | `/portfolio/holdings/:id` | `{ quantity?, avgPrice? }` | updated `Holding` |
| DELETE | `/portfolio/holdings/:id` | — | `204` |
| GET | `/portfolio/summary` | — | `{ totalInvested, currentValue, gainLoss, returnPct }` |
| GET | `/portfolio/allocation` | `?by=sector\|subsector\|stock\|investmentStyle\|riskRating` | `[{ label, value, pct, color }]` |
| GET | `/portfolio/performance` | `?range=6M\|1Y\|ALL&benchmark=IBOVESPA\|CDI` | `{ series: [{date, value}], benchmarkSeries?, cagr, volatility, maxDrawdown, vsBenchmarkPct }` |

## Behavior Notes

- Adding a holding for a ticker not yet in `Asset` creates the `Asset` row (see [market-data](../market-data/spec.md) for how it then gets priced).
- `avgPrice` is used as a fallback current price only until [market-data](../market-data/spec.md) populates `Asset.currentPrice` for that ticker.
- CSV upload is row-by-row upsert on `(userId, assetId)` — a ticker already held gets its `quantity`/`avgPrice` updated, not duplicated; malformed rows are collected in `errors[]` and don't fail the whole batch.
- `cagr`/`volatility`/`maxDrawdown` are computed from `PortfolioValueSnapshot` (and `BenchmarkSnapshot` for `vsBenchmarkPct`); these are pure functions and should live in `packages/shared` so they're testable in isolation and usable from both API and any future export/report feature.

## Acceptance Criteria

- [ ] Adding a holding for a ticker never seen before creates the `Asset` and the `Holding` in one request.
- [ ] Adding a holding for a ticker already held updates quantity/avgPrice rather than creating a duplicate row.
- [ ] CSV upload with 3 valid rows and 1 malformed row creates 3 holdings and reports 1 error, without a 500.
- [ ] `GET /portfolio/allocation?by=sector` percentages sum to 100 (within floating-point tolerance).
- [ ] `GET /portfolio/summary` matches a hand-computed value for a seeded set of holdings with known prices.
- [ ] Deleting a holding removes it from `GET /portfolio/holdings` and from subsequent allocation/summary calculations.
- [ ] A user can never read or modify another user's holdings (covered by an auth-guard test, not just manual check).
