# DATA_SOURCES_SHARED_T-7: `CsvReview` — summary, column checks, preview table, issues

**Shared by:** US-2, US-3, US-4
**Status:** Not Started
**GitHub Issue:** #314 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_SHARED_T-2

Add `apps/web/components/data-sources/CsvReview.tsx`, taking a `ValidationResult` from `packages/shared` plus the source's required columns, and rendering the four review blocks from spec → Presentation:

1. **Summary strip** — Rows / Valid / Warnings / Errors. Valid is `--emerald`; Warnings `--amber` and Errors `--red` only when above zero, otherwise `--text-tertiary`.
2. **Required columns** — one pill per required column, ✓ present / ✕ missing, in monospace, each carrying text as well as the glyph.
3. **File-level issues** — one notice per `fileIssues` entry, tinted by severity.
4. **Preview table** — **every** row, in a container that scrolls past 320px with a sticky header. Columns: row number, each CSV column in file order, then Status. Real `<th>` headers. Error rows get a faint red tint; empty cells render "—"; numeric columns are right-aligned.
5. **Issues list** — one line per issue with a severity pill, `Row {n}` and the message. Errors first, then warnings, each sorted by row.

Status is never colour-only: every pill carries its word (Valid / Warning / Error).

Announce the parse result through **one** `aria-live="polite"` region: "10 rows, 2 errors, 1 warning" (pluralised correctly, and omitting the zero parts).

**Test:** `apps/web/components/data-sources/CsvReview.test.tsx` (Vitest + RTL), given a fixture result of 10 rows with 2 errors and 1 warning:
1. The summary strip reads 10 / 7 / 1 / 2.
2. A missing required column renders its pill with ✕ and the column name; a present one renders ✓.
3. The preview table renders 10 body rows and a `<th>` per column, and an empty cell shows "—".
4. The issues list renders errors before warnings, each naming its row number.
5. The live region's text is "10 rows, 2 errors, 1 warning".
6. Every status pill's text content is Valid, Warning or Error — asserted so colour alone never conveys status.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
