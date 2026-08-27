# Assets CSV fixtures

`assets-full.csv`, `assets-partial.csv`, `assets-empty-cells.csv` and
`assets-bad-values.csv` are the fixtures every parser unit test and import
e2e test in the [market-data](../../../../../specs/market-data/spec.md)
module's [US-5](../../../../../specs/market-data/stories/US-5-asset-classification-import.md)
reads. Added by `MARKET_DATA_US-5_T-1`.

Tickers (`MDAS1`–`MDAS9`) are namespaced to this suite rather than real B3
codes, per `CONVENTIONS.md` → "Testing": e2e suites run in parallel against
one test Postgres, and reusing a real-looking ticker (or one another suite
already claims) makes the two suites delete each other's rows.
`market-data.e2e-spec.ts` already uses `MDTA4` for the same reason, so these
fixtures deliberately avoid that exact value too.

## The shape is the contract — do not "correct" it

Each oddity below is what some task's test exists to survive. Normalising it
makes that test vacuous rather than making the fixtures tidier:

- **`assets-full.csv`'s empty-`ticker` row** (`,NOTES,,,,`). Every other
  column is a legitimate spreadsheet artefact — a note/subtotal-style line a
  user leaves in the sheet — and it must be skipped **silently** on import,
  not reported as a row error, because it never claimed to be a ticker in
  the first place. Deleting it to "clean up" the fixture makes that
  skip-don't-report assertion untestable (`US-5_T-4`).
- **`assets-partial.csv` has only `ticker` and `sector` in its header** —
  no `subSector`, `investmentStyle`, `riskRating` or `assetType` at all,
  not even empty ones. This is what makes an **absent** column
  distinguishable from a **present-but-empty** cell: re-importing this file
  for `MDAS1`/`MDAS2` must leave their `investmentStyle`/`riskRating`/
  `assetType` untouched, because the columns were never in the header
  (`US-5_T-2`, `US-5_T-4`).
- **`assets-empty-cells.csv` has `riskRating` in its header but empty for
  `MDAS1`.** This is the other half of the absent-vs-empty pair above: a
  column that *is* present but has an empty cell clears that field to
  `null` on import. Neither this file nor `assets-partial.csv` is
  redundant with the other — one exercises "absent", the other "empty",
  and getting the two confused is exactly the bug this pair guards against
  (spec AC "Re-importing the same ticker with a changed `riskRating`...").
- **`assets-bad-values.csv`'s `Z` `riskRating` and `DIVIDENDOS`
  `investmentStyle`.** `Z` is not a `RiskRating` member; `DIVIDENDOS` is the
  Portuguese value left over from the holdings sheet this CSV's vocabulary
  deliberately does not accept (the correct English member is `DIVIDENDS`).
  Both are meant to look like the kind of thing a well-meaning cleanup
  would "fix" — leave them exactly as they are. The two valid rows
  (`MDAS6`, `MDAS9`) around them prove the bad rows land in `errors[]`
  while the rest of the file still imports (spec AC on unrecognised
  values).

`fixtures.e2e-spec.ts` in this directory guards all of the above, so drift
fails loudly here rather than silently weakening a later task's test. It
reads files only — no database or Nest app. It carries the `.e2e-spec.ts`
suffix because `test/jest-e2e.json` is the only Jest config in `apps/api`
that collects files under `test/` (the unit config has `rootDir: "src"`); a
`*.spec.ts` here would be collected by no runner at all.
