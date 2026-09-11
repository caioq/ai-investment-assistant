# DASHBOARD_UI_SHARED_T-2: `lib/types.ts` re-exports

**Shared by:** US-2, US-3, US-4, US-5, US-7
**Status:** Not Started
**GitHub Issue:** #204 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Create `apps/web/lib/types.ts` re-exporting the shapes this UI renders, per `CONVENTIONS.md` → "Shared utilities": the frontend never declares its own copy of a shape `packages/shared` already owns.

- Re-export `AllocationSlice` and `ALLOCATION_COLOR_PALETTE` from `@ai-investment-assistant/shared` — `AllocationSlice` is exactly what `GET /portfolio/allocation` returns and what `AllocationDonut` consumes, and its `color` is already computed server-side from a deterministic label hash. `AllocationDonut` must **not** re-derive colors from the slice's array index: slices arrive sorted by value, so an index-based palette reshuffles every label's color whenever a price moves.
- Re-export `PortfolioValuePoint` for the performance series.
- Declare the response shapes `packages/shared` does **not** yet own, as the API contracts in the specs define them: `PortfolioSummary` (`{ totalInvested, currentValue, gainLoss, returnPct }`), `PerformanceResponse` (`{ series, benchmarkSeries?, cagr, volatility, maxDrawdown, vsBenchmarkPct }`), `HoldingWithAsset`, `CsvUploadResult` (`{ created, updated, errors[] }`), `AdvisorAnalysis` (`{ score, summary, strengths[], risks[], recommendations[], impactMetrics[], model, createdAt }`), and `AuthUser` (`{ id, email, name }`).

Anything here that turns out to be duplicated between `apps/api` and `apps/web` belongs in `packages/shared` instead — but don't move API response DTOs there speculatively in this task; the rule is about logic, and these are read-only view shapes.

**Test:** `apps/web/lib/types.test.ts` (Vitest, type-level): asserts the re-exports resolve at runtime (`ALLOCATION_COLOR_PALETTE` is a non-empty array) and, with `expectTypeOf`, that `AllocationSlice` has `label`/`value`/`pct`/`color` — so the file fails loudly if `packages/shared` renames a field, rather than the mismatch surfacing as a blank donut later.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
