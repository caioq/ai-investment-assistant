# DEMO_SEED_US-2_T-4: Seed wallets, report, analysis and import logs

**Story:** [../stories/US-2-demo-account.md](../stories/US-2-demo-account.md)
**Status:** Done
**GitHub Issue:** #364 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DEMO_SEED_US-2_T-3

Extend `DEMO_FIXTURES` and `runSeed` with the rest of the spec's Seeded content:
- **Wallets:** three `RecommendedPortfolio`s (`sourceName: 'Demo Research'`, `effectiveDate` about 1 month ago).
  - `DIVIDENDS`: sets `dividendYieldPct`.
  - `OVERALL_RECOMMENDED`: `targetWeightPct` sums to 100, including `{ label: 'Renda Fixa - LFT Tesouro', assetId: null }`.
  - `SMALL_CAPS`
  - Every ticker row has `recommendation`, `limitPrice` and `marginOfSafetyPct`.
- **Report:** one `AdvisorReport` with `title`, `publisher`, `publishedAt`, `fileName` and a few paragraphs of `rawText`.
- **Analysis:** one `AdvisorAnalysis` linked to the report, with `recommendedPortfolioIds` set to the three wallet ids, hand-written content matching the holdings, and `model: 'demo-seed (pre-generated)'`.
- **Import logs:** six `ImportLog` rows with status `IMPORTED` (`ASSETS`, `HOLDINGS`, a `WALLET` for each `walletType`, `REPORT`), each with a realistic `fileName` and `records` count.

These are all demo-user-owned, so the delete-then-create order from T-3 already covers re-runs.

**Test:** `apps/api/test/demo-seed.e2e-spec.ts`: add cases to the suite from `DEMO_SEED_US-2_T-3`, logged in as the namespaced demo user, **with `ANTHROPIC_API_KEY` deleted from `process.env` before the app is built** and the Anthropic client provider overridden with a stub that fails the test if it's called:
1. `GET /advisor/analysis/latest` returns 200 with `model: 'demo-seed (pre-generated)'` and a `score` between 0 and 10, and the stub was never called.
2. The recommended-portfolios latest-per-wallet endpoint returns all three wallet types, and the `OVERALL_RECOMMENDED` `targetWeightPct` values sum to 100 (within 0.001), including one holding with `assetId: null`.
3. The data-sources summary/history endpoint(s) the `/data-sources` page reads show an `IMPORTED` entry for `ASSETS`, `HOLDINGS`, `REPORT` and each wallet type.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
