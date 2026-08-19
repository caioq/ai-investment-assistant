import { BadRequestException } from '@nestjs/common';
import { normalizeWalletRow } from './wallet-row';
import type { NormalizedWalletRow } from './wallet-row';
import type { RawWalletRow } from './wallet-csv';

/**
 * Field-level checks over an already-normalised row (RECOMMENDED_PORTFOLIOS_US-1_T-3).
 * `normalizeWalletRow` itself already throws for an unrecognised `RECOMENDACAO`
 * (a shape error, not a range/emptiness one) — that throw is caught by
 * `validateWalletRows` below, alongside the checks here, so both kinds of
 * failure land in the same per-row error list.
 */
function checkNormalizedRow(row: NormalizedWalletRow): string[] {
  const errors: string[] = [];

  // EMPRESA is the one field every row must have — it's the only identifier
  // a tickerless row (the fixed-income line) carries. An empty CODIGO is
  // NOT an error: that's the fixed-income row itself.
  if (row.label.trim() === '') {
    errors.push('EMPRESA must not be empty');
  }

  // A present-but-unparsable numeric value comes back from
  // `parseBrazilianNumber` as NaN, never as null (null means "column not
  // published" — see RECOMMENDED_PORTFOLIOS_US-1_T-1). Absent
  // ALOCACAO_SUGERIDA/MARGEM_DE_SEGURANCA (null) is a legitimate shape of a
  // real export and must not be rejected.
  const numericFields: Array<[string, number | null]> = [
    ['PRECO_TETO', row.limitPrice],
    ['DY', row.dividendYieldPct],
    ['MARGEM_DE_SEGURANCA', row.marginOfSafetyPct],
  ];
  for (const [name, value] of numericFields) {
    if (value !== null && Number.isNaN(value)) {
      errors.push(`${name} is not a valid number`);
    }
  }

  if (row.targetWeightPct !== null) {
    if (Number.isNaN(row.targetWeightPct)) {
      errors.push('ALOCACAO_SUGERIDA is not a valid number');
    } else if (row.targetWeightPct < 0 || row.targetWeightPct > 100) {
      errors.push(
        `ALOCACAO_SUGERIDA must be between 0 and 100 (inclusive), got ${row.targetWeightPct}`,
      );
    }
  }

  return errors;
}

/**
 * Normalises and validates every raw row of a wallet upload, and — per the
 * spec's Behavior Note "A malformed row rejects the entire upload" — rejects
 * the **whole file** on any failure with a `BadRequestException` naming every
 * offending row, rather than failing on the first one. This deliberately
 * differs from `PortfolioService.importHoldingsCsv`'s partial-success model:
 * a wallet is a set that only means something whole (see
 * RECOMMENDED_PORTFOLIOS_US-1_T-4 and the spec's Non-Goals).
 *
 * This function never touches Prisma — it only returns the normalised rows
 * once every one of them has passed. A caller that validates the whole file
 * first and only writes after this resolves can never end up persisting a
 * partial wallet, which is the mistake this split is designed to prevent.
 *
 * Note the spec explicitly does **not** validate that weights sum to 100 —
 * a research house may publish a partially-allocated wallet.
 */
export function validateWalletRows(rawRows: RawWalletRow[]): NormalizedWalletRow[] {
  const rowErrors: string[] = [];
  const normalizedRows: NormalizedWalletRow[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 1;

    try {
      const normalized = normalizeWalletRow(raw);
      const errors = checkNormalizedRow(normalized);

      if (errors.length > 0) {
        rowErrors.push(`row ${rowNumber}: ${errors.join('; ')}`);
      } else {
        normalizedRows.push(normalized);
      }
    } catch (error) {
      rowErrors.push(
        `row ${rowNumber}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

  if (rowErrors.length > 0) {
    throw new BadRequestException(
      `Wallet upload rejected — ${rowErrors.join('; ')}`,
    );
  }

  return normalizedRows;
}
