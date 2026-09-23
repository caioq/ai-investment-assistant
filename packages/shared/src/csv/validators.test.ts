import { describe, expect, it } from 'vitest';

import { parseCsv } from './parse-csv';
import {
  parseBrazilianNumber,
  validateAssetsRows,
  validateHoldingsRows,
  validateWalletRows,
  WALLET_COLUMNS,
} from './validators';

describe('validateAssetsRows', () => {
  it('yields no issues and one row per data row for a clean file', () => {
    const parsed = parseCsv(
      'ticker,sector,investmentStyle,riskRating,assetType\nPETR4,Energia,VALUE_INVESTING,AA,EQUITY\nVALE3,Materiais,SMALL_CAP,BBB_PLUS,EQUITY',
    );

    const result = validateAssetsRows(parsed);

    expect(result.fileIssues).toEqual([]);
    expect(result.rowIssues).toEqual([]);
    expect(result.rows).toHaveLength(2);
  });

  it('reports an unrecognised riskRating as one row error and skips an empty ticker row silently', () => {
    const parsed = parseCsv(
      'ticker,riskRating\nPETR4,NOT_A_RATING\n,AA',
    );

    const result = validateAssetsRows(parsed);

    expect(result.rowIssues).toHaveLength(1);
    expect(result.rowIssues[0]).toEqual({
      row: 1,
      severity: 'error',
      message: 'row 1: unrecognised riskRating "NOT_A_RATING"',
    });
    expect(result.rows).toHaveLength(1);
  });

  it('reports one file error when the ticker column is missing', () => {
    const parsed = parseCsv('sector\nEnergia');

    const result = validateAssetsRows(parsed);

    expect(result.fileIssues).toEqual([
      { severity: 'error', message: 'Missing required column: ticker' },
    ]);
    expect(result.rows).toEqual([]);
    expect(result.rowIssues).toEqual([]);
  });
});

describe('parseBrazilianNumber', () => {
  it('parses "R$ 1.234,56" to 1234.56', () => {
    expect(parseBrazilianNumber('R$ 1.234,56')).toBe(1234.56);
  });
});

describe('validateHoldingsRows', () => {
  it('reports a non-positive quantity as a row error and an unknown ticker as a row warning', () => {
    const parsed = parseCsv(
      'Ticker,Quantidade,Preco Médio\nPETR4,0,"R$ 30,00"\nXYZW11,100,"R$ 10,00"',
    );

    const result = validateHoldingsRows(parsed, { knownTickers: ['PETR4'] });

    expect(result.rowIssues).toContainEqual({
      row: 1,
      severity: 'error',
      message: 'row 1: Quantidade must be a positive number',
    });
    expect(result.rowIssues).toContainEqual({
      row: 2,
      severity: 'warning',
      message: 'row 2: XYZW11 is not in the asset master; it will show as Unclassified in allocation',
    });
    expect(result.rows).toHaveLength(2);
  });
});

describe('validateWalletRows', () => {
  it('reports an unrecognised RECOMENDACAO as a row error', () => {
    const parsed = parseCsv(
      'CODIGO,PRECO_TETO,RECOMENDACAO\nPETR4,30.00,TALVEZ',
    );

    const result = validateWalletRows(parsed, {
      knownTickers: ['PETR4'],
      walletType: 'OVERALL_RECOMMENDED',
    });

    expect(result.rowIssues).toEqual([
      {
        row: 1,
        severity: 'error',
        message: 'row 1: unrecognised RECOMENDACAO "TALVEZ"',
      },
    ]);
  });

  it('reports a file warning when ALOCACAO_SUGERIDA totals 92, and none when it totals 100.3', () => {
    const parsedLow = parseCsv(
      'CODIGO,PRECO_TETO,ALOCACAO_SUGERIDA\nPETR4,30.00,50\nVALE3,60.00,42',
    );

    const lowResult = validateWalletRows(parsedLow, {
      knownTickers: ['PETR4', 'VALE3'],
      walletType: 'OVERALL_RECOMMENDED',
    });

    expect(lowResult.fileIssues).toHaveLength(1);
    expect(lowResult.fileIssues[0].severity).toBe('warning');
    expect(lowResult.fileIssues[0].message).toContain('92');

    const parsedOk = parseCsv(
      'CODIGO,PRECO_TETO,ALOCACAO_SUGERIDA\nPETR4,30.00,58.3\nVALE3,60.00,42',
    );

    const okResult = validateWalletRows(parsedOk, {
      knownTickers: ['PETR4', 'VALE3'],
      walletType: 'OVERALL_RECOMMENDED',
    });

    expect(okResult.fileIssues).toEqual([]);
  });

  it('has a Dividends column set that differs from the Overall and Small Caps sets', () => {
    expect(WALLET_COLUMNS.OVERALL_RECOMMENDED.optional).toContain('ALOCACAO_SUGERIDA');
    expect(WALLET_COLUMNS.DIVIDENDS.optional).not.toContain('ALOCACAO_SUGERIDA');
    expect(WALLET_COLUMNS.SMALL_CAPS.optional).not.toContain('ALOCACAO_SUGERIDA');

    expect(WALLET_COLUMNS.OVERALL_RECOMMENDED.optional).toContain('DY_2026');
    expect(WALLET_COLUMNS.DIVIDENDS.optional).toContain('DY_2026');
    expect(WALLET_COLUMNS.SMALL_CAPS.optional).toContain('DY_2025');
    expect(WALLET_COLUMNS.SMALL_CAPS.optional).not.toContain('DY_2026');
  });
});
