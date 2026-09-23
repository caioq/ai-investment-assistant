# DATA_SOURCES_SHARED_T-9: CSV template download

**Shared by:** US-2, US-3, US-4
**Status:** Done
**GitHub Issue:** #316 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_SHARED_T-2

Add `buildCsvTemplate(source, walletType?)` to `packages/shared/src/csv/` and a "Download CSV template" button in the import panel header for CSV sources.

- The header row is generated **from the column definitions `SHARED_T-2` exports**, so a template can never list a column the parser doesn't accept.
- Each wallet type gets its own template; the dividends one includes its `DY_` column while the others don't.
- Any generated value beginning `=`, `+`, `-` or `@` is prefixed with `'` (CSV injection — spec → Templates and CSV safety). Header names are generated the same way, so the rule holds even if a column is renamed later.
- The browser downloads it as `{source}-template.csv` (`wallet-{type}-template.csv` for wallets) via a Blob and an object URL that is revoked afterwards.

**Test:** `packages/shared/src/csv/build-csv-template.test.ts` (Vitest) plus one component test:
1. The assets template's single line is exactly the assets required + optional columns, comma-joined.
2. The dividends wallet template contains the `DY_` column and the small-caps one does not.
3. A column definition beginning with `=` is emitted prefixed with `'`.
4. Every template is one line and ends without a trailing comma.
5. `apps/web` component test: clicking "Download CSV template" creates and revokes an object URL and names the file `assets-template.csv` (mock `URL.createObjectURL`/`revokeObjectURL`).

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
