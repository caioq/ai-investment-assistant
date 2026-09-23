# DATA_SOURCES_US-7_T-1: Remove the holdings page uploads

**Story:** [../stories/US-7-retire-old-upload-ui.md](../stories/US-7-retire-old-upload-ui.md)
**Status:** Not Started
**GitHub Issue:** #326 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_US-3_T-1

Delete `apps/web/components/holdings/HoldingsCsvUpload.tsx` and `apps/web/components/holdings/AddHoldingForm.tsx` with their tests, and reduce `apps/web/app/(dashboard)/holdings/page.tsx` to its `GET /portfolio/holdings` fetch plus `<HoldingsGrid />`.

Retarget the dashboard's "Add holdings" link in `apps/web/app/(dashboard)/page.tsx` to `/data-sources`.

`AddHoldingForm` is **deleted, not moved** (spec → Non-Goals): manual single-position entry goes away. `POST /portfolio/holdings` keeps working for API callers; only its UI disappears. Update CONVENTIONS.md → "Mutation forms feeding a server-rendered list", which currently documents `AddHoldingForm` as the reference pattern — point it at a surviving example or record that the pattern's reference was removed.

**Test:** `apps/web/app/(dashboard)/holdings/page.test.tsx` (update the existing file):
1. The page renders the holdings grid with its rows.
2. It renders no file input and no "Add holding" button.
3. `apps/web/app/(dashboard)/page.test.tsx`: the "Add holdings" link points at `/data-sources`.

Plus: `grep -rn "HoldingsCsvUpload\|AddHoldingForm" apps/web` returns nothing, and `pnpm --filter web test` passes with the deleted components' tests gone.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
