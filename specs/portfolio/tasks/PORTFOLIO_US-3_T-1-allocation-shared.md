# PORTFOLIO_US-3_T-1: computeAllocation in packages/shared

**Story:** [../stories/US-3-allocation.md](../stories/US-3-allocation.md)
**Status:** Not Started
**GitHub Issue:** #106 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_SHARED_T-3

Add `computeAllocation(slices: { label: string | null; value: number }[]): AllocationSlice[]` to `packages/shared/src/allocation.ts`, exported from `packages/shared/src/index.ts`, returning `{ label, value, pct, color }[]` — the exact shape of `GET /portfolio/allocation`'s response.

It lives in `packages/shared`, not `apps/api`, per `CLAUDE.md` → Conventions (*"allocation math … belongs in `packages/shared`, not duplicated between `apps/web` and `apps/api`"*). Being pure and database-free is what lets the percentage edge cases below be tested directly rather than through a seeded HTTP round-trip.

Behaviour:

- **Group by label and sum `value`** — the caller passes one entry per holding; entries sharing a label collapse into one slice.
- **`label: null` becomes `"Unclassified"`.** `investmentStyle` and `riskRating` are nullable on `Asset` and market-data never writes them, so they're `null` for most assets today. Dropping those rows would make the percentages sum to 100 across a *subset* of the portfolio — arithmetically consistent and completely misleading. A visibly large "Unclassified" slice is the honest output.
- **`pct` must sum to 100** (spec AC-4) within floating-point tolerance, for any input.
- **Sort by `value` descending** so the largest concentration reads first.
- **`color` is derived from the `label`**, not the slice's index — see below.
- An empty input returns `[]`, not a division-by-zero `NaN`.

**Colour must be a function of the label.** The spec names the field but not its source; assigning by array index is the obvious choice and is wrong in a way tests don't catch, because slices are sorted by value — buying more of one stock reorders the list and every sector changes colour between two page loads. Derive a stable index from the label (a small deterministic string hash, modulo the palette length) and export the palette itself so [dashboard-ui](../../dashboard-ui/spec.md)'s `AllocationDonut` uses the same values instead of keeping a second copy that drifts.

**Test:** `packages/shared/src/allocation.test.ts` — Vitest, colocated, using the runner `PORTFOLIO_SHARED_T-3` sets up (the package has none today):

1. **Spec AC-4** — three holdings across two sectors produce two slices whose `pct` values sum to `100` (`toBeCloseTo(100)`).
2. **The rounding traps**, which is where AC-4 actually breaks: a single holding yields exactly `100`, and three equal holdings each yield `33.33…` summing to `100` rather than `99.99`.
3. Entries with `label: null` collapse into one `"Unclassified"` slice rather than being dropped — assert the total `value` across returned slices equals the total passed in.
4. Slices come back sorted by `value` descending.
5. **Colour stability** — the same label gets the same colour across two calls whose *ordering differs* (e.g. `"Financials"` first in one input, last in the other). This is the assertion an index-based implementation fails.
6. `computeAllocation([])` returns `[]`.

Confirm red first (no `allocation.ts`), then green.

**Done when:** the test above passes — cases 2 and 5 in particular, since a naive implementation satisfies 1, 3, 4 and 6 while still mis-summing on thirds and reshuffling colours on every render.
