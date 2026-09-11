# US-3: See how my money is spread out

**Status:** Ready
**Traces to:** spec Goal "two allocation donuts (by sector, by stock — extensible to style/risk)" / spec AC "`AllocationDonut` renders correctly with 1 slice, many slices, and an empty list (no holdings yet) without crashing" (in `../spec.md`)

As an investor, I want my holdings broken down by sector and by individual stock, so that I can see a concentration I didn't intend before it costs me.

## Tasks

- [ ] [T-1: `AllocationDonut`](../tasks/DASHBOARD_UI_US-3_T-1-allocation-donut.md)
- [ ] [T-2: wire the sector and stock donuts](../tasks/DASHBOARD_UI_US-3_T-2-wire-allocation-section.md)

## Notes

**`AllocationDonut` is the spec's designated reuse point** — sector, stock, investment style, risk rating, and asset class once fixed income exists. Its props are `{ title, slices, centerLabel, centerSubLabel }` and nothing else; the moment a sector-specific assumption gets baked in, the reuse the spec is counting on is gone. `T-1`'s test deliberately renders the same component with a risk-rating title to catch that.

**Colours come from the slice, never from its index.** `computeAllocation` (`packages/shared/src/allocation.ts`) already hashes each label into the palette precisely so a label keeps its colour across renders. Slices arrive sorted by value, so index-based colouring reshuffles the legend whenever two positions swap rank — and shows the same sector in two different colours across the two donuts on screen together.

**The empty case is the AC that actually bites.** `conic-gradient()` with zero stops is invalid CSS, not a blank chart, and a new user with no holdings hits it on their first page load.

**Style and risk donuts are not wired in this pass.** Both are empty for any user who hasn't imported the assets CSV; the component supports them, the page doesn't mount them yet.
