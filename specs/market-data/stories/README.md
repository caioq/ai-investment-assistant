# Market Data — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-daily-price-refresh.md) | Daily price refresh | Done | T-1..T-4 in `../tasks/` |
| [US-2](./US-2-historical-backfill.md) | Historical backfill for a new ticker | Done | T-1..T-2 in `../tasks/` |
| [US-3](./US-3-benchmark-series.md) | Benchmark series (Ibovespa, CDI) | Done | T-1..T-3 in `../tasks/` |
| [US-4](./US-4-on-demand-refresh.md) | On-demand quote refresh | Done | T-1..T-2 in `../tasks/` |
| [US-5](./US-5-asset-classification-import.md) | Classify assets from an assets CSV | Ready | T-1..T-5 in `../tasks/` |

## Cross-cutting tasks

Work shared by more than one story lives in `../tasks/MARKET_DATA_SHARED_T-<T>-<short-task-title>.md`, referenced by every story it serves — never duplicated per story.

- [`MARKET_DATA_SHARED_T-1-asset-price-schema.md`](../tasks/MARKET_DATA_SHARED_T-1-asset-price-schema.md) — `Asset`, `PriceHistory`, `BenchmarkSnapshot` models and their enums; the storage layer every other task in this module reads or writes. Shared by US-1, US-2, US-3, US-4.
- [`MARKET_DATA_SHARED_T-2-price-provider-interface.md`](../tasks/MARKET_DATA_SHARED_T-2-price-provider-interface.md) — the `PriceProvider` interface + `MarketDataModule` wiring, so the cron/aggregation logic never depends on Yahoo Finance concretely (spec Behavior Note: `FixedIncomeProvider`/`CryptoProvider` can be added later without touching it). Shared by US-1, US-2, US-4.

## Decisions this pass had to make

- **Fixture tickers are synthetic (`MDAS*`), while the spec's ACs name `BBAS3` and `SMAL11`.** `CONVENTIONS.md` → "Testing" requires fixture values namespaced per suite, because e2e suites run in parallel against one Postgres and two suites reaching for the same real-looking ticker delete each other's rows — a bug this repo has already been bitten by. The assertions are unchanged in substance: the `BBAS3` AC is really "every column lands in the field of the same name, and `sector`/`subSector` are not transposed", and the `SMAL11` AC is "a row classified `ETF` imports rather than erroring". Both are checked against `MDAS*` rows carrying the same shape. Flagged rather than silently swapped, since the spec text still names the real tickers.
- **No schema/migration task.** `MARKET_DATA_SHARED_T-1` (`Done`) already added all four classification columns and both enums; they have been in `apps/api/prisma/schema.prisma` unwritten ever since. US-5 is the writer. That task's prose contains one sentence the current spec contradicts (it says this module never writes those columns); it's flagged inline there and its `Status` deliberately left `Done`, because the schema it produced is still exactly right.
- **US-5's endpoint is authenticated**, though the spec's API Contract doesn't say so. It writes shared master data every user's allocation view reads, and the module's only other endpoint is already guarded. Recorded here rather than decided silently inside `MARKET_DATA_US-5_T-5`.

## Flagged for you, outside this module's scope

- **`portfolio`'s holdings-CSV tasks still describe the old three-column format.** `PORTFOLIO_US-2_T-1`/`T-2` predate the spec's rewrite against the real 23-column export (header-name resolution, Brazilian numbers with thousands separators, silently skipped furniture rows). Those are portfolio's tasks, so this pass didn't touch them; they need a `/user-stories portfolio` refinement pass. Nothing in US-5 depends on it.

## Out of scope for this pass

- **Recomputing `PortfolioValueSnapshot` after prices update.** `PortfolioValueSnapshot` and `Holding` are owned by the [portfolio](../portfolio/spec.md) spec, whose models don't exist yet — `Σ holding.quantity * asset.currentPrice` can't be written, let alone tested, before those tables do. The spec's Goals and "Module boundary" Behavior Note now place this in `portfolio`, subscribing to a completion signal from this module. `portfolio`'s own `/user-stories` pass owns both the subscription and the recompute; **no task here emits that signal yet**, since there's nothing to consume it and the shape should be driven by the consumer.
- **Fixed income / crypto providers** — explicit spec Non-Goals. `PriceProvider` is written to accommodate them; only `B3YahooProvider` is implemented.
- **Real-time/intraday prices** — explicit spec Non-Goal; daily granularity only.
- **Any UI** — explicit spec Non-Goal; this module is backend-only.

## Dependency ordering

An earlier revision of the spec described the cron as collecting "every distinct ticker across all users' `Holding` rows" — but `Holding` belongs to `portfolio`, which in turn depends on **this** module (its `Holding.asset` relation needs `Asset`). Taken literally that was circular.

The spec has since been corrected (see its "Module boundary" Behavior Note) and resolves in one direction: `Asset`/`PriceHistory`/`BenchmarkSnapshot` land first (this pass), `Holding`/`PortfolioValueSnapshot` later. So the daily refresh in US-1 iterates **`Asset` rows, not `Holding` rows** — not a workaround, since per portfolio's own Behavior Note "adding a holding for a ticker not yet in `Asset` creates the `Asset` row," so every held ticker has an `Asset` row by construction. Iterating `Asset` needs no `Holding` table and keeps AC-1's batching guarantee exactly as specified.

Recorded here because it's the constraint most likely to be "fixed" back into a bug by someone reading the tasks without the spec.
