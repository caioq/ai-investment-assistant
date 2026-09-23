export const SHARED_PACKAGE_NAME = 'shared';

export {
  ALLOCATION_COLOR_PALETTE,
  computeAllocation,
  type AllocationInput,
  type AllocationSlice,
} from './allocation';
export { cagr, maxDrawdown, volatility } from './metrics';
export type { PortfolioValuePoint } from './metrics';
export { isValidEmail } from './validation';
export {
  scorePassword,
  type PasswordScore,
  type PasswordStrength,
  type PasswordStrengthLabel,
} from './password-strength';
export { findColumn, parseCsv, type ParsedCsv } from './csv/parse-csv';
export {
  ASSETS_COLUMNS,
  HOLDINGS_COLUMNS,
  WALLET_COLUMNS,
  parseBrazilianNumber,
  validateAssetsRows,
  validateHoldingsRows,
  validateWalletRows,
  type ColumnDefinition,
  type Issue,
  type IssueSeverity,
  type ParsedRow,
  type ValidationResult,
  type WalletType,
} from './csv/validators';
export {
  buildCsvTemplate,
  csvTemplateFileName,
  type CsvTemplateSource,
} from './csv/build-csv-template';
