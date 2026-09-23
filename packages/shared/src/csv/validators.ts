import { findColumn, type ParsedCsv } from './parse-csv';

/**
 * A single finding from validating a parsed CSV against a source's rules.
 * `row` is the 1-based position of the offending row in `parsed.rows` (i.e.
 * `index + 1`, counting every original data row, not just the kept ones); a
 * file-level issue omits it entirely.
 */
export interface Issue {
  row?: number;
  severity: IssueSeverity;
  message: string;
}

export type IssueSeverity = 'error' | 'warning';

export type ParsedRow = Record<string, string>;

/**
 * The shape both the web preview and the server read: `rows` is what would
 * actually be imported (a row with an empty required key is dropped before
 * it ever reaches here), `rowIssues` are per-row findings a reviewer can
 * jump to by `row`, `fileIssues` are findings about the file as a whole (a
 * missing column, a total that doesn't add up) that no single row owns.
 */
export interface ValidationResult {
  columns: string[];
  rows: ParsedRow[];
  rowIssues: Issue[];
  fileIssues: Issue[];
}

/**
 * The column names a source's CSV template is built from (`SHARED_T-9`), so
 * a downloadable template can never drift from what this file's validators
 * actually accept.
 */
export interface ColumnDefinition {
  required: string[];
  optional: string[];
}

/**
 * Mirrors `apps/api/prisma/schema.prisma`'s `enum WalletType` as a local
 * string-literal union — `packages/shared` is dependency-free and can't
 * import the Prisma-generated client apps/api builds.
 */
export type WalletType = 'DIVIDENDS' | 'OVERALL_RECOMMENDED' | 'SMALL_CAPS';

// Mirrors apps/api/prisma/schema.prisma's `enum AssetType` exactly. Kept as a
// plain string array (not imported) for the same dependency-free reason as
// `WalletType` above.
const ASSET_TYPES = ['EQUITY', 'FIXED_INCOME', 'CRYPTO'];

// Mirrors `enum InvestmentStyle`.
const INVESTMENT_STYLES = [
  'SMALL_CAP',
  'MICRO_CAP',
  'DIVIDENDS',
  'VALUE_INVESTING',
  'TURNAROUND',
  'ETF',
];

// Mirrors `enum RiskRating`. Prisma's generated client keeps the *declared*
// identifier names as its runtime enum values (`AA_PLUS`, `BBB_MINUS`, ...),
// not the `@map`'d database labels (`AA+`, `BBB-`) — see
// `apps/api/src/market-data/asset-row.ts`'s `normalizeEnumColumn`, which
// checks a raw CSV value against `Object.values(RiskRating)` with no
// translation step. A CSV `riskRating` cell must literally contain
// `AA_PLUS`, not `AA+`, to match what the API accepts.
const RISK_RATINGS = [
  'AAA',
  'AA_PLUS',
  'AA',
  'AA_MINUS',
  'A_PLUS',
  'A',
  'A_MINUS',
  'BBB_PLUS',
  'BBB',
  'BBB_MINUS',
  'BB_PLUS',
  'BB',
  'BB_MINUS',
  'B_PLUS',
  'B',
  'B_MINUS',
  'CCC_PLUS',
  'CCC',
  'CCC_MINUS',
  'CC',
  'C',
  'D',
];

// Mirrors `enum Recommendation` as published in a wallet's `RECOMENDACAO`
// column.
const RECOMENDACAO_VALUES = ['COMPRA', 'NEUTRO', 'VENDA'];

/** Column definitions for the assets CSV (spec's Behavior Notes). */
export const ASSETS_COLUMNS: ColumnDefinition = {
  required: ['ticker'],
  optional: ['sector', 'subSector', 'investmentStyle', 'riskRating', 'assetType'],
};

/** Column definitions for the holdings CSV (spec's Behavior Notes). */
export const HOLDINGS_COLUMNS: ColumnDefinition = {
  required: ['Ticker', 'Quantidade', 'Preco Médio'],
  optional: [],
};

/**
 * Column definitions per wallet type. Deliberately different per type: only
 * the Overall Recommended wallet publishes `ALOCACAO_SUGERIDA`, and the `DY_`
 * column is `DY_2026` for Overall/Dividends but `DY_2025` for Small Caps
 * (see `specs/recommended-portfolios/spec.md`).
 */
export const WALLET_COLUMNS: Record<WalletType, ColumnDefinition> = {
  OVERALL_RECOMMENDED: {
    required: ['CODIGO', 'PRECO_TETO'],
    optional: ['EMPRESA', 'ALOCACAO_SUGERIDA', 'RECOMENDACAO', 'MARGEM_DE_SEGURANCA', 'DY_2026'],
  },
  DIVIDENDS: {
    required: ['CODIGO', 'PRECO_TETO'],
    optional: ['EMPRESA', 'RECOMENDACAO', 'MARGEM_DE_SEGURANCA', 'DY_2026'],
  },
  SMALL_CAPS: {
    required: ['CODIGO', 'PRECO_TETO'],
    optional: ['EMPRESA', 'RECOMENDACAO', 'MARGEM_DE_SEGURANCA', 'DY_2025'],
  },
};

