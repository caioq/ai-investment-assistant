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
  const known = { knownTickers: ['PETR4', 'VALE3'] };
  const run = (body: string, header = 'ticker,quantity,avgPrice') =>
    validateHoldingsRows(parseCsv(`${header}\n${body}`), known);
  const errors = (r: ReturnType<typeof run>) =>
    r.rowIssues.filter((i) => i.severity === 'error').map((i) => i.message);

  it('accepts a clean file and exposes canonical columns', () => {
    const r = run('PETR4,100,32.5\nVALE3,10,60');
    expect(r.rowIssues).toEqual([]);
    expect(r.fileIssues).toEqual([]);
    expect(r.columns).toEqual(['ticker', 'quantity', 'avgPrice']);
    expect(r.rows).toEqual([
      { ticker: 'PETR4', quantity: '100', avgPrice: '32.5' },
      { ticker: 'VALE3', quantity: '10', avgPrice: '60' },
    ]);
  });

  it('reports a 4-cell row and a 2-cell row with the server wording', () => {
    expect(errors(run('PETR4,1,2,3'))).toEqual([
      'row 1: expected 3 columns (ticker,quantity,avgPrice), got 4',
    ]);
    expect(errors(run('PETR4,1'))).toEqual([
      'row 1: expected 3 columns (ticker,quantity,avgPrice), got 2',
    ]);
  });

  it('ignores header text entirely', () => {
    expect(run('PETR4,1,2', 'x,y').rowIssues).toEqual([]);
    expect(run('PETR4,1,2', 'Ticker,Quantidade,Preco Médio').rowIssues).toEqual([]);
  });

  it('reports an empty ticker as an error', () => {
    expect(errors(run(',1,2'))).toEqual(['row 1: ticker must not be empty']);
  });

  it('rejects bad quantities', () => {
    for (const q of ['0', '-1', 'abc', '1.234,56', '']) {
      expect(errors(run(`PETR4,"${q}",2`))).toEqual(['row 1: quantity must be a positive number']);
    }
  });

  it('rejects a bad price and accepts exponent notation', () => {
    expect(errors(run('PETR4,1,-5'))).toEqual(['row 1: avgPrice must be a positive number']);
    expect(run('PETR4,1e3,2').rowIssues).toEqual([]);
  });

  it('warns (only) on an unknown ticker and keeps every row', () => {
    const r = run('XYZW11,1,2');
    expect(r.rowIssues).toEqual([
      {
        row: 1,
        severity: 'warning',
        message: 'row 1: XYZW11 is not in the asset master; it will show as Unclassified in allocation',
      },
    ]);
    expect(r.rows).toHaveLength(1);
  });

  it('flags every row of the real 23-column export', () => {
    const cells = Array.from({ length: 23 }, (_, i) => `c${i}`).join(',');
    const r = run(`${cells}\n${cells}`, cells);
    expect(errors(r)).toEqual([
      'row 1: expected 3 columns (ticker,quantity,avgPrice), got 23',
      'row 2: expected 3 columns (ticker,quantity,avgPrice), got 23',
    ]);
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
