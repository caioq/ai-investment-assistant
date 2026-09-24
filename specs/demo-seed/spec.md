# Demo Seed

**Status:** Approved
**Depends on:** [project-setup](../project-setup/spec.md), [auth](../auth/spec.md), [market-data](../market-data/spec.md), [portfolio](../portfolio/spec.md), [recommended-portfolios](../recommended-portfolios/spec.md), [advisor](../advisor/spec.md), [data-sources](../data-sources/spec.md)

## Problem

A fresh clone starts with an empty database. Before any dashboard view shows data, a reviewer or new developer has to prepare four correctly formatted files: the assets CSV, the holdings CSV, three model wallet CSVs, and a research report PDF. The advisor view also stays empty without an Anthropic API key. Nobody can explore the whole feature set without real setup work first.

## Goals

- **Demo account.** One demo account, `demo@example.com` / `Demo1234!`, with a fully populated portfolio, so every screen shows data right after login:
  - the dashboard allocations
  - performance vs. IBOVESPA and CDI
  - the advisor card
  - `/holdings`
  - `/data-sources`
- **A seed separate from the default setup:**
  - `pnpm bootstrap` stays seed-free.
  - `pnpm db:seed` seeds an already bootstrapped database.
  - `pnpm bootstrap:demo` does both in one command.
- **The seed can never run against a production database**, and never overwrites data someone imported themselves (see Behavior Notes → Production guard).
- **Safe to re-run.** Running it twice gives the same state as running it once.
- **Works offline.** The seed makes no network calls. All market history is generated in a reproducible way.
- **Works without an Anthropic key.** The advisor view isn't empty when `ANTHROPIC_API_KEY` is unset: the seed stores one pre-generated analysis.

## Non-Goals

- **Seeding more than one user**, or users with different roles.
- **Real market history.** Fetching real Yahoo Finance or BCB SGS history during the seed would make it depend on the network and give different results each run. The live cron and manual refresh endpoints still replace prices with real ones once they run.
- **A buy-transaction model.** The schema has no buy dates. "Portfolio history" is modelled only as `PortfolioValueSnapshot` rows, and this spec doesn't add a transactions table.
- **Sample import files** (CSV/PDF fixtures for trying the import UI by hand). That's a separate follow-up if it's wanted.
- **Resetting or deleting the whole database.** The seed only resets the demo user's own rows.
- **Running from the production build or container image.**

## Data Model

No schema changes. The seed writes to existing models only:

| Model                    | Scope       | Write semantics                                                                        |
| ------------------------ | ----------- | -------------------------------------------------------------------------------------- |
| `User`                   | demo user   | upsert on `email`                                                                      |
| `Holding`                | demo user   | delete-then-create                                                                     |
| `PortfolioValueSnapshot` | demo user   | delete-then-create (~1 year of daily rows)                                            |
| `RecommendedPortfolio` + `RecommendedHolding` | demo user | delete-then-create (holdings cascade)                        |
| `AdvisorReport`          | demo user   | delete-then-create                                                                     |
| `AdvisorAnalysis`        | demo user   | delete-then-create                                                                     |
| `ImportLog`              | demo user   | delete-then-create                                                                     |
| `Asset`                  | **global**  | `createMany({ skipDuplicates: true })`: insert only, never update                    |
| `PriceHistory`           | **global**  | only for assets the seed itself created in this run                                    |
| `BenchmarkSnapshot`      | **global**  | only for a benchmark with **no** rows inside the seeded date window                   |

Demo-user rows are deleted in foreign-key order: `ImportLog` → `AdvisorAnalysis` → `AdvisorReport` → `RecommendedPortfolio` → `PortfolioValueSnapshot` → `Holding`.

### Seeded content

- **User:** `demo@example.com`, name `Demo User`, password `Demo1234!`. The password is hashed with the same bcrypt helper the auth module uses (`hashPassword()`, exported from `apps/api/src/auth/`), so the salt rounds can't drift from what auth expects.
- **Assets:** about 12 B3 tickers, e.g. PETR4, VALE3, ITUB4, BBAS3, TAEE11, EGIE3, WEGE3, BBSE3, PRIO3, TUPY3, POMO4, BOVA11.
  - Each has `name`, `sector`, `subSector`, `investmentStyle` and `riskRating` filled in, so every `AllocationBy` view has more than one slice.
  - `currentPrice` is set close to real recent quotes, so the first live refresh doesn't make the chart jump.
  - `priceUpdatedAt` is `null`, so `getOrRefreshPrice` treats the price as stale and fetches a real quote the first time it's used.
