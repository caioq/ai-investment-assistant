import { parse } from 'csv-parse/sync';

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

const REQUIRED_COLUMNS = ['CODIGO', 'PRECO_TETO'] as const;

const DIVIDEND_YIELD_PREFIX = 'DY_';

/**
 * Parses a research house's wallet export CSV into raw rows keyed by
 * logical field name, resolving the header row into a name→index map
 * rather than reading columns positionally. See spec Behavior Note "One
 * parser, driven by header names".
 *
 * Throws if the header is missing `CODIGO` or `PRECO_TETO` — that means the
 * file isn't one of these exports, and should fail loudly rather than
 * silently yield rows of `undefined`.
 */
export function parseWalletCsv(csvText: string): RawWalletRow[] {
  const records = parse(csvText, {
    columns: false,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as string[][];

  if (records.length === 0) {
    throw new Error('Wallet CSV has no header row');
  }

  const [header, ...dataRows] = records;
  const columnIndex = new Map<string, number>();
  header.forEach((name, index) => {
    columnIndex.set(name.trim(), index);
  });

  for (const required of REQUIRED_COLUMNS) {
    if (!columnIndex.has(required)) {
      throw new Error(
        `Wallet CSV is missing required column "${required}"`,
      );
    }
  }

  const dividendYieldColumn = header.find((name) =>
    name.trim().startsWith(DIVIDEND_YIELD_PREFIX),
  );
  const dividendYieldIndex =
    dividendYieldColumn === undefined
      ? undefined
      : columnIndex.get(dividendYieldColumn.trim());

  const resolve = (row: string[], name: string): string | undefined => {
    const index = columnIndex.get(name);
    return index === undefined ? undefined : row[index];
  };

  return dataRows.map((row) => {
    const resolved = { DY: undefined } as RawWalletRow;

    for (const field of EXACT_NAME_FIELDS) {
      resolved[field] = resolve(row, field);
    }

    resolved.DY =
      dividendYieldIndex === undefined ? undefined : row[dividendYieldIndex];

    return resolved;
  });
}
