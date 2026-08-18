# RECOMMENDED_PORTFOLIOS_SHARED_T-1: RecommendedPortfolio + RecommendedHolding schema + migration

**Shared by:** US-1, US-2
**Status:** Not Started
**GitHub Issue:** #131 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add the `WalletType` enum and the `RecommendedPortfolio` / `RecommendedHolding` models to `apps/api/prisma/schema.prisma` **exactly as written in the spec's Data Model block**, and generate the migration. The spec's Prisma is copy-ready and already conforms to `CONVENTIONS.md` → "Module structure" (UUIDv7 `@id @default(uuid(7)) @db.Uuid` keys, `snake_case` `@@map`/`@map`, `@db.Uuid` on the `userId`/`assetId`/`recommendedPortfolioId` foreign-key scalars so their column type matches the `id` they reference) — don't re-derive it.

Also add the **other side** of the two relations on models this module doesn't own, which Prisma won't compile without: `recommendedPortfolios RecommendedPortfolio[]` on `User` ([auth](../../auth/spec.md)) and `recommendedHoldings RecommendedHolding[]` on `Asset` ([market-data](../../market-data/spec.md)). Both are noted in this module's own spec Data Model.

Keep the spec's `onDelete: Cascade` on `RecommendedHolding.recommendedPortfolio` — a snapshot's rows have no meaning without their parent. Note there is deliberately **no** unique constraint on `(walletType, effectiveDate)` or `(userId, walletType)`: history is strictly additive (spec Behavior Notes), so two uploads for the same wallet on the same day are two legitimate rows. That absence is load-bearing for `RECOMMENDED_PORTFOLIOS_US-1_T-4`, and it's why `RECOMMENDED_PORTFOLIOS_US-2_T-1` needs a tie-break — don't "fix" it by adding a unique index.

**Test:** A schema-only migration, verified as in `AUTH_US-1_T-1`, `MARKET_DATA_SHARED_T-1`, and `PORTFOLIO_SHARED_T-1`: with the `db` container up, `pnpm db:migrate` exits `0` and creates both tables with the spec's columns (`psql -h localhost -p 5432 -U postgres -d investment_assistant -c '\d recommended_portfolios'` and `'\d recommended_holdings'`). Confirm red first (no models, so `\d recommended_portfolios` reports "does not exist"), then green after migrating.

Assert specifically that `recommended_portfolios.user_id`, `recommended_holdings.asset_id` and `recommended_holdings.recommended_portfolio_id` are of type `uuid` and **not** `text` — a `String` FK without `@db.Uuid` still migrates cleanly and only fails later, at whatever join or `include` first needs it, a long way from the cause.

**Done when:** `pnpm db:migrate` completes without error against a running `db` container, both tables match the spec's models with `uuid` foreign keys, and `pnpm --filter api build` passes (proving the generated client compiles with both back-relations in place).
