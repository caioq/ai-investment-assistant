# Recommended Portfolios

**Status:** Approved
**Depends on:** [project-setup](../project-setup/spec.md), [market-data](../market-data/spec.md)

## Problem

The research house the user follows publishes model portfolios — lists of recommended stocks with a ceiling price, a buy/hold/sell call, and (for some wallets) a target allocation weight — as CSV exports, one file per wallet. The [AI Advisor](../advisor/spec.md) needs this as structured input, distinct from the free-text recommendation report, so it can compare the user's actual holdings against what's recommended and flag positions trading past their ceiling price.

The exports are the research house's own format: Portuguese column headers, Brazilian number formatting, and a **different set of columns per wallet**. This module's job is to normalise them into one model without losing the fields the Advisor needs.

## Goals

- Ingest a research-house CSV per wallet type. Three exist today — Overall Recommended, Dividends, Small Caps — and adding a fourth must not require new parsing code.
- Normalise the published columns into a common shape: ticker, company label, ceiling price, recommendation, dividend yield, margin of safety, and (where the wallet publishes it) target weight.
- Keep a full version history — every upload creates a new snapshot rather than overwriting the previous one, so past AI analyses stay reproducible against the exact wallet version they used.
- Expose the latest snapshot per wallet type for the Advisor to consume.

## Non-Goals

- **Extracting this data from a PDF via the LLM** — numeric fields like ceiling price are exactly what an LLM extraction step silently gets wrong, so this stays structured CSV input. (Contrast [advisor](../advisor/spec.md)'s free-text report, which does go through extraction of a PDF's raw text — but not of its numbers.)
- **Editing individual rows after upload** — a correction means uploading a new CSV, which keeps the history model simple and consistent.
- **Storing `RISCO`, `SETOR`, or `CATEGORIA`.** The exports carry all three, and `RISCO`'s values (`AAA`/`A`/`B`/`C`) are even valid `RiskRating` members — but classification has a single source of truth, [market-data](../market-data/spec.md)'s assets CSV, and a research house's opinion must not overwrite the user's own taxonomy. The three files don't even agree with each other: small caps' `SETOR` is title-case (`Construção`, `Locadora`) against the user's uppercase (`CONSTRUÇÃO`, `LOCAÇÃO`), while Dividends' `CATEGORIA` partitions companies differently again — splitting energy into `GERAÇÃO`/`TRANSMISSÃO`/`DISTRIBUIÇÃO` and merging `BANCOS E SEGURADORAS`. Persisting any of them would let upload order decide which allocation slice a company lands in.
- **Storing `PRECO_ATUAL` / `VARIACAO`** — a price snapshot that is stale the moment it's uploaded. `Asset.currentPrice`, refreshed daily by [market-data](../market-data/spec.md), is the single source for current price.
- **Storing `PRECO_TETO_2`** — Dividends publishes two ceiling-price columns that disagree for some rows (`AXIA3`: 50,00 vs 53,00; `ITUB4`: 39,80 vs 40,80). `PRECO_TETO` is authoritative; the second column is ignored.
- **Normalising or validating that a wallet's weights sum to 100** — weights are stored exactly as published. A research house may publish a partially-allocated wallet, and silently rescaling would misrepresent it.

## Data Model