/**
 * A `.` is only a thousands separator when it actually groups digits in
 * threes (`1.234`, `1.234.567`). Anything else — `12.5` — is left alone and
 * read as an en-US decimal point, so a value that never came from a
 * Brazilian export can't be silently inflated tenfold. Duplicated (not
 * imported) from `apps/api/src/recommended-portfolios/brazilian-number.ts`
 * — `packages/shared` cannot depend on `apps/api`.
 */
const THOUSANDS_GROUPED = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/;

/**
 * Parses a value as published in a research house's export — Brazilian
 * formatting: currency prefix (`"R$ 40,99"`), percent suffix (`"8,00%"`),
 * negatives (`"-6,71%"`), `,` decimal separator and `.` thousands separator
 * (`"R$ 1.234,56"` -> `1234.56`). `Number("8,00%")` is `NaN`, so every row of
 * every real export needs this before any numeric parse.
 *
 * Three outcomes, deliberately distinguishable from one another:
 * - a `number` — the value parsed;
 * - `null` — the value is absent (empty, whitespace-only, or `undefined`,
 *   which is how a column the source doesn't publish arrives). Never `0`,
 *   since `0` is itself a valid published value and would read as "allocate
 *   nothing" rather than "not published";
 * - `NaN` — the value is present but isn't a number after normalisation
 *   (`"abc"`, `"R$"`). Check with `Number.isNaN(result)`; callers reject the
 *   row on this rather than storing a silent `null`.
 */
export function parseBrazilianNumber(raw: string | undefined): number | null {
  if (raw === undefined) {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }

  const stripped = trimmed
    .replace(/R\$/gi, '')
    .replace(/%/g, '')
    .replace(/[\s\u00a0]/g, '');

  if (stripped === '') {
    return NaN;
  }

  const normalised = (
    THOUSANDS_GROUPED.test(stripped) ? stripped.replace(/\./g, '') : stripped
  ).replace(',', '.');

  if (!/^-?\d*\.?\d+$/.test(normalised)) {
    return NaN;
  }

  return Number(normalised);
}

/**
 * "row N: TICKER is not in the asset master; it will show as Unclassified in
 * allocation" — the established phrasing (see `CONVENTIONS.md`'s
 * data-sources Behavior Notes) shared by Holdings and Wallets, both of which
 * reference tickers the assets CSV may not classify yet.
 */
function unknownTickerWarning(rowNumber: number, ticker: string): Issue {
  return {
    row: rowNumber,
    severity: 'warning',
    message: `row ${rowNumber}: ${ticker} is not in the asset master; it will show as Unclassified in allocation`,
  };
}

/**
 * Validates the assets CSV against the rules the API's importer enforces
 * (`apps/api/src/market-data/asset-row.ts`). `knownCategories` is part of
 * the shared signature (future sector/style cross-checks) but no rule here
 * uses it yet.
 */
export function validateAssetsRows(
  parsed: ParsedCsv,
  _context: { knownCategories?: string[] } = {},
): ValidationResult {
  const tickerColumn = findColumn(parsed.columns, 'ticker');
  if (tickerColumn === undefined) {
    return {
      columns: parsed.columns,
      rows: [],
      rowIssues: [],
      fileIssues: [{ severity: 'error', message: 'Missing required column: ticker' }],
    };
  }

  const enumColumns: Array<{ name: string; members: string[] }> = [
    { name: 'investmentStyle', members: INVESTMENT_STYLES },
    { name: 'riskRating', members: RISK_RATINGS },
    { name: 'assetType', members: ASSET_TYPES },
  ];

  const rows: ParsedRow[] = [];
  const rowIssues: Issue[] = [];

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const ticker = (row[tickerColumn] ?? '').trim();
    if (ticker === '') {
      return;
    }

    for (const { name, members } of enumColumns) {
      const column = findColumn(parsed.columns, name);
      if (column === undefined) {
        continue;
      }

      const value = (row[column] ?? '').trim();
      if (value === '' || members.includes(value)) {
        continue;
      }

      rowIssues.push({
        row: rowNumber,
        severity: 'error',
        message: `row ${rowNumber}: unrecognised ${name} "${value}"`,
      });
    }

    rows.push(row);
  });

  return { columns: parsed.columns, rows, rowIssues, fileIssues: [] };
}

/**
 * Validates the holdings CSV against the rules the API's importer enforces
 * (`apps/api/src/portfolio/portfolio.service.ts`).
 */
