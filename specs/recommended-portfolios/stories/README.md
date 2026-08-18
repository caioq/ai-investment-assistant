# Recommended Portfolios — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-upload-wallet-csv.md) | Upload a research house's model portfolio | Ready | T-1..T-4 in `../tasks/` |
| [US-2](./US-2-latest-per-wallet.md) | Read the current recommendation per wallet | Ready | T-1 in `../tasks/` |

## Cross-cutting tasks

Work shared by more than one story lives in `../tasks/RECOMMENDED_PORTFOLIOS_SHARED_T-<T>-<short-task-title>.md`, referenced by every story it serves — never duplicated per story.

- [`RECOMMENDED_PORTFOLIOS_SHARED_T-1-wallet-schema.md`](../tasks/RECOMMENDED_PORTFOLIOS_SHARED_T-1-wallet-schema.md) — `WalletType` enum, `RecommendedPortfolio` + `RecommendedHolding` models, and the back-relations they force onto `User`/`Asset`. Shared by US-1, US-2.
- [`RECOMMENDED_PORTFOLIOS_SHARED_T-2-module-guard.md`](../tasks/RECOMMENDED_PORTFOLIOS_SHARED_T-2-module-guard.md) — module/service/controller wiring under the `advisor/recommended-portfolios` route prefix, with the shared `AuthGuard`. Shared by US-1, US-2.

## Start here

Both `SHARED_` tasks have no dependencies and can be picked up in parallel. `RECOMMENDED_PORTFOLIOS_US-1_T-1` (extracting `findOrCreateAsset`) is also independent of them and unblocks the upload path.

## Decisions this pass had to make

Three things the spec leaves open or under-specifies. All are called out here rather than silently chosen inside a task:

- **A bad row rejects the whole upload — unlike `portfolio`'s CSV, which accepts partial success.** Spec AC-4 says rows outside 0–100 "are rejected with a clear error, not silently stored", without saying whether the *rest* of the file lands. The two modules genuinely differ: a holdings CSV is a bag of independent positions, so importing 3 of 4 is useful. A model portfolio is a **set of weights that only means something whole** — storing 8 of 10 rows produces a snapshot that misrepresents what the research house actually published, and [advisor](../../advisor/spec.md) would then reason over it as if complete, with no signal anything was dropped. `US-1_T-2` therefore rejects the entire upload with a `400` listing every offending row. Flagged because the natural instinct is to make this "consistent" with `PortfolioService.importHoldingsCsv`, and that would be wrong.
- **`GET .../latest` needs a tie-break the spec doesn't give it.** It selects "the `RecommendedPortfolio` with the most recent `effectiveDate`", but `effectiveDate` defaults to today and nothing stops two uploads on the same day — there's no unique constraint on `(walletType, effectiveDate)`, by design, since history is strictly additive. With a tie, the "latest" wallet is whichever row the database happens to return first. `US-2_T-1` breaks ties on `uploadedAt` descending, so re-uploading a corrected file the same day wins, which is the only reading consistent with the spec's "a correction means uploading a new CSV".
- **A ticker created from a wallet CSV does not get a 1-year price backfill.** [portfolio](../../portfolio/spec.md) backfills on holding creation so the performance chart isn't empty. Recommended wallets have no performance chart — the advisor needs `currentPrice` (to flag a price past its limit), which market-data's daily cron supplies by iterating `Asset` rows. Backfilling here would fire one 1-year fetch per new ticker against a rate-limited unofficial upstream, up to a whole wallet's worth per upload, for history nothing reads. `US-1_T-1` therefore returns `wasCreated` and lets each caller decide.

## Flagged for you, outside this pass

- **`sourceName` has no way in.** It's on `RecommendedPortfolio` (`// e.g. "XP"`) but the spec's API Contract lists only the `wallet` query param, the CSV file, and an optional `effectiveDate` form field — nothing sets it, so it stays `null` forever. Adding a form field would be feature work the approved spec doesn't describe, so this wants a `/spec recommended-portfolios` pass rather than a task here.
- **Nothing checks that a wallet's weights sum to ~100.** The spec validates each row is 0–100 but never the total, so a CSV summing to 60 is stored as a valid wallet. That may well be intentional (a research house can publish a partially-allocated wallet), which is exactly why this pass didn't invent a rule — but it's worth an explicit decision in the spec, since the advisor comparing "your allocation vs recommended" will read those weights as proportions.

## Out of scope for this pass

- **PDF/LLM extraction of this data** — explicit spec Non-Goal. Numeric fields like limit price are what LLM extraction silently gets wrong, so this stays structured CSV input. (Contrast [advisor](../../advisor/spec.md), whose *free-text* report does go through extraction.)
- **Editing individual rows after upload** — explicit spec Non-Goal; a correction is a new CSV, which is what keeps the history model simple.
- **Deleting or mutating a prior `RecommendedPortfolio`** — the additive guarantee is the whole point of the versioning story, and it's what makes old `AdvisorAnalysis` records reproducible against the exact wallet version they used.
- **Any UI**, and **the advisor's consumption of these snapshots** — this module ends at the JSON API; [advisor](../../advisor/spec.md) owns reading it.

## Notes on module boundaries

- The route prefix is **`advisor/recommended-portfolios`**, which deliberately does not match the module directory name (`recommended-portfolios`). That's what the spec's API Contract specifies — these endpoints are grouped with the advisor surface the frontend talks to, while the code lives in its own module because it owns its own models. Recorded so nobody "fixes" the prefix to match the folder.
- `Asset` is owned by [market-data](../../market-data/spec.md). This module creates `Asset` rows for unseen tickers (spec Behavior Notes) through market-data's service rather than writing that table directly — see `US-1_T-1`.
