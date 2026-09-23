# DATA_SOURCES_US-3_T-1: Holdings import panel

**Story:** [../stories/US-3-import-holdings.md](../stories/US-3-import-holdings.md)
**Status:** Not Started
**GitHub Issue:** #320 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_US-2_T-1, DATA_SOURCES_SHARED_T-2

**Blocked** until the portfolio module's header-name holdings parser lands (PR #176) — see the story's Notes. Confirm `validateHoldingsRows` matches the shipped server parser before starting.

Wire the **holdings** source through the existing `ImportPanel` with its own config: title "Import holdings"; the explanation must say positions are **added or updated** and that nothing is removed; `POST /portfolio/holdings/upload-csv`; required columns `Ticker`, `Quantidade`, `Preco Médio`; skipping available (the endpoint partially imports).

The unknown-ticker warning is the point of this panel: a ticker absent from `knownTickers` renders a row warning ("{T} is not in the asset master; it will show as Unclassified in allocation") and still imports. After an assets import refreshes the summary, re-checking the same file must clear those warnings without a page reload.

On success, log `{ source: 'HOLDINGS', records: created + updated }` and show "Imported {n} holdings — {created} added, {updated} updated."

**Test:** `apps/web/components/data-sources/ImportPanel.holdings.test.tsx` (Vitest + RTL):
1. Attaching a Brazilian-format export renders the review with quantities parsed (`"R$ 1.234,56"` → `1234.56`) and no network call.
2. A ticker absent from `knownTickers` renders exactly one warning row naming it, and the row still counts toward the import total.
3. Re-running validation with that ticker added to `knownTickers` produces no warning — same file, no reload.
4. Import posts multipart to `/portfolio/holdings/upload-csv`; the success banner names the added and updated counts.
5. The panel's copy contains no word suggesting existing positions are replaced or deleted.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
