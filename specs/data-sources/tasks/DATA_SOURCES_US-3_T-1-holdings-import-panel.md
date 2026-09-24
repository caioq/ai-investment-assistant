# DATA_SOURCES_US-3_T-1: Holdings import panel

**Story:** [../stories/US-3-import-holdings.md](../stories/US-3-import-holdings.md)
**Status:** Done
**GitHub Issue:** #320 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_US-2_T-1, DATA_SOURCES_SHARED_T-2, DATA_SOURCES_SHARED_T-11

This panel targets the server's **current, interim** holdings format — three columns by position: `ticker`, `quantity`, `avgPrice` (spec → "The holdings format is interim, on purpose"). `DATA_SOURCES_SHARED_T-11` makes the shared validator and template match it; read that task before starting. When portfolio's parser (PR #176) later changes the format, this panel's hint copy changes with it — nothing else here should need to.

Wire the **holdings** source through the existing `ImportPanel` with its own config: title "Import holdings"; the explanation must say positions are **added or updated** and that nothing is removed; `POST /portfolio/holdings/upload-csv`; **no required-column pills** (the format is positional, so there are no column names to check — pass `requiredColumns: []`); the drop-zone hint reads "Three columns, in this order: ticker, quantity, avgPrice. Plain decimal numbers."; skipping available (the endpoint partially imports). The template button (`templateSource: 'holdings'`) downloads `ticker,quantity,avgPrice`.

The unknown-ticker warning is the point of this panel: a ticker absent from `knownTickers` renders a row warning ("{T} is not in the asset master; it will show as Unclassified in allocation") and still imports. After an assets import refreshes the summary, re-checking the same file must clear those warnings without a page reload.

On success, log `{ source: 'HOLDINGS', records: created + updated }` and show "Imported {n} holdings — {created} added, {updated} updated."

**Test:** `apps/web/components/data-sources/ImportPanel.holdings.test.tsx` (Vitest + RTL):
1. Attaching a `ticker,quantity,avgPrice` file renders the review with its rows and makes no network call; a `1.234,56` quantity shows as a row error, matching the server.
2. Attaching the real 23-column broker export renders every data row as an error ("expected 3 columns … got 23") and disables the import button — a truthful answer, since the server would reject it too.
3. A ticker absent from `knownTickers` renders exactly one warning row naming it, and the row still counts toward the import total.
4. Re-running validation with that ticker added to `knownTickers` produces no warning — same file, no reload.
5. Import posts multipart to `/portfolio/holdings/upload-csv`; the success banner names the added and updated counts.
6. The panel's copy contains no word suggesting existing positions are replaced or deleted.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
