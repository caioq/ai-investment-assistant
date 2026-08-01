# MARKET_DATA_SHARED_T-1: Asset, PriceHistory, BenchmarkSnapshot schema + migration

**Shared by:** US-1, US-2, US-3, US-4
**Status:** Done
**GitHub Issue:** #56 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add the `Asset`, `PriceHistory`, and `BenchmarkSnapshot` models and the `AssetType`, `InvestmentStyle`, `RiskRating`, and `Benchmark` enums to `apps/api/prisma/schema.prisma` **exactly as written in the spec's Data Model block**, and generate the migration. The spec's Prisma is copy-ready and already conforms to [`CONVENTIONS.md`](../../../CONVENTIONS.md) → "Module structure" (UUIDv7 `@id @default(uuid(7)) @db.Uuid` keys, `snake_case` `@@map`/`@map`, and the `priceHistory PriceHistory[]` back-relation Prisma needs for `PriceHistory.asset` to compile) — don't re-derive it.

Keep `investmentStyle`/`riskRating` nullable: the spec is explicit that this module never writes them (they're set from the holdings UI). Do **not** add a `holdings Holding[]` back-relation on `Asset` — `Holding` doesn't exist yet and belongs to [portfolio](../../portfolio/spec.md), which adds both sides of that relation itself. The `@@unique([assetId, date])` and `@@unique([benchmark, date])` constraints matter beyond data hygiene: they're what make the backfill and benchmark jobs idempotent in `MARKET_DATA_US-2_T-2` and `MARKET_DATA_US-3_T-3`.

**Transcribe `RiskRating`'s 22 values in the spec's exact order** — it's the S&P/Fitch scale declared best→worst, and Postgres sorts enum columns by declaration order, so that order *is* the risk sort (see the spec's "`RiskRating` ordering is load-bearing" note). Reordering or dropping a notch silently breaks every risk-ordered query. The `@map("AA+")`-style annotations are required because Prisma enum identifiers can't contain `+`/`-`; the DB stores the real label (`AA+`) while TypeScript gets `RiskRating.AA_PLUS`.

**Test:** Mostly a schema-only migration, verified as in `AUTH_US-1_T-1`: with the `db` container up, `pnpm db:migrate` exits `0` and creates the three tables with the spec's columns (`psql -h localhost -p 5432 -U postgres -d investment_assistant -c '\d assets'`, `'\d price_history'`, `'\d benchmark_snapshots'`). Confirm red first (no models, so `\d assets` reports "does not exist"), then green after migrating.

The one thing worth a real assertion is `RiskRating`'s stored order, since it's silently wrong rather than loud when broken, and every risk-sorted query depends on it. `apps/api/test/risk-rating-order.e2e-spec.ts` (e2e, per `CONVENTIONS.md` → "Testing", since it needs a real Postgres) queries the DB's own enum order and asserts it matches the scale exactly, best→worst —

```sql
SELECT e.enumlabel FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'RiskRating' ORDER BY e.enumsortorder;
```

expecting `['AAA','AA+','AA','AA-','A+','A','A-','BBB+','BBB','BBB-','BB+','BB','BB-','B+','B','B-','CCC+','CCC','CCC-','CC','C','D']`. This asserts against `pg_enum` rather than the generated Prisma client deliberately: it's the database's sort order that `ORDER BY risk_rating` actually uses, and it catches both a transcription slip now and a future `ADD VALUE` appended past `D`.

**Done when:** `pnpm db:migrate` completes without error against a running `db` container, the three tables match the spec's models, the enum-order test above passes, and `pnpm --filter api build` still passes (proving the generated client compiles).
