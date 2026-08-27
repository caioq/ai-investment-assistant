import { AssetType, InvestmentStyle, RiskRating } from '../../generated/prisma/client';

/**
 * A raw row from the assets CSV, keyed by column name (see spec's Behavior
 * Notes — the CSV columns are named after the `Asset` field they set). Every
 * field is `string | undefined`: `undefined` means the column is absent from
 * the file entirely, distinct from an empty string in a present column (see
 * `normalizeAssetRow`). Defined locally rather than imported from
 * `assets-csv.ts` — see MARKET_DATA_US-5_T-2/T-4.
 */
export interface RawAssetRow {
  ticker: string | undefined;
  sector: string | undefined;
  subSector: string | undefined;
  investmentStyle: string | undefined;
  riskRating: string | undefined;
  assetType: string | undefined;
}

/**
 * A `RawAssetRow` mapped onto the `Asset` classification fields (see spec's
 * Data Model). Only the keys present here should be written by the caller —
 * an absent key means "leave this field untouched", which is why this is a
 * `Partial`-shaped object rather than always carrying all six keys with
 * `null`/`undefined` values.
 */
export interface NormalizedAssetRow {
  ticker: string;
  sector?: string | null;
  subSector?: string | null;
  investmentStyle?: InvestmentStyle | null;
  riskRating?: RiskRating | null;
  assetType?: AssetType | null;
}

/**
 * Maps a raw enum column value onto a member of `enumObject`, distinguishing
 * three outcomes per the spec's absent-vs-empty rule:
 * - `undefined` (column absent from the CSV) -> `undefined` (key omitted from
 *   the caller's result entirely, leaving the stored value untouched).
 * - `''` (column present, cell empty) -> `null` (clears the stored value).
 * - Anything else must be a member of `enumObject`, or this throws — naming
 *   `columnName` and the offending `value` so the message surfaces verbatim
 *   as the row's `errors[]` entry.
 */
function normalizeEnumColumn<T extends string>(
  columnName: string,
  value: string | undefined,
  enumObject: Record<string, T>,
): T | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  const members = Object.values(enumObject) as string[];
  if (!members.includes(trimmed)) {
    throw new Error(`unrecognised ${columnName} "${value}"`);
  }

  return trimmed as T;
}

/**
 * Maps a name-keyed raw row onto the `Asset` classification shape, throwing
 * on a value it can't map (same contract as `normalizeWalletRow`, see
 * `CONVENTIONS.md` -> "CSV parsing"). `sector`/`subSector` are free text and
 * pass through unchanged (trimmed only); `investmentStyle`/`riskRating`/
 * `assetType` are validated against their generated Prisma enum object
 * rather than a hand-written string union.
 */
export function normalizeAssetRow(row: RawAssetRow): NormalizedAssetRow {
  const result: NormalizedAssetRow = {
    ticker: (row.ticker ?? '').trim().toUpperCase(),
  };

  if (row.sector !== undefined) {
    result.sector = row.sector.trim() === '' ? null : row.sector.trim();
  }

  if (row.subSector !== undefined) {
    result.subSector = row.subSector.trim() === '' ? null : row.subSector.trim();
  }

  const investmentStyle = normalizeEnumColumn(
    'investmentStyle',
    row.investmentStyle,
    InvestmentStyle,
  );
  if (investmentStyle !== undefined) {
    result.investmentStyle = investmentStyle;
  }

  const riskRating = normalizeEnumColumn('riskRating', row.riskRating, RiskRating);
  if (riskRating !== undefined) {
    result.riskRating = riskRating;
  }

  const assetType = normalizeEnumColumn('assetType', row.assetType, AssetType);
  if (assetType !== undefined) {
    result.assetType = assetType;
  }

  return result;
}