```prisma
enum WalletType {
  DIVIDENDS
  OVERALL_RECOMMENDED
  SMALL_CAPS
}

/// The research house's call on a position, normalised from the CSV's
/// Portuguese `RECOMENDACAO` (COMPRA/NEUTRO/VENDA).
enum Recommendation {
  BUY
  NEUTRAL
  SELL
}

model RecommendedPortfolio {
  id            String     @id @default(uuid(7)) @db.Uuid
  userId        String     @map("user_id") @db.Uuid
  user          User       @relation(fields: [userId], references: [id])
  walletType    WalletType @map("wallet_type")
  sourceName    String?    @map("source_name") // e.g. "XP"
  effectiveDate DateTime   @map("effective_date") @db.Date
  uploadedAt    DateTime   @default(now()) @map("uploaded_at")

  holdings RecommendedHolding[]

  @@index([userId, walletType, effectiveDate])
  @@map("recommended_portfolios")
}

model RecommendedHolding {
  id                     String               @id @default(uuid(7)) @db.Uuid
  recommendedPortfolioId String               @map("recommended_portfolio_id") @db.Uuid
  recommendedPortfolio   RecommendedPortfolio @relation(fields: [recommendedPortfolioId], references: [id], onDelete: Cascade)

  /// Null for a published row that isn't a tradable B3 ticker — e.g. the
  /// Overall wallet's "Renda Fixa - LFT Tesouro" line, which carries a real
  /// allocation weight but no `CODIGO`. See Behavior Notes.
  assetId String? @map("asset_id") @db.Uuid
  asset   Asset?  @relation(fields: [assetId], references: [id])

  /// The row's `EMPRESA` value as published. Always present — it is the only
  /// identifier a non-ticker row has, and it preserves the research house's
  /// own naming for display.
  label String

  /// Only the Overall Recommended wallet publishes `ALOCACAO_SUGERIDA`;
  /// null for Dividends and Small Caps, which are selections, not allocations.
  targetWeightPct Float? @map("target_weight_pct")

  /// `PRECO_TETO`. Null on a row that publishes no ceiling price.
  limitPrice Float? @map("limit_price")

  recommendation    Recommendation?
  dividendYieldPct  Float?          @map("dividend_yield_pct")
  marginOfSafetyPct Float?          @map("margin_of_safety_pct")

  @@map("recommended_holdings")
}
```

Every field except `label` is nullable because the three exports publish different column sets and this module stores what each wallet actually says rather than inventing defaults — a `targetWeightPct` of `0` on a Dividends row would read as "allocate nothing to this", which is not what the absence of the column means.

Adding these models also requires the other side of two relations Prisma won't compile without: `recommendedPortfolios RecommendedPortfolio[]` on `User` ([auth](../auth/spec.md)) and `recommendedHoldings RecommendedHolding[]` on `Asset` ([market-data](../market-data/spec.md)).

## API Contract

All endpoints are scoped to `req.user.id` (see [auth](../auth/spec.md)); no `userId` is accepted from the client.

| Method | Path | Body / Query | Response |
|---|---|---|---|
| POST | `/advisor/recommended-portfolios/upload` | `?wallet=DIVIDENDS\|OVERALL_RECOMMENDED\|SMALL_CAPS`, multipart CSV file, optional form fields `effectiveDate` (default: today) and `sourceName` | created `RecommendedPortfolio` with its `RecommendedHolding[]` |
| GET | `/advisor/recommended-portfolios/latest` | — | latest `RecommendedPortfolio` (with holdings) per `walletType` — at most one entry per type, so at most 3 |

`wallet` is an explicit parameter rather than being inferred from the filename: the export's name is the user's to change, and guessing it wrong files one wallet's recommendations under another.

## Behavior Notes

