# DASHBOARD_UI_US-3_T-2: wire the sector and stock donuts

**Story:** [../stories/US-3-allocation-donuts.md](../stories/US-3-allocation-donuts.md)
**Status:** Not Started
**GitHub Issue:** #216 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_US-2_T-3, DASHBOARD_UI_US-3_T-1

Add the allocation section to `apps/web/app/(dashboard)/page.tsx`: fetch `GET /portfolio/allocation?by=sector` and `?by=stock` (both inside the page's existing `Promise.all`) and render two `AllocationDonut`s side by side, per the mockup's allocation panel.

Centre labels: total portfolio value with the slice count as the sub-label ("12 sectors" / "31 stocks").

`by=investmentStyle` and `by=riskRating` are supported by the endpoint and by the component, but are **not** wired here — they're empty for any user who hasn't imported the assets CSV ([market-data](../../market-data/spec.md) `US-5`), and two permanently-empty donuts is a worse first impression than two populated ones. The spec says "extensible to style/risk", which this satisfies by the component's prop shape; adding the wiring later is a two-line change.

A `null` classification comes back from the API grouped under `"Unclassified"` (`computeAllocation`'s own behaviour) — render it as a normal slice, don't special-case or filter it out. For an unimported portfolio that single slice *is* the whole sector donut, and hiding it would render an empty chart next to a fully populated stock chart with no explanation.

**Test:** extend `apps/web/app/(dashboard)/page.test.tsx`: (1) both donuts render with their respective stubbed slices and are distinguishable by title; (2) the allocation fetches use `by=sector` and `by=stock`; (3) an allocation response consisting solely of an `"Unclassified"` slice renders that slice rather than the empty state.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