- **Holdings:** about 10 of those assets, with `quantity` and `avgPrice`, and `createdAt` backdated about 12 months.
- **History:** about 1 year of weekday points (about 250), ending today.
  - **Per asset:** a reproducible random walk that ends exactly at the asset's seeded `currentPrice`.
  - **Portfolio snapshots:** one row per day. `totalValue = Σ quantity × that day's close` and `totalInvested = Σ quantity × avgPrice`, the same formula as `PortfolioService.snapshotAllUsers`. These are computed in memory from the generated series, so they're consistent whether or not the global `PriceHistory` rows were written.
  - **IBOVESPA:** a random walk at the index level.
  - **CDI:** an index starting at 100, compounded daily at about 10.5% a year, the same shape `MarketDataService.syncCdi` stores.
- **Model wallets:** one `RecommendedPortfolio` for each `WalletType`, with `sourceName: "Demo Research"` (a fictional house, to avoid imitating a real firm) and `effectiveDate` about one month ago.
  - `DIVIDENDS`: sets `dividendYieldPct`, and `targetWeightPct` is null.
  - `OVERALL_RECOMMENDED`: `targetWeightPct` sums to 100, including one row with no asset (`label: "Renda Fixa - LFT Tesouro"`, `assetId: null`).
  - `SMALL_CAPS`: `targetWeightPct` is null.
  - Every ticker row sets `recommendation`, `limitPrice` and `marginOfSafetyPct`.
- **Advisor report:** one `AdvisorReport` from Demo Research, with `title`, `publisher`, `publishedAt`, `fileName` and a few paragraphs of `rawText` (macro view plus sector calls).
- **Advisor analysis:** one `AdvisorAnalysis` linked to that report, with `recommendedPortfolioIds` set to the three wallet IDs.
  - A hand-written `score` (0–10), plus `summary`, `strengths`, `risks`, `recommendations` and `impactMetrics`, all matching the seeded holdings.
  - `model: "demo-seed (pre-generated)"`, so the audit field doesn't claim Claude produced it.
- **Import logs:** six `ImportLog` rows with status `IMPORTED`: `ASSETS`, `HOLDINGS`, a `WALLET` for each wallet type, and `REPORT`. Each has a realistic `fileName` and `records` count, so the `/data-sources` cards and history show the seeded state.

## API Contract

The seed adds no HTTP endpoints. Its interface is these commands:

