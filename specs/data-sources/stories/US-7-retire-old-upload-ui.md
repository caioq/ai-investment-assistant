# US-7: Retire the old upload controls

**Status:** Ready
**Traces to:** spec Goal "Move the existing upload UI here and delete it from the dashboard and holdings pages"; AC "`/holdings` renders no upload control and no add-holding form; `AdvisorPanel` renders no upload controls; `grep -r …` returns nothing" (in `../spec.md`)

As a user, I want one place to import data, so that I'm not choosing between three scattered upload controls that behave differently.

## Tasks

- [ ] [T-1: Remove the holdings page uploads](../tasks/DATA_SOURCES_US-7_T-1-remove-holdings-page-uploads.md)
- [x] [T-2: Remove the advisor panel uploads](../tasks/DATA_SOURCES_US-7_T-2-remove-advisor-panel-uploads.md)

Shared tasks this story relies on: [SHARED_T-10](../tasks/DATA_SOURCES_SHARED_T-10-e2e-and-visual-baselines.md).

## Notes

- **Each removal waits for its replacement.** T-1 can't land before US-3 (holdings panel) works, and T-2 can't land before US-4 and US-5 do — otherwise there's a window where a user has no way to import that source at all.
- `AddHoldingForm` is **deleted, not moved** (spec → Non-Goals): manual single-position entry goes away entirely.
- Both removals change what the dashboard and holdings pages render, so the Playwright visual baselines must be regenerated — that's `SHARED_T-10`.
