# RECOMMENDED_PORTFOLIOS_SHARED_T-1: RecommendedPortfolio + RecommendedHolding schema + migration

**Shared by:** US-1, US-2, US-3
**Status:** Not Started
**GitHub Issue:** #140 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add the `WalletType` and `Recommendation` enums and the `RecommendedPortfolio` / `RecommendedHolding` models to `apps/api/prisma/schema.prisma` **exactly as written in the spec's Data Model block**, and generate the migration. The spec's Prisma is copy-ready and already conforms to `CONVENTIONS.md` → "Module structure" (UUIDv7 `@id @default(uuid(7)) @db.Uuid` keys, `snake_case` `@@map`/`@map`, `@db.Uuid` on every foreign-key scalar) — don't re-derive it.

Also add the other side of the two relations on models this module doesn't own, which Prisma won't compile without: `recommendedPortfolios RecommendedPortfolio[]` on `User` ([auth](../../auth/spec.md)) and `recommendedHoldings RecommendedHolding[]` on `Asset` ([market-data](../../market-data/spec.md)).

Three details in the spec's block are load-bearing and will look like mistakes to tidy up:

- **`assetId` is nullable**, and `label` is the only always-present identifying field. The Overall wallet publishes a `Renda Fixa - LFT Tesouro` row with a real 15% weight and no ticker.
- **`targetWeightPct` and `limitPrice` are nullable.** Only Overall publishes `ALOCACAO_SUGERIDA`, and the tickerless row has no ceiling price. A default of `0` would read as "allocate nothing to this", which is not what an absent column means.
- **There is deliberately no unique constraint on `(walletType, effectiveDate)` or `(userId, walletType)`.** History is strictly additive, so two uploads for the same wallet on the same day are two legitimate rows. That absence is what `RECOMMENDED_PORTFOLIOS_US-2_T-1` pins and why `US-3_T-1` needs a tie-break — adding an index here breaks both.

**Test:** A schema-only migration, verified as in `PORTFOLIO_SHARED_T-1` and `MARKET_DATA_SHARED_T-1`: with the `db` container up, `pnpm db:migrate` exits `0` and creates both tables with the spec's columns (`psql -h localhost -p 5432 -U postgres -d investment_assistant -c '\d recommended_portfolios'` and `'\d recommended_holdings'`). Confirm red first (no models, so `\d recommended_portfolios` reports "does not exist"), then green after migrating.

Assert specifically that (1) `recommended_holdings.asset_id`, `target_weight_pct` and `limit_price` are **nullable**, since a `NOT NULL` on any of them makes the real Overall export unimportable, and (2) `recommended_portfolios.user_id`, `recommended_holdings.asset_id` and `recommended_holdings.recommended_portfolio_id` are of type `uuid`, not `text` — a `String` FK without `@db.Uuid` migrates cleanly and only fails later, at whatever join first needs it.

**Done when:** `pnpm db:migrate` completes without error against a running `db` container, both tables match the spec's models with nullable columns and `uuid` foreign keys, and `pnpm --filter api build` passes (proving the generated client compiles with both back-relations in place).