| Command               | Where                                    | Does                                                                                          |
| --------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm db:seed`        | root `package.json`                      | runs `pnpm --filter api run db:seed`                                                          |
| `db:seed`             | `apps/api/package.json`                  | runs `prisma db seed`                                                                         |
| `migrations.seed`     | `apps/api/prisma.config.ts`              | `tsx prisma/seed/index.ts`                                                                    |
| `pnpm bootstrap:demo` | root `package.json`                      | runs `bash scripts/bootstrap.sh --seed`                                                       |
| `--seed` flag         | `scripts/bootstrap.sh`                   | after migrations and the `packages/shared` build, runs `pnpm db:seed` and prints the demo credentials |

Exit codes:
- `0`: the seed ran.
- Non-zero: the guard refused to run, or a write failed. The message says which.

Environment variables read:
- `DATABASE_URL`: required.
- `NODE_ENV`
- `DEMO_SEED_ALLOW_REMOTE`

## Behavior Notes

### Production guard

There are three independent layers, and the first one blocks on its own:

1. **Environment check before connecting.** `assertSeedAllowed(env)` in `apps/api/prisma/seed/guard.ts` is a pure function. It's the first thing `seed/index.ts` runs, before any `PrismaClient` is created. It throws, and the process exits non-zero, when:
   - `NODE_ENV === 'production'`. This can't be overridden.
   - `DATABASE_URL` is missing or can't be parsed as a URL.
   - `DATABASE_URL`'s host isn't one of `localhost`, `127.0.0.1`, `::1`, `db` or `db-test` (the local and `docker-compose.yml` hosts), **unless** `DEMO_SEED_ALLOW_REMOTE=true`. The override exists for a disposable demo or staging database, and it's still refused when `NODE_ENV=production`.
2. **Insert-only on global tables**, even on a permitted database:
   - An `Asset` that already exists keeps its imported classification and price.
   - Synthetic `PriceHistory` is written only for assets this run created.
   - Synthetic `BenchmarkSnapshot` rows are written only for a benchmark with no rows inside the seeded date window (the ~1 year ending today). Real synced history always covers that window, so it's never mixed with synthetic data. Unrelated older rows, like a test suite's 2015 fixtures, don't stop the seed from filling the window.
   - Real imported or synced data is never overwritten or mixed with synthetic points.
3. **Not in the production build.** The seed lives in `apps/api/prisma/seed/`, outside `src/`, so `nest build` doesn't include it. `tsx` is a dev dependency only.

### Idempotency

- The demo user is upserted, and its owned rows are deleted and recreated in one transaction.
- Global inserts rely on unique constraints (`Asset.ticker`, `PriceHistory @@unique([assetId, date])`, `BenchmarkSnapshot @@unique([benchmark, date])`) with `skipDuplicates`.
- The random walks use a fixed PRNG seed per ticker, so re-running gives identical values.

### Entry point and fixtures

- `apps/api/prisma/seed/index.ts` exports `runSeed(prisma, fixtures = DEMO_FIXTURES)`. It runs its CLI `main()` only when executed directly.
- `main()` calls `assertSeedAllowed(process.env)` **before** it constructs a `PrismaClient` (with the `PrismaPg` adapter, like `PrismaService`), then calls `runSeed`.
- `DEMO_FIXTURES` (`seed/data.ts`) holds the demo email and password, the asset, holding and wallet rows, the report and the analysis.
- Taking `fixtures` as a parameter lets the e2e suite run the real seed against namespaced data: a unique email and prefixed tickers. That way it doesn't collide with other suites sharing the test database, such as `portfolio.e2e-spec.ts`, which deletes `PETR4`/`VALE3`/`ITUB4` in its cleanup (see CONVENTIONS.md → Testing).

### Series generation

`apps/api/prisma/seed/series.ts` exports a pure generator:

- Inputs: ticker or seed key, end value, number of points, daily volatility, and an end date.
- Output: `{ date, close }[]` on weekdays only, dates at UTC midnight (matching `todayAtUtcMidnight()`), ascending, strictly positive, with the last close exactly equal to the end value.

The generator is unit-tested and has no Prisma dependency.

### Interaction with live market data

- Once the daily cron (`30 18 * * 1-5`) or `POST` refresh runs, real quotes overwrite `Asset.currentPrice` and upsert today's `PriceHistory`.
- The next portfolio snapshot then uses real prices. A small step at that boundary is expected and acceptable for demo data.
- If an asset already existed before the seed with a different `currentPrice`, the portfolio summary uses the real price while the seeded history ends at the seed's price. This is also acceptable. It only happens on a database that already had imported assets.

## Acceptance Criteria

- [ ] **Guard (unit tests):** `assertSeedAllowed`:
  - throws for `NODE_ENV=production`, both with and without `DEMO_SEED_ALLOW_REMOTE=true`
  - throws for a remote host without the override and passes with it
  - passes for `localhost`, `127.0.0.1`, `::1`, `db` and `db-test`
  - throws for a missing or malformed `DATABASE_URL`
- [ ] **Series (unit tests):**
  - two calls with the same inputs return identical output
  - the output has only weekday dates in ascending order, every close is > 0, and the last close equals the end value
- [ ] **Auth:** `hashPassword()` is exported from the auth module and used by both `AuthService.register` and the seed. The existing auth unit tests still pass.
- [ ] **E2E against `db-test` (after the seed has run):**
  - `POST /auth/login` with `demo@example.com` / `Demo1234!` returns 200 and sets the `access_token` cookie
  - `GET /portfolio/performance?range=1Y&benchmark=IBOVESPA` returns ≥ 200 `series` points and a non-empty `benchmarkSeries`, and the same holds for `benchmark=CDI`
  - `GET /portfolio/allocation?by=` returns more than one slice for every `AllocationBy` value
  - `GET /advisor/analysis/latest` returns 200 with `model: "demo-seed (pre-generated)"` while `ANTHROPIC_API_KEY` is unset
  - the latest recommended portfolio exists for each of the three wallet types, and the `OVERALL_RECOMMENDED` `targetWeightPct` values sum to 100
- [ ] **E2E, idempotency:** running the seed twice leaves the demo user's row counts in every model above, and the global `Asset` count, unchanged after the second run.
- [ ] **E2E, insert-only:**
  - an `Asset` inserted before the seed with a custom `sector` and `currentPrice` is unchanged afterwards
  - a benchmark that already has `BenchmarkSnapshot` rows inside the seeded date window gets no new rows from the seed
- [ ] **E2E, isolation:** another user's holdings, analyses and import logs, created before the seed, are unchanged afterwards.
- [ ] **Commands:**
  - `pnpm db:seed` on a bootstrapped database exits 0
  - with `NODE_ENV=production` it exits non-zero before connecting to the database
  - `pnpm bootstrap` alone leaves the `users` table empty on a fresh database
  - `pnpm bootstrap:demo` on a fresh clone ends by printing the demo credentials
- [ ] **Manual:** after `pnpm bootstrap:demo && pnpm dev`, logging in as the demo user shows:
  - populated allocation charts
  - a 1Y performance chart with the IBOVESPA and CDI overlays
  - the advisor card with the seeded analysis
  - the holdings list
  - `/data-sources` cards showing the import state
- [ ] **Docs:** `README.md` documents the demo credentials, `pnpm bootstrap:demo`, and `pnpm db:seed` along with its production guard. `CONVENTIONS.md` records the seed location and guard pattern.
