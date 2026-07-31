# MARKET_DATA_SHARED_T-1: Asset, PriceHistory, BenchmarkSnapshot schema + migration

**Shared by:** US-1, US-2, US-3, US-4
**Status:** Done
**GitHub Issue:** #56 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add the `Asset`, `PriceHistory`, and `BenchmarkSnapshot` models and the `AssetType`, `InvestmentStyle`, `RiskRating`, and `Benchmark` enums to `apps/api/prisma/schema.prisma` **exactly as written in the spec's Data Model block**, and generate the migration. The spec's Prisma is copy-ready and already conforms to [`CONVENTIONS.md`](../../../CONVENTIONS.md) → "Module structure" (UUIDv7 `@id @default(uuid(7)) @db.Uuid` keys, `snake_case` `@@map`/`@map`, and the `priceHistory PriceHistory[]` back-relation Prisma needs for `PriceHistory.asset` to compile) — don't re-derive it.

Keep `investmentStyle`/`riskRating` nullable: the spec is explicit that this module never writes them (they're set from the holdings UI). Do **not** add a `holdings Holding[]` back-relation on `Asset` — `Holding` doesn't exist yet and belongs to [portfolio](../../portfolio/spec.md), which adds both sides of that relation itself. The `@@unique([assetId, date])` and `@@unique([benchmark, date])` constraints matter beyond data hygiene: they're what make the backfill and benchmark jobs idempotent in `MARKET_DATA_US-2_T-2` and `MARKET_DATA_US-3_T-3`.

**Test:** No unit test applies to a schema-only migration — verify with the same pattern as `AUTH_US-1_T-1`: with the `db` container up, `pnpm db:migrate` exits `0` and creates the three tables with the spec's columns (check via `psql -h localhost -p 5432 -U postgres -d investment_assistant -c '\d assets'`, `'\d price_history'`, `'\d benchmark_snapshots'`). Confirm red first (no models, so `\d assets` reports "does not exist"), then green after adding the models and migrating.

**Done when:** `pnpm db:migrate` completes without error against a running `db` container, the three tables match the spec's models with the UUIDv7/`@@map` adjustments above, and `pnpm --filter api build` still passes (proving the generated client compiles).
