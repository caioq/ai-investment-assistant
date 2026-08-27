import { parse } from 'csv-parse/sync';

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

const REQUIRED_COLUMNS = ['ticker'] as const;

/**
 * Parses a user-supplied assets CSV into raw rows keyed by logical field
 * name, resolving the header row into a name→index map rather than reading
 * columns positionally — same approach as `parseWalletCsv`
 * (`apps/api/src/recommended-portfolios/wallet-csv.ts`). Not extracted into
 * a shared helper: `parseWalletCsv`'s map also resolves a `DY_`-prefixed
 * column this parser has no equivalent of, and the four-line map itself is
 * cheaper to duplicate than to generalise across the two shapes.
 *
 * Throws if the header has no `ticker` column: that means the file isn't
 * an assets CSV, and should fail loudly rather than silently yield rows of
 * `undefined`. Header names are matched case-sensitively against the
 * spec's exact camelCase (`subSector`, not `subsector`), but each is
 * `.trim()`-ed first, as `parseWalletCsv` does.
 */
export function parseAssetsCsv(csvText: string): RawAssetRow[] {
  const records = parse(csvText, {
    columns: false,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as string[][];

  if (records.length === 0) {
    throw new Error('Assets CSV has no header row');
  }

  const [header, ...dataRows] = records;
  const columnIndex = new Map<string, number>();
  header.forEach((name, index) => {
    columnIndex.set(name.trim(), index);
  });

  for (const required of REQUIRED_COLUMNS) {
    if (!columnIndex.has(required)) {
      throw new Error(`Assets CSV is missing required column "${required}"`);
    }
  }

  const resolve = (row: string[], name: string): string | undefined => {
    const index = columnIndex.get(name);
    return index === undefined ? undefined : row[index];
  };

  return dataRows.map((row) => {
    const resolved = {} as RawAssetRow;

    for (const field of FIELDS) {
      resolved[field] = resolve(row, field);
    }

    return resolved;
  });
}
