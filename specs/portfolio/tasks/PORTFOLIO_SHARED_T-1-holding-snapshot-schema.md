# PORTFOLIO_SHARED_T-1: Holding + PortfolioValueSnapshot schema + migration

**Shared by:** US-1, US-2, US-3, US-4, US-5
**Status:** Not Started
**GitHub Issue:** #96 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add the `Holding` and `PortfolioValueSnapshot` models to `apps/api/prisma/schema.prisma` **exactly as written in the spec's Data Model block**, and generate the migration. The spec's Prisma is copy-ready and already conforms to `CONVENTIONS.md` → "Module structure" (UUIDv7 `@id @default(uuid(7)) @db.Uuid` keys, `snake_case` `@@map`/`@map`, `@db.Uuid` on the `userId`/`assetId` foreign-key scalars so their column type matches the `id` they reference) — don't re-derive it.

This task also adds the **other side** of three relations, on models owned by other modules. Prisma won't compile with only one side declared, and both owning specs anticipate this:

- `holdings Holding[]` and `portfolioValueSnapshots PortfolioValueSnapshot[]` on `User` ([auth](../../auth/spec.md)).
- `holdings Holding[]` on `Asset` — [market-data](../../market-data/spec.md)'s Data Model explicitly defers this back-relation to this module, so adding it here is expected rather than a cross-module violation.

Keep `metadata Json?` as specified: it's the escape hatch for future per-asset-type fields (fixed income maturity, crypto wallet) so adding those later needs no migration. The `@@unique([userId, assetId])` constraint is not just hygiene — it's what makes the upserts in `PORTFOLIO_US-1_T-1` and `PORTFOLIO_US-2_T-1` idempotent, and `@@unique([userId, date])` does the same for the daily snapshot in `PORTFOLIO_US-5_T-2`.

**Test:** A schema-only migration, verified as in `AUTH_US-1_T-1` and `MARKET_DATA_SHARED_T-1`: with the `db` container up, `pnpm db:migrate` exits `0` and creates both tables with the spec's columns (`psql -h localhost -p 5432 -U postgres -d investment_assistant -c '\d holdings'` and `'\d portfolio_value_snapshots'`). Confirm red first (no models, so `\d holdings` reports "does not exist"), then green after migrating.

Assert specifically that `holdings.user_id` and `holdings.asset_id` are of type `uuid` and **not** `text` — a `String` FK without `@db.Uuid` still migrates cleanly and only fails later, at the point some join or `include` is written, which is a long way from the cause.

**Done when:** `pnpm db:migrate` completes without error against a running `db` container, both tables match the spec's models with `uuid` foreign keys, and `pnpm --filter api build` passes (proving the generated client compiles with all three back-relations in place).
