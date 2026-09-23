import { findColumn, parseCsv, validateWalletRows } from '@ai-investment-assistant/shared';

/**
 * A wallet CSV row's fields resolved by header *name*, not by position.
 *
 * Every value is the raw, unparsed cell string (still Brazilian-formatted —
 * converting it is RECOMMENDED_PORTFOLIOS_US-1_T-1/T-3's job) except when the
 * column is entirely absent from the file's header, in which case every
 * row's value for it is `undefined` rather than throwing. `DY` is the
 * dividend-yield column, matched by its `DY_` prefix since its name carries
 * a projection year that changes across exports (`DY_2026`, `DY_2025`).
 */
export interface RawWalletRow {
  CODIGO: string | undefined;
  EMPRESA: string | undefined;
  PRECO_TETO: string | undefined;
  ALOCACAO_SUGERIDA: string | undefined;
  RECOMENDACAO: string | undefined;
  MARGEM_DE_SEGURANCA: string | undefined;
  DY: string | undefined;
}

const EXACT_NAME_FIELDS = [
  'CODIGO',
  'EMPRESA',
  'PRECO_TETO',
  'ALOCACAO_SUGERIDA',
  'RECOMENDACAO',
  'MARGEM_DE_SEGURANCA',
] as const;

const DIVIDEND_YIELD_PREFIX = 'DY_';

/**
 * Parses a research house's wallet export CSV into raw rows keyed by
 * logical field name. Splitting, header resolution and the required-column
 * check are delegated to `packages/shared`'s `parseCsv`/`findColumn`/
 * `validateWalletRows` (DATA_SOURCES_SHARED_T-3) — the same functions the
 * browser preview runs — rather than this file's own copy of `csv-parse`.
 * `CODIGO`/`PRECO_TETO` are required by every wallet type identically (see
 * `packages/shared/src/csv/validators.ts`'s `WALLET_COLUMNS`), so any
 * `WalletType` works for this file-level column check; `knownTickers` and
 * `rowIssues`/weight totals aren't needed here and are ignored.
 *
 * Throws if the header is missing `CODIGO` or `PRECO_TETO` — that means the
 * file isn't one of these exports, and should fail loudly rather than
 * silently yield rows of `undefined`. `findColumn` matches
 * case-insensitively, unlike the exact-case lookup this replaces.
 */
export function parseWalletCsv(csvText: string): RawWalletRow[] {
  const parsed = parseCsv(csvText);
  const validation = validateWalletRows(parsed, {
    knownTickers: [],
    walletType: 'OVERALL_RECOMMENDED',
  });

  const missingColumns = validation.fileIssues.find((issue) =>
    issue.message.startsWith('Missing required column'),
  );
  if (missingColumns) {
    throw new Error(missingColumns.message);
  }

  const dividendYieldColumn = parsed.columns.find((name) =>
    name.trim().startsWith(DIVIDEND_YIELD_PREFIX),
  );

  return parsed.rows.map((row) => {
    const resolved = { DY: undefined } as RawWalletRow;

    for (const field of EXACT_NAME_FIELDS) {
      const column = findColumn(parsed.columns, field);
      resolved[field] = column === undefined ? undefined : row[column];
    }

    resolved.DY = dividendYieldColumn === undefined ? undefined : row[dividendYieldColumn];

    return resolved;
  });
}
