# Market Data — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-daily-price-refresh.md) | Daily price refresh | Ready | T-1..T-4 in `../tasks/` |
| [US-2](./US-2-historical-backfill.md) | Historical backfill for a new ticker | Done | T-1..T-2 in `../tasks/` |
| [US-3](./US-3-benchmark-series.md) | Benchmark series (Ibovespa, CDI) | Ready | T-1..T-3 in `../tasks/` |
| [US-4](./US-4-on-demand-refresh.md) | On-demand quote refresh | Ready | T-1..T-2 in `../tasks/` |

## Cross-cutting tasks

Work shared by more than one story lives in `../tasks/MARKET_DATA_SHARED_T-<T>-<short-task-title>.md`, referenced by every story it serves — never duplicated per story.

- [`MARKET_DATA_SHARED_T-1-asset-price-schema.md`](../tasks/MARKET_DATA_SHARED_T-1-asset-price-schema.md) — `Asset`, `PriceHistory`, `BenchmarkSnapshot` models and their enums; the storage layer every other task in this module reads or writes. Shared by US-1, US-2, US-3, US-4.
- [`MARKET_DATA_SHARED_T-2-price-provider-interface.md`](../tasks/MARKET_DATA_SHARED_T-2-price-provider-interface.md) — the `PriceProvider` interface + `MarketDataModule` wiring, so the cron/aggregation logic never depends on Yahoo Finance concretely (spec Behavior Note: `FixedIncomeProvider`/`CryptoProvider` can be added later without touching it). Shared by US-1, US-2, US-4.

## Out of scope for this pass

- **Recomputing `PortfolioValueSnapshot` after prices update.** `PortfolioValueSnapshot` and `Holding` are owned by the [portfolio](../portfolio/spec.md) spec, whose models don't exist yet — `Σ holding.quantity * asset.currentPrice` can't be written, let alone tested, before those tables do. The spec's Goals and "Module boundary" Behavior Note now place this in `portfolio`, subscribing to a completion signal from this module. `portfolio`'s own `/user-stories` pass owns both the subscription and the recompute; **no task here emits that signal yet**, since there's nothing to consume it and the shape should be driven by the consumer.
- **Fixed income / crypto providers** — explicit spec Non-Goals. `PriceProvider` is written to accommodate them; only `B3BrapiProvider` is implemented.
- **Real-time/intraday prices** — explicit spec Non-Goal; daily granularity only.
- **Any UI** — explicit spec Non-Goal; this module is backend-only.

## Dependency ordering

An earlier revision of the spec described the cron as collecting "every distinct ticker across all users' `Holding` rows" — but `Holding` belongs to `portfolio`, which in turn depends on **this** module (its `Holding.asset` relation needs `Asset`). Taken literally that was circular.

The spec has since been corrected (see its "Module boundary" Behavior Note) and resolves in one direction: `Asset`/`PriceHistory`/`BenchmarkSnapshot` land first (this pass), `Holding`/`PortfolioValueSnapshot` later. So the daily refresh in US-1 iterates **`Asset` rows, not `Holding` rows** — not a workaround, since per portfolio's own Behavior Note "adding a holding for a ticker not yet in `Asset` creates the `Asset` row," so every held ticker has an `Asset` row by construction. Iterating `Asset` needs no `Holding` table and keeps AC-1's batching guarantee exactly as specified.

Recorded here because it's the constraint most likely to be "fixed" back into a bug by someone reading the tasks without the spec.
