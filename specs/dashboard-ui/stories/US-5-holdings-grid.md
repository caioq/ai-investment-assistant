# US-5: See every position I hold

**Status:** Ready
**Traces to:** spec Goal "a holdings grid" / spec AC "Dashboard visually matches the mockup's layout for … holdings grid" (in `../spec.md`)

As an investor, I want every position listed with its quantity, average price, current price and gain or loss, so that I can see which individual holdings are driving the totals above.

## Tasks

- [ ] [T-1: `HoldingCard`](../tasks/DASHBOARD_UI_US-5_T-1-holding-card.md)
- [ ] [T-2: `HoldingsGrid`](../tasks/DASHBOARD_UI_US-5_T-2-holdings-grid.md)
- [ ] [T-3: wire the holdings grid](../tasks/DASHBOARD_UI_US-5_T-3-wire-holdings-grid.md)

## Notes

**`Asset.currentPrice` is nullable and this story is where that bites.** [market-data](../../market-data/spec.md) leaves the last-known value on a failed refresh rather than writing a zero, and a ticker added a minute ago has no quote yet. Rendering `null` as `0` doesn't blank one cell — it reports a 100% loss on the position and poisons any total computed across the rows. Em-dash, and keep quantity and average price visible.

That nullability reaches the sort too: `null` compared numerically sorts unpredictably, so unpriced rows can land at the top of a grid sorted by market value. `T-2` pins them last.

**It's a `<table>`, not a grid of `<div>`s.** Tabular data with column headers is what gives screen readers context and what makes find-in-page work across thirty-odd rows.

**The empty state is the first screen a registered user sees.** It gets a real message and a link to `/holdings`, not a blank panel.

**The mockup's filter chip is not in scope.** Click-a-slice-to-filter isn't in the spec's Goals; `HoldingsGrid` taking its rows as a prop means adding it later is a change to the page, not to the grid.
