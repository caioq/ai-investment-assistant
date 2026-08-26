# Portfolio — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-manage-holdings.md) | Manage my holdings | Done | T-1..T-5 in `../tasks/` |
| [US-2](./US-2-csv-import.md) | Bulk-import holdings from CSV | In Progress | T-1..T-5 in `../tasks/` |
| [US-3](./US-3-allocation.md) | See where my money is concentrated | Done | T-1..T-2 in `../tasks/` |
| [US-4](./US-4-summary.md) | See what my portfolio is worth | Done | T-1 in `../tasks/` |
| [US-5](./US-5-performance.md) | Track performance against a benchmark | Done | T-1..T-3 in `../tasks/` |

## Cross-cutting tasks

Work shared by more than one story lives in `../tasks/PORTFOLIO_SHARED_T-<T>-<short-task-title>.md`, referenced by every story it serves — never duplicated per story.

- [`PORTFOLIO_SHARED_T-1-holding-snapshot-schema.md`](../tasks/PORTFOLIO_SHARED_T-1-holding-snapshot-schema.md) — `Holding` + `PortfolioValueSnapshot` models and the back-relations they force onto `User`/`Asset`. Every other task reads or writes these. Shared by US-1..US-5.
- [`PORTFOLIO_SHARED_T-2-portfolio-module-guard.md`](../tasks/PORTFOLIO_SHARED_T-2-portfolio-module-guard.md) — `PortfolioModule`/`PortfolioService`/`PortfolioController` wiring with the shared `AuthGuard` applied at the controller. Shared by US-1..US-5.
- [`PORTFOLIO_SHARED_T-4-brazilian-number-to-shared.md`](../tasks/PORTFOLIO_SHARED_T-4-brazilian-number-to-shared.md) — moves `parseBrazilianNumber` out of `recommended-portfolios/` into `packages/shared`, now that `portfolio` needs it too. The alternative is a cross-feature-module import or a second copy. Shared by US-2 today; every future importer of a Brazilian-formatted export after that.
- [`PORTFOLIO_SHARED_T-3-shared-test-runner.md`](../tasks/PORTFOLIO_SHARED_T-3-shared-test-runner.md) — Vitest in `packages/shared`, which currently has **no test runner at all**. Both pure-function tasks are specified test-first and would otherwise have nowhere to put their tests. Shared by US-3, US-5.

## Start here

Everything from the original pass is `Done`. The open work is US-2's reopened tail: **`PORTFOLIO_US-2_T-3`** (fixtures) and **`PORTFOLIO_SHARED_T-4`** (move `parseBrazilianNumber`) have no dependencies and can run in parallel right now; `T-4` follows `T-3`, and `T-5` needs both `T-4` and `SHARED_T-4`.

`PORTFOLIO_US-2_T-5` is the one that actually fixes the user-visible bug — start the chain with the intent of landing it.

## Why US-2 reopened

The shipped `importHoldingsCsv` reads columns positionally (`const [rawTicker, rawQuantity, rawAvgPrice] = row`) and rejects any row that isn't exactly 3 wide (`if (row.length !== 3)`). The user's real export is 23 columns with Brazilian-formatted values, so **uploading it today yields 0 holdings and 41 errors** — verified by running the shipped parser against the actual file, not inferred from reading it.

That isn't a regression; T-1 correctly built what the spec described at the time. The spec was rewritten against the real file afterwards, and the tasks hadn't caught up. T-1 stays `Done` because the half of it that matters — per-row `errors[]`, the `(userId, assetId)` upsert, partial success — is still right and still tested; only its column-reading half is superseded, flagged inline there.

## Decisions this pass had to make

Two things the spec leaves open, plus two this refinement pass had to settle. All called out here rather than silently chosen inside a task:

