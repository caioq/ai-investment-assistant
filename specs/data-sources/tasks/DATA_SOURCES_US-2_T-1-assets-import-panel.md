# DATA_SOURCES_US-2_T-1: Assets import panel

**Story:** [../stories/US-2-import-assets.md](../stories/US-2-import-assets.md)
**Status:** Not Started
**GitHub Issue:** #319 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_US-1_T-2, DATA_SOURCES_SHARED_T-2, DATA_SOURCES_SHARED_T-4, DATA_SOURCES_SHARED_T-6, DATA_SOURCES_SHARED_T-7, DATA_SOURCES_SHARED_T-8, DATA_SOURCES_SHARED_T-9

Add `apps/web/components/data-sources/ImportPanel.tsx` and wire the **assets** source through it end to end. This task defines the panel shape US-3, US-4 and US-5 reuse, so keep everything source-specific in props or a per-source config, not in branches inside the panel.

Composition: panel header (title "Import assets", one line on what importing does, "Download CSV template") → optional details slot → `DropZone` / `FileChip` → `CsvReview` → `ImportFooter`, with `Banner` above.

Behaviour:
- Attaching a file reads it, runs `parseCsv` + `validateAssetsRows` with `knownTickers` from the summary, and renders the review immediately. No request is made.
- Importing posts the **original file** to `POST /market-data/assets/import` via `apiFetchMultipart`. Skipping error rows is the server's existing partial-import behaviour — never re-serialize a filtered CSV.
- On success: clear the file, `POST /data-sources/imports` with `{ source: 'ASSETS', fileName, records: created + updated, status: 'IMPORTED', errors }`, refresh the summary (so `knownTickers` and the card update without a reload), and show "Imported {n} assets into the asset master." plus "{n} rows with errors skipped." when applicable.
- On failure: keep the file and its review, show the error banner, and log a `FAILED` row with the same `errors`.
- **Each source keeps its own pending file**, keyed `'assets' | 'holdings' | 'wallet:{type}' | 'report'`, so switching cards never discards one.
- The panel states in one line that assets are shared across users (spec → Data ownership).

**Test:** `apps/web/components/data-sources/ImportPanel.test.tsx` (Vitest + RTL; api client and the summary refresh mocked):
1. Attaching a 10-row CSV with 2 invalid `riskRating` rows renders the review (10/8/2) and makes **no** network call.
2. Clicking "Import 8 assets" posts multipart to `/market-data/assets/import` with the original file.
3. A `{created: 6, updated: 2, errors: ['row 3: …','row 7: …']}` response clears the file, posts an `ImportLog` with `records: 8` and both errors, and shows the success banner including "2 rows with errors skipped."
4. A rejected upload keeps the file and review on screen, shows the error banner, and posts a `FAILED` log.
5. Attaching a file, switching the selected source and switching back leaves the file and review intact.
6. The panel renders the shared-assets note.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
