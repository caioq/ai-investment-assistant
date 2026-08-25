# Market Data

**Status:** Approved
**Depends on:** [project-setup](../project-setup/spec.md)

## Problem

Holdings need real, current B3 prices (and history) to compute portfolio value, allocation, and performance — without hammering an unofficial, undocumented quote API into a rate limit or an outright block.

## Goals

- Fetch current price + daily change for every ticker the app tracks, via Yahoo Finance's public quote/chart endpoints.
- Backfill 1y of daily history for a ticker the first time it's added.
- Fetch benchmark series (Ibovespa, CDI) for performance comparison.
- Maintain each asset's analytical classification — sector, sub-sector, investment style, risk rating — from a user-supplied **assets CSV**, so [portfolio](../portfolio/spec.md)'s allocation views and the [advisor](../advisor/spec.md)'s prompt can group by them.
- Signal that a price refresh has completed, so each user's daily `PortfolioValueSnapshot` can be recomputed off it. The recompute itself (`Σ holding.quantity * asset.currentPrice`) reads `Holding` and writes `PortfolioValueSnapshot` — both owned by [portfolio](../portfolio/spec.md) — so it is implemented there, subscribing to this module's signal. The dependency must not run the other way. See "Module boundary" under Behavior Notes.

## Non-Goals

- Fixed income / crypto price providers — the `PriceProvider` interface is designed to support them later, but only `B3YahooProvider` (equities) is implemented now.
- Real-time/intraday prices — daily granularity is enough for this use case.
- Any UI in this module — it's a backend-only integration; the dashboard reads the `Asset`/`PriceHistory`/`BenchmarkSnapshot` rows this module maintains.
- **A per-asset admin CRUD for classification.** Re-uploading the assets CSV is the only way to change these fields for now. A CRUD for admin users is planned future work; it writes the same four columns and needs no data-model change, so deferring it costs nothing.
- **Deriving classification from an upstream API.** Yahoo Finance publishes a sector/industry pair on its `quoteSummary` `assetProfile` module, but in English (`Basic Materials`, `Utilities`) against the CSV's Portuguese/uppercase vocabulary (`MATERIAL`, `UTILITIES`). Mixing the two sources would split one sector into two allocation slices, so any future backfill needs a normalisation map rather than a passthrough.

## Data Model

