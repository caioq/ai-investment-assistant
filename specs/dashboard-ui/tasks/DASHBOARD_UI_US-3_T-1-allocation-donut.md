# DASHBOARD_UI_US-3_T-1: `AllocationDonut`

**Story:** [../stories/US-3-allocation-donuts.md](../stories/US-3-allocation-donuts.md)
**Status:** Not Started
**GitHub Issue:** #215 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-2, DASHBOARD_UI_SHARED_T-4

`apps/web/components/dashboard/AllocationDonut.tsx` — the spec calls this "the main reuse point": one component serves the sector, stock, investment-style and risk-rating breakdowns, and asset-class later. Props are exactly `{ title, slices: AllocationSlice[], centerLabel, centerSubLabel }`; nothing about a sector is baked in.

Rendered with CSS `conic-gradient` (mockup's technique, around line 547), not a charting library — an explicit spec Non-Goal. Build the gradient by accumulating each slice's `pct` into running `from`/`to` stops, and use each slice's own `color`, which `computeAllocation` already derived from a deterministic label hash. **Never colour by array index**: slices arrive sorted by value, so an index palette re-assigns every label's colour the moment two positions swap rank, and the same sector changes colour between the two donuts on the same screen.

A legend lists each slice's label, value and percentage.

Three shapes must all work — this is the spec's own AC, and each breaks a different naive implementation:
- **One slice** — a single 0–100% stop; a gradient built from `slices.slice(1)` offsets renders nothing.
- **Many slices** — accumulated stops must reach exactly 100%; floating-point accumulation over ~30 stocks leaves a hairline gap unless the last stop is pinned to `100%`.
- **Empty** — a new user with no holdings. Render a neutral grey ring and an empty-state message. `conic-gradient()` with zero stops is invalid CSS and takes the whole panel down.

**Test:** `apps/web/components/dashboard/AllocationDonut.test.tsx` (Vitest + RTL): (1) one slice renders a `conic-gradient` covering the full turn and one legend row; (2) several slices render one legend row each, in the given order, with each slice's own `color` in both the gradient and its legend swatch, and the final stop at `100%`; (3) an empty `slices` array renders the empty-state message, no `conic-gradient(` with zero stops, and throws nothing; (4) the same component with a style/risk `title` and slices renders identically — proving nothing is sector-specific.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
