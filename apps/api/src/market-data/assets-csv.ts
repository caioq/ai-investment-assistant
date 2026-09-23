import { findColumn, parseCsv, validateAssetsRows } from '@ai-investment-assistant/shared';

/**
 * An assets CSV row's fields resolved by header *name*, not by position.
 *
 * Every value is the raw, unparsed cell string. A column entirely absent
 * from the file's header yields `undefined` for every row, while a column
 * present in the header but empty for a given row yields `''`. Preserving
 * that distinction is the whole point of this parser: `''` clears a stored
 * classification field, `undefined` leaves it untouched — see spec AC
 * "Re-importing the same ticker with a changed `riskRating`...".
 */
export interface RawAssetRow {
  ticker: string | undefined;
  sector: string | undefined;
  subSector: string | undefined;
  investmentStyle: string | undefined;
  riskRating: string | undefined;
  assetType: string | undefined;
}

const FIELDS = [
  'ticker',
  'sector',
  'subSector',
  'investmentStyle',
  'riskRating',
  'assetType',
] as const;

/**
 * Parses a user-supplied assets CSV into raw rows keyed by logical field
 * name. Splitting and header resolution are delegated to
 * `packages/shared`'s `parseCsv`/`findColumn` (DATA_SOURCES_SHARED_T-3) —
 * the same functions the browser preview runs — rather than this file's own
 * copy of `csv-parse`, so a column the preview resolves is guaranteed to be
 * the same one the server resolves. The required-column check is likewise
 * delegated to `validateAssetsRows`'s `fileIssues`, rather than a local
 * `Set.has('ticker')` check, for the same reason.
 *
 * Throws if the header has no `ticker` column: that means the file isn't
 * an assets CSV, and should fail loudly rather than silently yield rows of
 * `undefined`. `findColumn` matches case-insensitively (unlike the old
 * exact-case lookup this replaces) — see assets-csv.spec.ts's "resolves a
 * case-differing header" case.
 */
export function parseAssetsCsv(csvText: string): RawAssetRow[] {
  const parsed = parseCsv(csvText);
  const validation = validateAssetsRows(parsed);

  const missingColumns = validation.fileIssues.find((issue) =>
    issue.message.startsWith('Missing required column'),
  );
  if (missingColumns) {
    throw new Error(missingColumns.message);
  }

  return parsed.rows.map((row) => {
    const resolved = {} as RawAssetRow;

    for (const field of FIELDS) {
      const column = findColumn(parsed.columns, field);
      resolved[field] = column === undefined ? undefined : row[column];
    }

    return resolved;
  });
}