```prisma
enum AssetType {
  EQUITY
  FIXED_INCOME // not implemented yet
  CRYPTO       // not implemented yet
}

// The assets CSV's `investmentStyle` column carries these values verbatim.
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

model Asset {
  id               String    @id @default(uuid(7)) @db.Uuid
  ticker           String    @unique
  name             String
  assetType        AssetType @default(EQUITY) @map("asset_type")
  currency         String    @default("BRL")
  exchange         String    @default("B3")

  /// Analytical classification, maintained solely by the assets CSV import
  /// (see API Contract). All four are nullable: an `Asset` row created by a
  /// holding or a recommended wallet is unclassified until an assets CSV
  /// covers its ticker.
  sector          String?
  subSector       String?          @map("sub_sector")
  investmentStyle InvestmentStyle? @map("investment_style")
  riskRating      RiskRating?      @map("risk_rating")

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

**`Asset` is the single source of truth for classification, and one CSV maintains it.** `sector`, `subSector`, `investmentStyle`, and `riskRating` are attributes of the *instrument*, so they live here rather than being copied per user onto `Holding`.

Two earlier revisions got this wrong and are worth recording so they aren't re-proposed:

- **Classification on `Holding`, fed by the holdings CSV.** [recommended-portfolios](../recommended-portfolios/spec.md)'s `RecommendedHolding` points at `Asset`, not `Holding` — so a recommended ticker the user doesn't hold has no row to read classification from. That is precisely the buy-candidate case the [advisor](../advisor/spec.md) needs in order to compare actual against suggested allocation.
- **A shared `Asset` default with a per-user `Holding` override, written by whichever CSV arrives first.** Three files carry three vocabularies: the small-caps wallet's `SETOR` is title-case (`Construção`, `Locadora`) against the holdings sheet's uppercase (`CONSTRUÇÃO`, `LOCAÇÃO`), and the dividends wallet's `CATEGORIA` partitions companies differently again — splitting energy into `GERAÇÃO`/`TRANSMISSÃO`/`DISTRIBUIÇÃO` while merging `BANCOS E SEGURADORAS`. Reconciling them requires a hand-maintained alias table plus a precedence rule, and still lets upload order decide which slice a company lands in.

A dedicated assets CSV avoids both: it is the only source that can classify **any** ticker, held or not, recommended or not, under one vocabulary. Consequently **no other module writes these four columns** — not the price cron (Yahoo publishes none of them), not [portfolio](../portfolio/spec.md)'s holdings CSV, and not a [recommended-portfolios](../recommended-portfolios/spec.md) upload, whose `RISCO`/`SETOR`/`CATEGORIA` are a research house's opinion rather than the user's own taxonomy.

The accepted trade-off is that classification is **global**: it is not scoped per user, so in a multi-user deployment one upload changes what everyone sees. That is fine for a single-user personal app, and the escape hatch is purely additive — adding override columns to `Holding` later needs no data migration, since existing `Asset` values stay valid and reads simply become `holding.x ?? asset.x`.

**`RiskRating` ordering is load-bearing.** Postgres sorts an enum column by the order its values are *declared*, not alphabetically — so `ORDER BY risk_rating` yields safest-first and `... DESC` riskiest-first, with no `CASE` expression, join, or denormalized rank column to keep in sync. (Alphabetical would give `A, AA, AAA, B, BB…`, which is wrong.) Because the column is nullable, always sort with `NULLS LAST`. Two consequences for whoever edits this enum: **never reorder or insert values in the middle** — the S&P/Fitch scale is deliberately declared complete so no mid-scale insert is ever needed, and appending a value (Postgres' default) would silently place it after `D` and corrupt every risk-ordered query. This is also why `riskRating` is an enum rather than a `String`. The guard is `apps/api/test/risk-rating-order.e2e-spec.ts`, which asserts the order against `pg_enum`.

The scale is borrowed notation, not an agency rating: S&P/Fitch grades measure an issuer's default risk on *debt*, whereas these are the user's own risk tiers for *equities*. The letters are used because the ranking is well understood, not to assert a bond rating exists for the ticker.

`BenchmarkSnapshot.value` is always an **index level**, never a rate — a value whose ratio between two dates is the return over that window. This matters because the two benchmarks arrive in different units: Ibovespa is already a level, while CDI is published as a daily interest rate in percent and must be compounded into a level before storage (see Behavior Notes). Storing CDI's raw daily percentage would make `value` mean something different per benchmark and silently corrupt any consumer comparing the two series — notably `vsBenchmarkPct` in [portfolio](../portfolio/spec.md)'s `GET /portfolio/performance`.

When [portfolio](../portfolio/spec.md)'s `Holding` model lands it adds a `holdings Holding[]` back-relation to `Asset`; Prisma requires both sides of that relation, so it's added by that module, not this one.

## API Contract

This module is mostly a scheduled job consumed internally by [portfolio](../portfolio/spec.md) and [advisor](../advisor/spec.md). It exposes one upload endpoint — the sole writer of asset classification — plus one optional debug endpoint:

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/market-data/assets/import` | multipart CSV, field `file` | `{ created, updated, errors: string[] }` |
| GET | `/market-data/quote/:ticker` | — | `{ ticker, price, changePct, updatedAt }` — for manual/debug use, not called by the frontend |

`errors[]` reports per-row failures without failing the file, matching the partial-success shape [portfolio](../portfolio/spec.md)'s holdings upload and [recommended-portfolios](../recommended-portfolios/spec.md) already return.

## Behavior Notes

