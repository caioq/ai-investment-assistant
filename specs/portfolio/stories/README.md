# Portfolio — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-manage-holdings.md) | Manage my holdings | Done | T-1..T-5 in `../tasks/` |
| [US-2](./US-2-csv-import.md) | Bulk-import holdings from CSV | Done | T-1..T-2 in `../tasks/` |
| [US-3](./US-3-allocation.md) | See where my money is concentrated | Done | T-1..T-2 in `../tasks/` |
| [US-4](./US-4-summary.md) | See what my portfolio is worth | Done | T-1 in `../tasks/` |
| [US-5](./US-5-performance.md) | Track performance against a benchmark | Done | T-1..T-3 in `../tasks/` |

## Cross-cutting tasks

Work shared by more than one story lives in `../tasks/PORTFOLIO_SHARED_T-<T>-<short-task-title>.md`, referenced by every story it serves — never duplicated per story.

- [`PORTFOLIO_SHARED_T-1-holding-snapshot-schema.md`](../tasks/PORTFOLIO_SHARED_T-1-holding-snapshot-schema.md) — `Holding` + `PortfolioValueSnapshot` models and the back-relations they force onto `User`/`Asset`. Every other task reads or writes these. Shared by US-1..US-5.
- [`PORTFOLIO_SHARED_T-2-portfolio-module-guard.md`](../tasks/PORTFOLIO_SHARED_T-2-portfolio-module-guard.md) — `PortfolioModule`/`PortfolioService`/`PortfolioController` wiring with the shared `AuthGuard` applied at the controller. Shared by US-1..US-5.
- [`PORTFOLIO_SHARED_T-3-shared-test-runner.md`](../tasks/PORTFOLIO_SHARED_T-3-shared-test-runner.md) — Vitest in `packages/shared`, which currently has **no test runner at all**. Both pure-function tasks are specified test-first and would otherwise have nowhere to put their tests. Shared by US-3, US-5.

## Start here

Three tasks have no dependencies and can be picked up immediately, in parallel: `PORTFOLIO_SHARED_T-1` (schema), `PORTFOLIO_SHARED_T-2` (module wiring), and `PORTFOLIO_SHARED_T-3` (test runner). `SHARED_T-3` unblocks the two pure-function tasks — `PORTFOLIO_US-3_T-1` (allocation math) and `PORTFOLIO_US-5_T-1` (CAGR/volatility/drawdown) — which need no database or Nest runtime and can then run alongside the endpoint work rather than behind it.

## Decisions this pass had to make

Two things the spec leaves open. Both are called out here rather than silently chosen inside a task:

- **Where allocation slice `color` comes from.** The API Contract returns `{ label, value, pct, color }` but never says what produces `color`. Assigning by array index is the obvious move and is wrong in a way tests won't catch: slices are ordered by value, so buying more of one stock reorders the list and every sector silently changes colour between two page loads. `PORTFOLIO_US-3_T-1` instead derives it deterministically **from the label**, so `"Financials"` is the same colour regardless of position, portfolio size, or which `by=` grouping is being rendered. The palette lives in `packages/shared` so [dashboard-ui](../../dashboard-ui/spec.md)'s `AllocationDonut` consumes the same values rather than keeping a second copy.
- **How `PortfolioValueSnapshot` rows get written.** The spec says performance metrics are computed *from* snapshots but never says what creates them. [market-data](../../market-data/spec.md)'s Goals say it "signals that a price refresh has completed" and that the recompute "is implemented [in portfolio], subscribing to this module's signal" — but no signal exists yet, because market-data deliberately left its shape to the consumer. `PORTFOLIO_US-5_T-2` defines both ends. See that task for why an event beats a second cron.

## Flagged for you, outside this module's scope

Surfaced while breaking this spec down; neither is portfolio work, so neither became a task here:

- **CI runs no tests.** `.github/workflows/ci.yml` runs lint, typecheck, and the two builds — there is no test step, so none of the repo's ~55 existing tests gate a PR. `CONVENTIONS.md` → "CI" says a test step would be "added once the first feature module lands its own tests", which happened back in `auth`; the trigger has been met and missed. Every task in this breakdown is specified red-green, and none of that is enforced on merge until this is fixed.
- ~~**No endpoint writes `Asset.investmentStyle`/`riskRating`.**~~ **Resolved.** All four classification fields (`sector`, `subSector`, `investmentStyle`, `riskRating`) moved from `Asset` to `Holding` and are now supplied by the holdings CSV — see the spec's "Classification is per-user" note. `?by=investmentStyle` and `?by=riskRating` return real slices once a classified CSV is uploaded. **The tasks below predate that change**: `US-2_T-1`/`T-2` describe a fixed three-column CSV, and `US-3_T-2` maps `by=` to `asset.*` rather than `holding.*`. A `/user-stories portfolio` refinement pass is needed to add the tasks that implement the move.

## Out of scope for this pass

- **Multiple portfolios per user**, **brokerage integration**, and **dividend tracking** — all explicit spec Non-Goals. In particular there is no `Portfolio` entity: a user's portfolio *is* their set of `Holding` rows, which is why every endpoint scopes on `userId` rather than a `portfolioId`.
- **Any UI.** This module ends at the JSON API; rendering belongs to [dashboard-ui](../../dashboard-ui/spec.md).
- **Editing `investmentStyle`/`riskRating` from the UI.** They are now `Holding` columns owned by this module and are set by re-uploading the holdings CSV (the spec's Non-Goal "a correction means uploading a new CSV" applies here too). A per-holding edit endpoint is still undefined — `PATCH /portfolio/holdings/:id` accepts only `quantity`/`avgPrice` — so an inline UI editor would need a spec pass.

## Notes on module boundaries

Two things this module owns that were explicitly deferred to it by market-data, so implementing them here is expected rather than cross-module scope creep:

- The `Asset.holdings` back-relation (market-data's Data Model note) — added in `PORTFOLIO_SHARED_T-1`.
- The call site for `MarketDataService.backfillHistory(assetId)`. market-data built the capability and left the trigger to holding creation — wired in `PORTFOLIO_US-1_T-1`. Note it can reject (Yahoo is unofficial and rate-limited, and `backfillHistory` has no internal catch), so the caller must handle that without failing the user's request.
