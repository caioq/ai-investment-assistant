# Recommended Portfolios

**Status:** Approved
**Depends on:** [market-data](../market-data/spec.md)

## Problem

The research house the user follows publishes model portfolios — structured lists of recommended stocks with a target allocation weight and a limit price — in three variants (Dividends, Overall Recommended, Small Caps). The [AI Advisor](../advisor/spec.md) needs this as structured input, distinct from the free-text recommendation report, so it can compare the user's actual allocation against what's recommended and flag stale buy signals (current price past the limit price).

## Goals

- Ingest one CSV per wallet type: `ticker,targetWeightPct,limitPrice`.
- Keep a full version history — every upload creates a new snapshot rather than overwriting the previous one, so past AI analyses stay reproducible against the exact wallet version they used.
- Expose the latest snapshot per wallet type for the Advisor to consume.

## Non-Goals

- Extracting this data from a PDF via the LLM — numeric fields like limit price are exactly the kind of thing an LLM extraction step can silently get wrong, so this stays structured CSV input, not text extraction (contrast with [advisor](../advisor/spec.md)'s free-text report, which does go through LLM-adjacent extraction of a PDF's raw text — but not of numbers).
- Editing individual rows after upload — a correction means uploading a new CSV (keeps the history model simple and consistent).

## Data Model

```prisma
enum WalletType {
  DIVIDENDS
  OVERALL_RECOMMENDED
  SMALL_CAPS
}

model RecommendedPortfolio {
  id            String     @id @default(cuid())
  userId        String
  user          User       @relation(fields: [userId], references: [id])
  walletType    WalletType
  sourceName    String?    // e.g. "XP"
  effectiveDate DateTime   @db.Date
  uploadedAt    DateTime   @default(now())

  holdings RecommendedHolding[]

  @@index([walletType, effectiveDate])
}

model RecommendedHolding {
  id                     String                @id @default(cuid())
  recommendedPortfolioId String
  recommendedPortfolio   RecommendedPortfolio  @relation(fields: [recommendedPortfolioId], references: [id], onDelete: Cascade)
  assetId                String
  asset                  Asset                 @relation(fields: [assetId], references: [id])
  targetWeightPct        Float
  limitPrice             Float
}
```

## API Contract

| Method | Path | Body / Query | Response |
|---|---|---|---|
| POST | `/advisor/recommended-portfolios/upload` | `?wallet=DIVIDENDS\|OVERALL_RECOMMENDED\|SMALL_CAPS`, multipart CSV `ticker,targetWeightPct,limitPrice`, form field `effectiveDate?` (default: today) | created `RecommendedPortfolio` with its `RecommendedHolding[]` |
| GET | `/advisor/recommended-portfolios/latest` | — | latest `RecommendedPortfolio` (with holdings) per `walletType`, i.e. up to 3 |

## Behavior Notes

- A row whose `ticker` isn't yet in `Asset` creates the `Asset` row (same behavior as [portfolio](../portfolio/spec.md) holdings upload) — the model portfolio and the user's own holdings share the same `Asset` master data.
- `GET .../latest` returns, per `walletType`, the `RecommendedPortfolio` with the most recent `effectiveDate` — this is what [advisor](../advisor/spec.md) uses by default when generating an analysis.
- Uploading a CSV never deletes or mutates a prior `RecommendedPortfolio` — it's strictly additive, which is what makes old `AdvisorAnalysis` records reproducible.

## Acceptance Criteria

- [ ] Uploading a CSV for `DIVIDENDS` twice (different `effectiveDate`) results in 2 `RecommendedPortfolio` rows, and `GET .../latest` returns only the newer one for that wallet.
- [ ] `GET .../latest` returns at most one entry per `walletType`, even after multiple uploads across all three types.
- [ ] A CSV row with a ticker not previously seen creates the `Asset` and links it correctly in `RecommendedHolding`.
- [ ] `targetWeightPct` values in a single wallet upload are validated to be reasonable (0–100 per row); rows outside that range are rejected with a clear error, not silently stored.