export function validateHoldingsRows(
  parsed: ParsedCsv,
  context: { knownTickers: string[] },
): ValidationResult {
  const tickerColumn = findColumn(parsed.columns, 'Ticker');
  const quantityColumn = findColumn(parsed.columns, 'Quantidade');
  const priceColumn = findColumn(parsed.columns, 'Preco Médio');

  const missing: string[] = [];
  if (tickerColumn === undefined) missing.push('Ticker');
  if (quantityColumn === undefined) missing.push('Quantidade');
  if (priceColumn === undefined) missing.push('Preco Médio');

  if (tickerColumn === undefined || quantityColumn === undefined || priceColumn === undefined) {
    return {
      columns: parsed.columns,
      rows: [],
      rowIssues: [],
      fileIssues: [
        { severity: 'error', message: `Missing required column(s): ${missing.join(', ')}` },
      ],
    };
  }

  const knownTickers = new Set(context.knownTickers.map((ticker) => ticker.toUpperCase()));

  const rows: ParsedRow[] = [];
  const rowIssues: Issue[] = [];

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const ticker = (row[tickerColumn] ?? '').trim();
    if (ticker === '') {
      return;
    }

    const quantity = parseBrazilianNumber(row[quantityColumn]);
    if (quantity === null || Number.isNaN(quantity) || quantity <= 0) {
      rowIssues.push({
        row: rowNumber,
        severity: 'error',
        message: `row ${rowNumber}: Quantidade must be a positive number`,
      });
    }

    const price = parseBrazilianNumber(row[priceColumn]);
    if (price === null || Number.isNaN(price) || price <= 0) {
      rowIssues.push({
        row: rowNumber,
        severity: 'error',
        message: `row ${rowNumber}: Preco Médio must be a positive number`,
      });
    }

    if (!knownTickers.has(ticker.toUpperCase())) {
      rowIssues.push(unknownTickerWarning(rowNumber, ticker));
    }

    rows.push(row);
  });

  return { columns: parsed.columns, rows, rowIssues, fileIssues: [] };
}

/**
 * Validates a model wallet CSV against the rules the API's importer
 * enforces (`apps/api/src/recommended-portfolios/wallet-validation.ts`).
 * `walletType` is part of the shared signature (it selects the right
 * `WALLET_COLUMNS` entry for callers) but no rule below needs it directly.
 */
export function validateWalletRows(
  parsed: ParsedCsv,
  context: { knownTickers: string[]; walletType: WalletType },
): ValidationResult {
  const codeColumn = findColumn(parsed.columns, 'CODIGO');
  const priceColumn = findColumn(parsed.columns, 'PRECO_TETO');

  const missing: string[] = [];
  if (codeColumn === undefined) missing.push('CODIGO');
  if (priceColumn === undefined) missing.push('PRECO_TETO');

  if (codeColumn === undefined || priceColumn === undefined) {
    return {
      columns: parsed.columns,
      rows: [],
      rowIssues: [],
      fileIssues: [
        { severity: 'error', message: `Missing required column(s): ${missing.join(', ')}` },
      ],
    };
  }

  const knownTickers = new Set(context.knownTickers.map((ticker) => ticker.toUpperCase()));
  const recomendacaoColumn = findColumn(parsed.columns, 'RECOMENDACAO');
  const weightColumn = findColumn(parsed.columns, 'ALOCACAO_SUGERIDA');

  const rows: ParsedRow[] = [];
  const rowIssues: Issue[] = [];
  const fileIssues: Issue[] = [];
  let weightSum = 0;

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const code = (row[codeColumn] ?? '').trim();

    if (code !== '' && !knownTickers.has(code.toUpperCase())) {
      rowIssues.push(unknownTickerWarning(rowNumber, code));
    }

    if (recomendacaoColumn !== undefined) {
      const recomendacao = (row[recomendacaoColumn] ?? '').trim();
      if (recomendacao !== '' && !RECOMENDACAO_VALUES.includes(recomendacao)) {
        rowIssues.push({
          row: rowNumber,
          severity: 'error',
          message: `row ${rowNumber}: unrecognised RECOMENDACAO "${recomendacao}"`,
        });
      }
    }

    if (weightColumn !== undefined) {
      const weight = parseBrazilianNumber(row[weightColumn]);
      if (weight !== null && !Number.isNaN(weight)) {
        weightSum += weight;
      }
    }

    rows.push(row);
  });

  if (weightColumn !== undefined && (weightSum < 99.5 || weightSum > 100.5)) {
    fileIssues.push({
      severity: 'warning',
      message: `ALOCACAO_SUGERIDA totals ${weightSum}%, not 100%`,
    });
  }

  return { columns: parsed.columns, rows, rowIssues, fileIssues };
}
