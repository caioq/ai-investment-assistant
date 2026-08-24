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
// Normalised from the holdings CSV's Portuguese `Classificacao` column.
// `ETF` is in the list because the user's sheet classifies SMAL11 that way —
// the enum follows the source data rather than a tidier taxonomy.
enum InvestmentStyle {
  SMALL_CAP
  MICRO_CAP
  DIVIDENDS
  VALUE_INVESTING
  TURNAROUND
  ETF
}

// Standard S&P / Fitch long-term scale (identical notation between the two
// agencies), declared best-credit → worst so Postgres' enum ordering sorts
// low-risk → high-risk natively. Declared complete on purpose — see the note
// below the schema. Prisma identifiers can't contain +/-, hence the @map.
enum RiskRating {
  AAA
  AA_PLUS   @map("AA+")
  AA
  AA_MINUS  @map("AA-")
  A_PLUS    @map("A+")
  A
  A_MINUS   @map("A-")
  BBB_PLUS  @map("BBB+")
  BBB
  BBB_MINUS @map("BBB-")
  // ── investment grade ends here; below is speculative / high-yield ──
  BB_PLUS   @map("BB+")
  BB
  BB_MINUS  @map("BB-")
  B_PLUS    @map("B+")
  B
  B_MINUS   @map("B-")
  CCC_PLUS  @map("CCC+")
  CCC
  CCC_MINUS @map("CCC-")
  CC
  C
  D
}