- **`parseBrazilianNumber` moves to `packages/shared` rather than being imported across feature modules.** `portfolio` is its second consumer. The alternatives were a cross-module reach into `recommended-portfolios/` or a second copy that can drift; `CLAUDE.md` already names `packages/shared` as the home for pure logic. The cost is real but small: the function's spec is Jest and `packages/shared` runs Vitest, so the tests convert as part of `SHARED_T-4`.
- **Fixtures are synthetic and the tickers are namespaced (`CSVA3`, `CSVB4`, …), though the spec's ACs name `BBAS3` and the real 31-row file.** The repo is public and the real sheet is the user's own position sizes plus their research house's risk grades. No AC depends on the values — every one depends on the file's shape — so the shape is reproduced exactly and the data invented. The namespacing is separately required: `portfolio.e2e-spec.ts` already claims `PETR4`, `BBAS3`, `WEGE3` and a dozen more across its describe blocks, and `CONVENTIONS.md` → "Testing" is explicit that two suites sharing a ticker delete each other's rows.

- **Where allocation slice `color` comes from.** The API Contract returns `{ label, value, pct, color }` but never says what produces `color`. Assigning by array index is the obvious move and is wrong in a way tests won't catch: slices are ordered by value, so buying more of one stock reorders the list and every sector silently changes colour between two page loads. `PORTFOLIO_US-3_T-1` instead derives it deterministically **from the label**, so `"Financials"` is the same colour regardless of position, portfolio size, or which `by=` grouping is being rendered. The palette lives in `packages/shared` so [dashboard-ui](../../dashboard-ui/spec.md)'s `AllocationDonut` consumes the same values rather than keeping a second copy.
- **How `PortfolioValueSnapshot` rows get written.** The spec says performance metrics are computed *from* snapshots but never says what creates them. [market-data](../../market-data/spec.md)'s Goals say it "signals that a price refresh has completed" and that the recompute "is implemented [in portfolio], subscribing to this module's signal" — but no signal exists yet, because market-data deliberately left its shape to the consumer. `PORTFOLIO_US-5_T-2` defines both ends. See that task for why an event beats a second cron.

## Flagged for you, outside this module's scope

Surfaced while breaking this spec down; neither is portfolio work, so neither became a task here:

- **CI runs no tests.** `.github/workflows/ci.yml` runs lint, typecheck, and the two builds — there is no test step, so none of the repo's ~55 existing tests gate a PR. `CONVENTIONS.md` → "CI" says a test step would be "added once the first feature module lands its own tests", which happened back in `auth`; the trigger has been met and missed. Every task in this breakdown is specified red-green, and none of that is enforced on merge until this is fixed.
- ~~**No endpoint writes `Asset.investmentStyle`/`riskRating`.**~~ **Resolved.** All four classification fields stay on `Asset` and are written by a new **assets CSV** import owned by [market-data](../../market-data/spec.md) (`POST /market-data/assets/import`) — the only source that can classify a ticker the user neither holds nor has a recommendation for. `?by=investmentStyle` and `?by=riskRating` return real slices once that file is uploaded. This module is unaffected: `PORTFOLIO_US-3_T-2`'s `asset.*` selectors are correct as built, and `US-2_T-1`/`T-2` need only the CSV-parsing changes below, not a classification rewrite. An interim revision moved the fields to `Holding`; it was reverted before implementation, so no task ever shipped against it.

## Out of scope for this pass

- **Multiple portfolios per user**, **brokerage integration**, and **dividend tracking** — all explicit spec Non-Goals. In particular there is no `Portfolio` entity: a user's portfolio *is* their set of `Holding` rows, which is why every endpoint scopes on `userId` rather than a `portfolioId`.
- **Any UI.** This module ends at the JSON API; rendering belongs to [dashboard-ui](../../dashboard-ui/spec.md).
- **Editing `investmentStyle`/`riskRating` from the UI.** They are `Asset` columns owned by [market-data](../../market-data/spec.md) and set by re-uploading the assets CSV. A per-asset admin CRUD is recorded as future work in that spec's Non-Goals; `PATCH /portfolio/holdings/:id` accepts only `quantity`/`avgPrice` and will not gain them.

## Notes on module boundaries

Two things this module owns that were explicitly deferred to it by market-data, so implementing them here is expected rather than cross-module scope creep:

- The `Asset.holdings` back-relation (market-data's Data Model note) — added in `PORTFOLIO_SHARED_T-1`.
- The call site for `MarketDataService.backfillHistory(assetId)`. market-data built the capability and left the trigger to holding creation — wired in `PORTFOLIO_US-1_T-1`. Note it can reject (Yahoo is unofficial and rate-limited, and `backfillHistory` has no internal catch), so the caller must handle that without failing the user's request.
