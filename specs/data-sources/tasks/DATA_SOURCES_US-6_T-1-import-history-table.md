# DATA_SOURCES_US-6_T-1: Import history table

**Story:** [../stories/US-6-import-history.md](../stories/US-6-import-history.md)
**Status:** Done
**GitHub Issue:** #325 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_SHARED_T-4, DATA_SOURCES_US-1_T-2

Add `apps/web/components/data-sources/ImportHistory.tsx`, rendered as the last card on `/data-sources` from `GET /data-sources/imports?limit=20`.

- Real `<table>` with `<th>` headers: Date, Source, File (monospace), Records (right-aligned), Status.
- Status renders as text plus colour — "Imported" in `--emerald`, "Failed" in `--red` — never colour alone.
- Newest first. A successful import prepends its row without a reload (the panel refreshes this list after logging).
- **A row whose `errors` is non-empty** shows "{records} · {n} rejected" in the Records cell and is expandable (a `<button>` toggling `aria-expanded`) to list every message. This is what keeps a partial success from reading as clean.
- Empty state: a line saying nothing has been imported yet.

**Test:** `apps/web/components/data-sources/ImportHistory.test.tsx` (Vitest + RTL):
1. Given three logs, three body rows render, newest first, with `<th>` headers.
2. A row with `errors: ['row 3: …','row 7: …']` and `records: 8` shows "8 · 2 rejected"; expanding it lists both messages; collapsed, they aren't in the document.
3. `aria-expanded` flips on the toggle.
4. A `FAILED` row shows the text "Failed", not just a red style.
5. An empty list renders the empty state and no table body rows.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