model Holding {
  id        String   @id @default(uuid(7)) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  user      User     @relation(fields: [userId], references: [id])
  assetId   String   @map("asset_id") @db.Uuid
  asset     Asset    @relation(fields: [assetId], references: [id])
  quantity  Float
  avgPrice  Float    @map("avg_price")

  /// The user's own classification of this position, supplied by the holdings
  /// CSV (all five optional — a CSV may omit the columns entirely).
  /// `assetType` reuses market-data's `AssetType` enum; the CSV's `Tipo` value
  /// `Acao` (stock) normalises to `EQUITY`.
  assetType       AssetType?       @map("asset_type")
  sector          String?
  subSector       String?          @map("sub_sector")
  investmentStyle InvestmentStyle? @map("investment_style")
  riskRating      RiskRating?      @map("risk_rating")

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

**Classification is per-user, and that is why it lives on `Holding` rather than `Asset`.** `sector`, `subSector`, `investmentStyle`, and `riskRating` are the user's own read on a position, supplied by their holdings CSV. `Asset` is shared master data, so putting them there would mean one user's upload silently rewriting the sector and risk grades every other user sees — a cross-user leak in a codebase that otherwise tests holdings for isolation (`PORTFOLIO_US-1_T-5`). Keeping all four together on `Holding` also gives one consistent rule ("classification is per-user") rather than splitting objective fields from subjective ones and having `GET /portfolio/allocation` read from two places depending on `by=`.

The known cost is duplication: two users holding `PETR4` each store their own `sector`, and they may disagree. That is accepted — a disagreement between two users' private classifications is inert, whereas a disagreement written to shared `Asset` is a silent overwrite.

**`RiskRating` ordering is load-bearing.** Postgres sorts an enum column by the order its values are *declared*, not alphabetically — so `ORDER BY risk_rating` yields safest-first and `... DESC` yields riskiest-first, with no `CASE` expression, join, or denormalized rank column to keep in sync. (Alphabetical would give `A, AA, AAA, B, BB…`, which is wrong.) Because the column is nullable, always sort with `NULLS LAST`. Two consequences for whoever edits this enum: **never reorder or insert values in the middle** — the S&P/Fitch scale is deliberately declared complete so no mid-scale insert is ever needed, and appending a value (Postgres' default) would silently place it after `D` and corrupt every risk-ordered query. This is also why `riskRating` stays an enum rather than a `String`. The guard is `apps/api/test/risk-rating-order.e2e-spec.ts`, which asserts the order against `pg_enum` — the enum type is unchanged by this move, so that test stays valid as written.

The scale is borrowed notation, not an agency rating: S&P/Fitch grades measure an issuer's default risk on *debt*, whereas these are the user's own risk tiers for *equities*. The letters are used because the ranking is well understood, not to assert a bond rating exists for the ticker.

## API Contract

All endpoints scoped to `req.user.id` (see [auth](../auth/spec.md)); no `portfolioId`/`userId` accepted from the client.

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/portfolio/holdings` | — | `Holding[]` joined with `Asset` |
| POST | `/portfolio/holdings` | `{ ticker, quantity, avgPrice }` | created `Holding` (creates the `Asset` row if the ticker is new) |
| POST | `/portfolio/holdings/upload-csv` | multipart CSV, resolved by header name: `Ticker`, `Quantidade`, `Preco Médio` required; `Grupo`, `Setor`, `Classificacao`, `Risco`, `Tipo` optional | `{ created, updated, errors[] }` |
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
  | `Ticker` | ticker | Required |
  | `Quantidade` | `quantity` | Required |
  | `Preco Médio` | `avgPrice` | Required. Note the accent and the space |
  | `Grupo` | `sector` | The **broad** grouping (`FINANCIAL`, `UTILITIES`, `MATERIAL`, …) |
  | `Setor` | `subSector` | The **narrow** one (`BANCOS`, `MINERAÇÃO`, `ENERGIA`, …) |
  | `Classificacao` | `investmentStyle` | Portuguese → enum, below. Unaccented in the file |
  | `Risco` | `riskRating` | `A`/`AAA`/`B`/`C` — already valid `RiskRating` members |
  | `Tipo` | `assetType` | `Acao` (stock) → `EQUITY` |

  `Grupo` → `sector` and `Setor` → `subSector` is deliberately **not** a literal name match: `Grupo` is the broader of the two (`FINANCIAL` contains `BANCOS`), which is what `sector`/`subSector` mean everywhere else in this spec.

- **Every other column is ignored**, including the six unnamed trailing ones. `Preco`, `Posicao`, `Posicao (%)`, `Rent. (%)` and `Rent. (R$)` are values the sheet *computes* — current price is market-data's ([`Asset.currentPrice`](../market-data/spec.md)), and position and return are derived by `GET /portfolio/summary`. Importing them would create a second, immediately-stale copy of numbers this system already owns. Some rows also carry a **second** `Preco Teto`/`Status` pair in the unnamed columns (e.g. `CXSE3`, `TAEE11`) with no way to tell which is authoritative — the same ambiguity `PRECO_TETO_2` has in [recommended-portfolios](../recommended-portfolios/spec.md), resolved the same way: ignore it.
- **A row with an empty `Ticker` is skipped silently, not reported as an error.** The export ends with ~10 spreadsheet-furniture rows — blank separators, `DY Medio`, `Posicao Total`, `Rentabilidade`, and a target-allocation block keyed by `Grupo`. They are not malformed holdings; they are not holdings at all. Erroring on them would report ten failures on a perfectly good file.
- **Values arrive in Brazilian format** — `"R$ 23,68"`, `"9,37"`, `"10,32%"`, and thousands-separated `"R$ 589.394,17"`. Strip `R$`/`%`/whitespace, drop `.` thousands groups, convert `,` to `.`. This is the same parsing [recommended-portfolios](../recommended-portfolios/spec.md) already specifies; the two modules must share one implementation rather than growing a second copy.
- **`Classificacao` normalises to English enum values**: `DIVIDENDOS` → `DIVIDENDS`, `SMALL CAPS` → `SMALL_CAP`, `MICRO CAPS` → `MICRO_CAP`, `VALUE INVESTING` → `VALUE_INVESTING`, `TURNAROUND` → `TURNAROUND`, `ETF` → `ETF`. An unrecognised value is a row error, not a silent `null`, so a typo or a newly-invented category surfaces instead of disappearing. `Risco` maps to `RiskRating` directly. `Grupo`/`Setor` are free text and pass through unchanged.
- **An omitted column and an empty cell are not the same thing.** A column absent from the header leaves the existing stored value untouched on re-upload (the user simply isn't saying anything about it); an empty cell in a present column clears that field to `null` (the user is explicitly saying "unclassified"). Without this distinction, re-importing a positions-only export would silently wipe classifications the user had already supplied. Note the real file exercises this: `BRBI11`, `RECV3`, `LREN3` and `AMOB3` have an empty `DY`, and several rows have an empty `*`.
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
- [ ] A CSV with only `ticker,quantity,avgPrice` — the original three-column format — still imports successfully, leaving all five classification fields `null`.
- [ ] `BBAS3` from that file imports as `sector: "FINANCIAL"` (from `Grupo`), `subSector: "BANCOS"` (from `Setor`), `investmentStyle: DIVIDENDS`, `riskRating: A`, `assetType: EQUITY`, `quantity: 3300`, `avgPrice: 23.68` — proving the `Grupo`/`Setor` mapping is not reversed and `"R$ 23,68"` parsed correctly.
- [ ] `SMAL11` imports with `investmentStyle: ETF` rather than erroring or landing `null`.
- [ ] A value with a thousands separator (`"R$ 589.394,17"`) parses as `589394.17`, not `589.39` or `NaN`.
- [ ] `GET /portfolio/allocation?by=investmentStyle` and `?by=riskRating` return real slices after that import, rather than a single `"Unclassified"` one.
- [ ] The columns the sheet computes — `Preco`, `Posicao`, `Posicao (%)`, `Rent. (%)`, `Rent. (R$)` — are not persisted anywhere, and neither are the six unnamed trailing columns (including the second `Preco Teto`/`Status` pair some rows carry).
- [ ] Uploading classifications as one user leaves another user's holdings for the same ticker completely untouched, including their `sector` and `riskRating`.
- [ ] Re-uploading a positions-only CSV (no classification columns) does **not** clear classifications set by an earlier upload; an explicitly empty cell in a present column does clear that one field.
- [ ] A row with an unrecognised `Risco` (e.g. `Z`) or `Classificacao` is reported in `errors[]` and does not import that row, while the file's other rows still import.
- [ ] `Asset` has no `sector`, `subSector`, `investmentStyle`, or `riskRating` column, and no code path writes classification data to the `assets` table.