- **Module boundary:** this module owns `Asset`, `PriceHistory`, and `BenchmarkSnapshot` and is built **before** [portfolio](../portfolio/spec.md), which owns `Holding` and `PortfolioValueSnapshot`. Nothing here may read or write those two tables — the dependency runs one way, portfolio → market-data (its `Holding.asset` relation needs `Asset`). Anything phrased below in terms of "tickers the app tracks" therefore means **`Asset` rows**, which is equivalent in practice: per portfolio's own Behavior Notes, adding a holding for an unknown ticker creates the `Asset` row, so every held ticker has one by construction.
- **The assets CSV uses English column names matching the `Asset` field they set** — `ticker`, `sector`, `subSector`, `investmentStyle`, `riskRating`, `assetType`. This is a file the user maintains for this app rather than a broker or research-house export, so there is no foreign header to accommodate, and matching the field names means the mapping needs no lookup table and no translation step to review:

  | CSV column | `Asset` field | Accepted values |
  |---|---|---|
  | `ticker` | `ticker` | Required — the match key. A row with an empty `ticker` is skipped silently |
  | `sector` | `sector` | Free text — the **broad** grouping (`FINANCIAL`, `UTILITIES`, `MATERIAL`, …) |
  | `subSector` | `subSector` | Free text — the **narrow** one (`BANCOS`, `MINERAÇÃO`, `ENERGIA`, …) |
  | `investmentStyle` | `investmentStyle` | An `InvestmentStyle` member: `SMALL_CAP`, `MICRO_CAP`, `DIVIDENDS`, `VALUE_INVESTING`, `TURNAROUND`, `ETF` |
  | `riskRating` | `riskRating` | A `RiskRating` member — `A`, `AAA`, `B`, `C` are the ones the user's data uses |
  | `assetType` | `assetType` | An `AssetType` member: `EQUITY`, `FIXED_INCOME`, `CRYPTO` |

  `sector` is the **broader** of the two levels and `subSector` the narrower (`FINANCIAL` contains `BANCOS`). Both are free text and pass through unchanged — they are the user's own labels, and the values in their sheet are a mix of English (`FINANCIAL`, `REAL ESTATE`) and Portuguese (`BANCOS`, `MINERAÇÃO`). Only the three enum columns are validated.

  The user's existing holdings sheet expresses the same six columns in Portuguese (`Ticker`, `Grupo`→`sector`, `Setor`→`subSector`, `Classificacao`, `Risco`, `Tipo`) with Portuguese values (`DIVIDENDOS`, `SMALL CAPS`, `Acao`). **The importer does not accept those.** Building the first assets CSV is a one-off rename of six headers and a find-and-replace on two columns; teaching the parser a second vocabulary would mean maintaining a translation table forever to save that once. Note that `Grupo`→`sector` and `Setor`→`subSector` is not a literal name match, so the rename is not mechanical — `Grupo` is the broad level despite `Setor` looking like the cognate of `sector`.

- **Assets CSV parsing rules**, all of which the real export requires:
  - **Columns are resolved by header name, not position.** The source sheet carries unnamed trailing columns, so positional parsing reads the wrong field.
  - **Any column may be absent**, including every classification column — a file of just `Ticker` is valid and changes nothing.
  - **A ticker not yet in `Asset` creates the row** (`name` defaults to the ticker, as the price cron already does). Classifying a ticker *before* buying it is the point of a separate file — it is what lets a recommended-but-unheld ticker carry a sector.
  - **Last upload wins.** A present column overwrites the stored value outright; there is a single source of truth, so authoritative replacement is more predictable than fill-if-null. A column **absent** from the file leaves that field untouched; a column present with an **empty cell** clears that one field.
  - An unrecognised `investmentStyle`, `riskRating`, or `assetType` value is reported in `errors[]` and that row is not applied; the file's other rows still import. A Portuguese value left over from the holdings sheet (`DIVIDENDOS`, `Acao`) therefore surfaces as a row error rather than a silent `null` — which is the intended way for a half-renamed file to fail.
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
- [ ] Importing an assets CSV containing a ticker with **no `Holding` and no `RecommendedHolding`** creates the `Asset` row and stores all four classification fields — the case neither the holdings CSV nor a wallet upload can reach.
- [ ] `BBAS3` imports as `sector: "FINANCIAL"`, `subSector: "BANCOS"`, `investmentStyle: DIVIDENDS`, `riskRating: A`, `assetType: EQUITY` — every column landing in the field of the same name.
- [ ] `SMAL11` imports with `investmentStyle: ETF` rather than erroring or landing `null`.
- [ ] Re-importing the same ticker with a changed `riskRating` overwrites the stored value; re-importing a file that **omits** the `riskRating` column leaves it intact; a present-but-empty `riskRating` cell clears it.
- [ ] A row whose `riskRating` is unrecognised (e.g. `Z`), or whose `investmentStyle` is still the Portuguese `DIVIDENDOS` rather than `DIVIDENDS`, is reported in `errors[]` and leaves that asset's stored classification unchanged, while every other row in the file still imports.
- [ ] Neither the price cron nor a [recommended-portfolios](../recommended-portfolios/spec.md) wallet upload ever writes `sector`, `subSector`, `investmentStyle`, or `riskRating` — guarded for the wallet path by `apps/api/test/recommended-portfolios.e2e-spec.ts`.
- [ ] After an assets CSV import, [portfolio](../portfolio/spec.md)'s `GET /portfolio/allocation?by=investmentStyle` and `?by=riskRating` return real slices rather than a single `"Unclassified"` one, with no change to the holdings data.
