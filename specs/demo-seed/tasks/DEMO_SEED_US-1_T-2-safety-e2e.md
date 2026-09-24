# DEMO_SEED_US-1_T-2: Idempotency, insert-only and isolation e2e

**Story:** [../stories/US-1-never-damage-real-data.md](../stories/US-1-never-damage-real-data.md)
**Status:** Not Started
**GitHub Issue:** #360 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DEMO_SEED_US-2_T-4

A test-only task: prove against the real test Postgres that `runSeed` (built in `DEMO_SEED_US-2_T-3`/`T-4`) is safe to re-run, only adds rows to the global tables, and never touches another user's rows. Extend the existing `apps/api/test/demo-seed.e2e-spec.ts` with a `describe('safety')` block. It uses the same namespaced fixtures helper as the rest of the suite, with scoped cleanup. If an assertion fails, fix `runSeed`, not the test.

**Test:** `apps/api/test/demo-seed.e2e-spec.ts` → `describe('safety')`:
1. **Idempotency:** run `runSeed` twice. After the second run, the demo user's row counts are unchanged in `Holding`, `PortfolioValueSnapshot`, `RecommendedPortfolio`, `RecommendedHolding`, `AdvisorReport`, `AdvisorAnalysis` and `ImportLog`, and so is the count of `Asset` rows for the fixture tickers.
2. **Insert-only assets:** before seeding, create an `Asset` for one fixture ticker with `sector: 'Custom Sector'`, `currentPrice: 123.45` and `investmentStyle: null`. After seeding, those fields are unchanged, and that asset has **zero** `PriceHistory` rows from the seed.
3. **Insert-only benchmarks:** before seeding, insert one `BenchmarkSnapshot` for `CDI` dated inside the seeded window. After seeding, the count of `CDI` rows inside the window is still 1.
4. **Isolation:** before seeding, create a second user with a holding, an `AdvisorAnalysis` and an `ImportLog`. After seeding twice, all three rows are unchanged by id and content.

Clean up only the rows this suite created: fixture email, second user email, fixture tickers, and benchmark rows inside the seeded window.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