- **One parser, driven by header names — not one parser per wallet, and never by column position.** The three exports differ in both which columns they carry and what order they appear in (`EMPRESA` is 1st in Overall and Small Caps but 2nd in Dividends), yet the column *names* are stable and unique. Reading the header row into a name→index map and pulling fields by name handles all three with a single code path, tolerates the research house reordering or adding columns, and makes a fourth wallet a config change rather than a new parser. Three positional parsers would triple the code and tests for files that share most of their semantics, and would break on any column-order change. Required in every file: `CODIGO`, `PRECO_TETO`. Everything else is optional and maps to `null` when its column is absent.
- **`DY_*` is matched by prefix.** The dividend-yield column carries the projection year in its name (`DY_2026` in Overall and Dividends, `DY_2025` in Small Caps). Matching the exact name would silently drop the field the year it rolls over.
- **Brazilian formatting must be parsed explicitly.** Values arrive as `"R$ 40,99"`, `"8,00%"` and `"-6,71%"` — currency prefix, percent suffix, comma decimal separator, and negative values in `MARGEM_DE_SEGURANCA`. Strip `R$`/`%`/whitespace and convert `,` to `.` before parsing. `Number("8,00%")` is `NaN`, so a naive numeric parse rejects every row of every real file. This is also why the fields are quoted in the CSV, and why parsing must use a real CSV reader rather than splitting on commas.
- **`RECOMENDACAO` is normalised to English on the way in**: `COMPRA` → `BUY`, `NEUTRO` → `NEUTRAL`, `VENDA` → `SELL`, matching the repo's English-domain convention. An unrecognised value is a row error, not a silent `null` — a new call the research house introduces should surface rather than disappear.
- **A row with no `CODIGO` is stored with `assetId: null`.** The Overall wallet's `Renda Fixa - LFT Tesouro` line has no ticker but a real `ALOCACAO_SUGERIDA` of 15%; its equity rows sum to 85, so dropping it would both lose a real allocation and make the wallet look fully invested in equities when it isn't. Such a row keeps its `label` and `targetWeightPct` and is skipped for `Asset` resolution.
- **A row whose `CODIGO` isn't yet in `Asset` creates the `Asset` row** (same master data as [portfolio](../portfolio/spec.md) holdings). It does **not** trigger a 1-year price backfill: recommended wallets have no performance chart, the Advisor needs only `currentPrice` (which market-data's daily cron supplies by iterating `Asset` rows), and backfilling would fire one fetch per new ticker against a rate-limited unofficial upstream for history nothing reads.
- **A malformed row rejects the entire upload**, with an error naming every offending row rather than failing on the first. A wallet is a set that only means something whole — importing 8 of 10 rows produces a snapshot that misrepresents what the research house published, which the Advisor would then reason over as complete with nothing signalling the gap. This deliberately differs from [portfolio](../portfolio/spec.md)'s holdings CSV, where rows are independent positions and partial success is useful.
- **Uploading never deletes or mutates a prior `RecommendedPortfolio`** — it is strictly additive, which is what makes old `AdvisorAnalysis` records reproducible. There is deliberately no unique constraint on `(walletType, effectiveDate)`: two uploads the same day are two legitimate snapshots.
- **`GET .../latest` picks, per `walletType`, the most recent `effectiveDate`, breaking ties on `uploadedAt` descending.** The tie-break is load-bearing: `effectiveDate` defaults to today and history is additive, so two same-day uploads are easy to produce, and without it "latest" is whichever row Postgres happens to return first. Newest upload wins, which is the only reading consistent with "a correction means uploading a new CSV".

## Acceptance Criteria

- [ ] Uploading each of the three real exports (Overall, Dividends, Small Caps) succeeds, with every data row stored — including Overall's `Renda Fixa - LFT Tesouro` row, which lands with `assetId: null`, `label: "Renda Fixa - LFT Tesouro"` and `targetWeightPct: 15`.
- [ ] After uploading the Overall export, `targetWeightPct` is populated on its rows; after uploading Dividends or Small Caps, `targetWeightPct` is `null` on every row rather than `0`.
- [ ] `"R$ 47,50"` is stored as `limitPrice: 47.5`, `"8,00%"` as `targetWeightPct: 8`, and `"-6,71%"` as `marginOfSafetyPct: -6.71`.
- [ ] `RECOMENDACAO` values `COMPRA`/`NEUTRO`/`VENDA` are stored as `BUY`/`NEUTRAL`/`SELL`; an unrecognised value rejects the upload.
- [ ] The dividend-yield column is captured from both `DY_2026` (Overall, Dividends) and `DY_2025` (Small Caps) without per-wallet parsing code.
- [ ] Uploading Dividends — whose columns are in a different order from the other two, and which carries `CATEGORIA` and `PRECO_TETO_2` that no other file has — stores the same normalised fields as the others, with `PRECO_TETO` (not `PRECO_TETO_2`) as `limitPrice`.
- [ ] `RISCO`, `SETOR`, `CATEGORIA`, `PRECO_ATUAL` and `VARIACAO` are not persisted anywhere, and uploading a wallet writes nothing to `Asset` beyond creating the row itself — in particular it leaves `Asset.sector`, `subSector`, `investmentStyle` and `riskRating` untouched, since [market-data](../market-data/spec.md)'s assets CSV is their only writer.
- [ ] A CSV row with a `targetWeightPct` outside 0–100 is rejected with an error naming that row, and **no** `RecommendedPortfolio` is created.
- [ ] A row with a ticker not previously seen creates the `Asset` and links it in `RecommendedHolding`.
- [ ] Uploading for `DIVIDENDS` twice (different `effectiveDate`) results in 2 `RecommendedPortfolio` rows, the first one unmodified, and `GET .../latest` returns only the newer one for that wallet.
- [ ] Two uploads for the same wallet with the **same** `effectiveDate` both persist, and `GET .../latest` returns the more recently uploaded one.
- [ ] `GET .../latest` returns at most one entry per `walletType`, even after multiple uploads across all three types, and omits a wallet type never uploaded.
