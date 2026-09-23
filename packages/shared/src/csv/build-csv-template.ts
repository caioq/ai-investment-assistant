import {
  ASSETS_COLUMNS,
  HOLDINGS_COLUMNS,
  WALLET_COLUMNS,
  type ColumnDefinition,
  type WalletType,
} from './validators';

/** The CSV-backed import sources; the report source is a PDF, not a CSV. */
export type CsvTemplateSource = 'assets' | 'holdings' | 'wallet';

/**
 * A value that starts with one of these is read as a formula by Excel/Sheets,
 * so every generated cell (header names included) is prefixed with `'` —
 * `specs/data-sources/spec.md` → "Templates and CSV safety".
 */
const FORMULA_PREFIXES = ['=', '+', '-', '@'];

function escapeCsvInjection(value: string): string {
  return FORMULA_PREFIXES.includes(value.charAt(0)) ? `'${value}` : value;
}

/**
 * The column definitions a source's template is generated from — always read
 * from `validators.ts` (never restated here), so a template can't list a
 * column the parser doesn't accept.
 */
function columnsFor(source: CsvTemplateSource, walletType?: WalletType): ColumnDefinition {
  switch (source) {
    case 'assets':
      return ASSETS_COLUMNS;
    case 'holdings':
      return HOLDINGS_COLUMNS;
    case 'wallet':
      if (walletType === undefined) {
        throw new Error('buildCsvTemplate: a wallet template needs a walletType');
      }
      return WALLET_COLUMNS[walletType];
  }
}

/**
 * Builds the header-only CSV a user downloads as a starting point: one line,
 * required columns first, then the optional ones, comma-joined with no
 * trailing comma.
 */
export function buildCsvTemplate(source: CsvTemplateSource, walletType?: WalletType): string {
  const { required, optional } = columnsFor(source, walletType);
  return [...required, ...optional].map(escapeCsvInjection).join(',');
}

/** `assets-template.csv`, or `wallet-dividends-template.csv` for wallets. */
export function csvTemplateFileName(source: CsvTemplateSource, walletType?: WalletType): string {
  if (source !== 'wallet') {
    return `${source}-template.csv`;
  }

  if (walletType === undefined) {
    throw new Error('csvTemplateFileName: a wallet template needs a walletType');
  }

  return `wallet-${walletType.toLowerCase().replace(/_/g, '-')}-template.csv`;
}
