# Portfolio

**Status:** Approved
**Depends on:** [project-setup](../project-setup/spec.md), [auth](../auth/spec.md), [market-data](../market-data/spec.md)

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
  id        String   @id @default(uuid(7)) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  user      User     @relation(fields: [userId], references: [id])
  assetId   String   @map("asset_id") @db.Uuid
  asset     Asset    @relation(fields: [assetId], references: [id])
  quantity  Float
  avgPrice  Float    @map("avg_price")
  metadata  Json?    // future per-asset-type fields (fixed income maturity, crypto wallet, etc.) — no migration needed
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([userId, assetId])
  @@index([userId])
  @@map("holdings")
}

model PortfolioValueSnapshot {
  id            String   @id @default(uuid(7)) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  user          User     @relation(fields: [userId], references: [id])
  date          DateTime @db.Date
  totalValue    Float    @map("total_value")
  totalInvested Float    @map("total_invested")

  @@unique([userId, date])
  @@index([userId, date])
  @@map("portfolio_value_snapshots")
}
```

Both models follow the repo-wide Prisma conventions established by `User` (`AUTH_US-1_T-1`) and the market-data models, and recorded in [`CONVENTIONS.md`](../../CONVENTIONS.md) → "Module structure": UUIDv7 primary keys stored as native Postgres `uuid` (`@id @default(uuid(7)) @db.Uuid`) rather than `cuid()`/`TEXT`, a `snake_case` plural `@@map` per model, and `@map` on every multi-word field. Foreign-key scalars (`userId`, `assetId`) carry `@db.Uuid` too, so their column type matches the `id` they reference — a plain `String` FK would be `TEXT` and the relation wouldn't build.

Adding these models also requires the **other side** of two relations Prisma won't compile without: `holdings Holding[]` and `portfolioValueSnapshots PortfolioValueSnapshot[]` on `User`, and `holdings Holding[]` on `Asset`. Both `User` and `Asset` already exist and are owned by other modules ([auth](../auth/spec.md), [market-data](../market-data/spec.md)); market-data's spec explicitly defers its `Asset.holdings` back-relation to this module, so adding it here is expected rather than a cross-module violation.

`Holding` links to `Asset` (owned by the [market-data](../market-data/spec.md) spec), which is where `currentPrice` and the other market-published fields live — market data is shared across all users, holdings are per-user positions.

**`Holding` carries no classification.** `sector`, `subSector`, `investmentStyle`, and `riskRating` are attributes of the instrument, not of one user's position in it, so they live on `Asset` and are maintained by [market-data](../market-data/spec.md)'s assets CSV — the only source that can classify a ticker the user doesn't hold. An earlier revision of this spec put them on `Holding`, fed by the holdings CSV; that was reverted because [recommended-portfolios](../recommended-portfolios/spec.md)'s `RecommendedHolding` points at `Asset`, leaving every unheld recommendation unclassifiable. See market-data's Data Model note for the full reasoning. Nothing in this module writes those four columns.

## API Contract

All endpoints scoped to `req.user.id` (see [auth](../auth/spec.md)); no `portfolioId`/`userId` accepted from the client.

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/portfolio/holdings` | — | `Holding[]` joined with `Asset` |
| POST | `/portfolio/holdings` | `{ ticker, quantity, avgPrice }` | created `Holding` (creates the `Asset` row if the ticker is new) |
| POST | `/portfolio/holdings/upload-csv` | multipart CSV, resolved by header name: `Ticker`, `Quantidade`, `Preco Médio` — every other column ignored | `{ created, updated, errors[] }` |
| PATCH | `/portfolio/holdings/:id` | `{ quantity?, avgPrice? }` | updated `Holding` |
| DELETE | `/portfolio/holdings/:id` | — | `204` |
| GET | `/portfolio/summary` | — | `{ totalInvested, currentValue, gainLoss, returnPct }` |
| GET | `/portfolio/allocation` | `?by=sector\|subsector\|stock\|investmentStyle\|riskRating` | `[{ label, value, pct, color }]` |
| GET | `/portfolio/performance` | `?range=6M\|1Y\|ALL&benchmark=IBOVESPA\|CDI` | `{ series: [{date, value}], benchmarkSeries?, cagr, volatility, maxDrawdown, vsBenchmarkPct }` |

## Behavior Notes

