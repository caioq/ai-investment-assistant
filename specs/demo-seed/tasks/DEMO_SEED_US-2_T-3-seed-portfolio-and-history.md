# DEMO_SEED_US-2_T-3: `runSeed`: user, assets, holdings and history

**Story:** [../stories/US-2-demo-account.md](../stories/US-2-demo-account.md)
**Status:** Done
**GitHub Issue:** #363 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DEMO_SEED_US-1_T-1, DEMO_SEED_US-2_T-1, DEMO_SEED_US-2_T-2

Create `apps/api/prisma/seed/data.ts` (`DEMO_FIXTURES`: email `demo@example.com`, password `Demo1234!`, name `Demo User`, about 12 assets and about 10 holdings, as described in spec → Seeded content) and `apps/api/prisma/seed/index.ts`, exporting `runSeed(prisma, fixtures = DEMO_FIXTURES)`. `main()` runs only when the file is executed directly, and calls `assertSeedAllowed(process.env)` **before** constructing `new PrismaClient({ adapter: new PrismaPg(...) })`.

In this task, `runSeed`:
- upserts the user with `hashPassword`
- deletes the user's owned rows in foreign-key order, in a transaction
- `createMany({ skipDuplicates: true })` the assets, then works out which tickers **this run** created
- creates the holdings, with `createdAt` about 12 months ago
- generates about 250 weekday closes per asset with `randomWalk` (ending at the fixture `currentPrice`) and writes `PriceHistory` **only for the created assets**
- writes one `PortfolioValueSnapshot` per date, computed in memory: `totalValue = Σ qty × close`, `totalInvested = Σ qty × avgPrice`
- writes IBOVESPA (`randomWalk`) and CDI (`compoundedIndex`, 10.5%) `BenchmarkSnapshot` rows only when that benchmark has none inside the seeded date window

The fixtures leave `priceUpdatedAt` null. Every `AllocationBy` dimension gets at least two distinct values.

**Test:** New suite `apps/api/test/demo-seed.e2e-spec.ts`. Build the app per CONVENTIONS.md, with `configureApp` and `AUTH_THROTTLE_LIMIT=1000`. Run `runSeed(prisma, namespaced)`, where `namespaced` is `DEMO_FIXTURES` with a unique email (`demo-seed-e2e@example.com`) and tickers prefixed `DSE` (a helper in the suite). Assert:
1. `POST /auth/login` with the namespaced email and `Demo1234!` returns 200 and sets `access_token`.
2. With that cookie, `GET /portfolio/performance?range=1Y&benchmark=IBOVESPA` returns ≥ 200 `series` points and a non-empty `benchmarkSeries`. The same holds for `benchmark=CDI`.
3. For every `AllocationBy` value, `GET /portfolio/allocation?by=<value>` returns more than one slice.
4. The last `PortfolioValueSnapshot.totalValue` equals Σ fixture qty × fixture `currentPrice`, within 0.01.

Clean up only the rows this suite created.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
