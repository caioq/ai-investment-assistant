# DASHBOARD_UI_US-5_T-1: `HoldingCard`

**Story:** [../stories/US-5-holdings-grid.md](../stories/US-5-holdings-grid.md)
**Status:** Not Started
**GitHub Issue:** #221 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-2, DASHBOARD_UI_SHARED_T-4

`apps/web/components/dashboard/HoldingCard.tsx` — one row of the holdings table (mockup line 201): ticker, sector, quantity, average price, current price, market value, and gain/loss as a toned badge.

Takes a `HoldingWithAsset` and derives the display values in the component: `marketValue = quantity * asset.currentPrice`, `costBasis = quantity * avgPrice`, `gainLoss = marketValue - costBasis`.

`Asset.currentPrice` is nullable — a ticker whose quote refresh failed, or one added minutes ago and not yet priced ([market-data](../../market-data/spec.md) is explicit that a failed refresh leaves the last-known value rather than writing a zero). Render market value and gain/loss as an em-dash in that case and keep the row's quantity and average price visible. Treating a missing price as `0` doesn't just blank one cell — it reports a 100% loss on that position and drags down any total computed over the rows.

`Asset.sector` is likewise nullable before the assets CSV import; render `"Unclassified"`, matching what `computeAllocation` does with the same value, so the two views agree.

**Test:** `apps/web/components/dashboard/HoldingCard.test.tsx` (Vitest + RTL): (1) a fully-priced holding renders ticker, sector, quantity, and correctly computed BRL market value and gain/loss with the right badge tone; (2) a holding whose `currentPrice` is `null` renders em-dashes for market value and gain/loss, still shows quantity and average price, and its output contains no `NaN` and no `-100`; (3) a holding whose `sector` is `null` renders `"Unclassified"`; (4) a loss-making holding gets the negative tone.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