- Adding a holding for a ticker not yet in `Asset` creates the `Asset` row (see [market-data](../market-data/spec.md) for how it then gets priced).
- `avgPrice` is used as a fallback current price only until [market-data](../market-data/spec.md) populates `Asset.currentPrice` for that ticker.
- CSV upload is row-by-row upsert on `(userId, assetId)` — a ticker already held gets its `quantity`/`avgPrice` updated, not duplicated; malformed rows are collected in `errors[]` and don't fail the whole batch.
- **The holdings CSV is a spreadsheet export, and the parser must resolve columns by header name, not position.** The real file is a 23-column sheet — 17 named columns plus 6 unnamed trailing ones — so positional parsing reads the wrong field. Column mapping:

  | CSV column | Field | Notes |
  |---|---|---|
  | `Ticker` | `ticker` | Required |
  | `Quantidade` | `quantity` | Required |
  | `Preco Médio` | `avgPrice` | Required. Note the accent and the space |

- **Every other column is ignored**, including the six unnamed trailing ones and the classification columns (`Grupo`, `Setor`, `Classificacao`, `Risco`, `Tipo`). The real sheet does carry those, and their presence is **not** an error — they are simply not this endpoint's business: [market-data](../market-data/spec.md)'s assets CSV owns them, under English column names matching the `Asset` fields (`sector`, `subSector`, `investmentStyle`, `riskRating`, `assetType`) rather than these Portuguese ones. `Preco`, `Posicao`, `Posicao (%)`, `Rent. (%)` and `Rent. (R$)` are values the sheet *computes* — current price is market-data's ([`Asset.currentPrice`](../market-data/spec.md)), and position and return are derived by `GET /portfolio/summary`. Importing them would create a second, immediately-stale copy of numbers this system already owns. Some rows also carry a **second** `Preco Teto`/`Status` pair in the unnamed columns (e.g. `CXSE3`, `TAEE11`) with no way to tell which is authoritative — the same ambiguity `PRECO_TETO_2` has in [recommended-portfolios](../recommended-portfolios/spec.md), resolved the same way: ignore it.
- **A row with an empty `Ticker` is skipped silently, not reported as an error.** The export ends with ~10 spreadsheet-furniture rows — blank separators, `DY Medio`, `Posicao Total`, `Rentabilidade`, and a target-allocation block keyed by `Grupo`. They are not malformed holdings; they are not holdings at all. Erroring on them would report ten failures on a perfectly good file.
- **Values arrive in Brazilian format** — `"R$ 23,68"`, `"9,37"`, `"10,32%"`, and thousands-separated `"R$ 589.394,17"`. Strip `R$`/`%`/whitespace, drop `.` thousands groups, convert `,` to `.`. This is the same parsing [recommended-portfolios](../recommended-portfolios/spec.md) already specifies; the two modules must share one implementation rather than growing a second copy.
- `cagr`/`volatility`/`maxDrawdown` are computed from `PortfolioValueSnapshot` (and `BenchmarkSnapshot` for `vsBenchmarkPct`); these are pure functions and should live in `packages/shared` so they're testable in isolation and usable from both API and any future export/report feature.

## Acceptance Criteria

- [ ] Adding a holding for a ticker never seen before creates the `Asset` and the `Holding` in one request.
- [ ] Adding a holding for a ticker already held updates quantity/avgPrice rather than creating a duplicate row.
- [ ] CSV upload with 3 valid rows and 1 malformed row creates 3 holdings and reports 1 error, without a 500.
- [ ] `GET /portfolio/allocation?by=sector` percentages sum to 100 (within floating-point tolerance).
- [ ] `GET /portfolio/summary` matches a hand-computed value for a seeded set of holdings with known prices.
- [ ] Deleting a holding removes it from `GET /portfolio/holdings` and from subsequent allocation/summary calculations.
- [ ] A user can never read or modify another user's holdings (covered by an auth-guard test, not just manual check).
- [ ] The real export (`Carteira - RendaVariavel.csv`, 23 columns) imports **31 holdings** and reports **zero** errors — the ~10 trailing furniture rows with an empty `Ticker` are skipped silently, not counted as failures.
- [ ] A CSV with only `ticker,quantity,avgPrice` — the original three-column format — still imports successfully.
- [ ] `BBAS3` from the real export imports with `quantity: 3300` and `avgPrice: 23.68`, proving `"R$ 23,68"` parsed correctly.
- [ ] Uploading the real export writes **nothing** to `Asset.sector`, `subSector`, `investmentStyle`, or `riskRating`, even though the file carries all five classification columns — they belong to [market-data](../market-data/spec.md)'s assets CSV, and their presence here is neither imported nor reported as an error.
- [ ] Uploading holdings as one user leaves another user's holdings for the same ticker completely untouched.
- [ ] A value with a thousands separator (`"R$ 589.394,17"`) parses as `589394.17`, not `589.39` or `NaN`.
- [ ] The columns the sheet computes — `Preco`, `Posicao`, `Posicao (%)`, `Rent. (%)`, `Rent. (R$)` — are not persisted anywhere, and neither are the six unnamed trailing columns (including the second `Preco Teto`/`Status` pair some rows carry).
