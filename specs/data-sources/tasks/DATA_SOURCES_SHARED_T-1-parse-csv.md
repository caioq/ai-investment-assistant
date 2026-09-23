# DATA_SOURCES_SHARED_T-1: `parseCsv` in `packages/shared`

**Shared by:** US-2, US-3, US-4
**Status:** Not Started
**GitHub Issue:** #308 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add `packages/shared/src/csv/parse-csv.ts` exporting `parseCsv(text: string): { columns: string[]; rows: Record<string, string>[] }`, re-exported from `packages/shared/src/index.ts`. Pure, no I/O.

- Splits on `\n`, tolerating `\r\n`, and ignores a trailing blank line.
- Supports quoted fields containing commas and newlines, and `""` as an escaped quote.
- Trims every header and value.
- Keys each row by its **header name**, so callers never index by position. Header lookup is case-insensitive: `columns` keeps the file's original spelling, while the row keys are the trimmed originals and a `findColumn(columns, name)` helper resolves a wanted name case-insensitively.
- A row with fewer cells than headers fills the missing ones with `""`; extra cells are ignored.
- An empty string, or a file with only a header row, yields `rows: []`.

**Test:** `packages/shared/src/csv/parse-csv.test.ts` (Vitest):
1. A 2-column, 2-row file yields those `columns` and row objects keyed by header.
2. `a,"b,c",d` keeps `b,c` as one value.
3. `"he said ""hi"""` yields `he said "hi"`.
4. ` ticker , sector \n PETR4 , Energia ` trims headers and values.
5. `findColumn(['Ticker'], 'ticker')` returns `'Ticker'`.
6. A header-only file and an empty string both yield `rows: []`.
7. A short row is padded with `""` rather than throwing.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
