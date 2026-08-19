import { readFileSync } from 'fs';
import { join } from 'path';

import { parseWalletCsv } from './wallet-csv';

/**
 * RECOMMENDED_PORTFOLIOS_US-1_T-2 — header-driven column resolution.
 *
 * Reads the three synthetic fixtures from RECOMMENDED_PORTFOLIOS_SHARED_T-3
 * (apps/api/test/fixtures/recommended-portfolios/) to prove the parser reads
 * columns by header *name*, never by position, and resolves the
 * dividend-yield column by its `DY_` prefix regardless of the year suffix.
 */

const FIXTURE_DIR = join(
  __dirname,
  '..',
  '..',
  'test',
  'fixtures',
  'recommended-portfolios',
);

function readFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), 'utf8');
}

describe('parseWalletCsv', () => {
  it('parses all three fixtures without error and yields the expected row counts', () => {
    expect(parseWalletCsv(readFixture('overall-recommended.csv'))).toHaveLength(
      6,
    );
    expect(parseWalletCsv(readFixture('dividends.csv'))).toHaveLength(4);
    expect(parseWalletCsv(readFixture('small-caps.csv'))).toHaveLength(4);
  });

  it("resolves Dividends' EMPRESA to the same logical field as the other two, not CATEGORIA", () => {
    const rows = parseWalletCsv(readFixture('dividends.csv'));

    // Dividends leads with CATEGORIA ("GERACAO"); a positional reader would
    // return that value here instead of EMPRESA.
    expect(rows[0].EMPRESA).toBe('Alfa Energia Participacoes');
    expect(rows[0].CODIGO).toBe('RPDA3');
    expect(rows[0].PRECO_TETO).toBe('R$ 50,00');
  });

  it('resolves the dividend-yield column by DY_ prefix across differing years', () => {
    const overall = parseWalletCsv(readFixture('overall-recommended.csv'));
    const dividends = parseWalletCsv(readFixture('dividends.csv'));
    const smallCaps = parseWalletCsv(readFixture('small-caps.csv'));

    expect(overall[0].DY).toBe('8,00%'); // DY_2026
    expect(dividends[0].DY).toBe('8,00%'); // DY_2026
    expect(smallCaps[0].DY).toBe('2,10%'); // DY_2025
  });

  it('resolves ALOCACAO_SUGERIDA for Overall and undefined for Dividends and Small Caps', () => {
    const overall = parseWalletCsv(readFixture('overall-recommended.csv'));
    const dividends = parseWalletCsv(readFixture('dividends.csv'));
    const smallCaps = parseWalletCsv(readFixture('small-caps.csv'));

    expect(overall[0].ALOCACAO_SUGERIDA).toBe('25,00%');
    expect(dividends.every((row) => row.ALOCACAO_SUGERIDA === undefined)).toBe(
      true,
    );
    expect(smallCaps.every((row) => row.ALOCACAO_SUGERIDA === undefined)).toBe(
      true,
    );
  });

  it('throws on a CSV header missing CODIGO, rather than returning rows of null', () => {
    const csvWithoutCodigo =
      'EMPRESA,PRECO_TETO\nAlfa Energia Participacoes,"R$ 52,00"\n';

    expect(() => parseWalletCsv(csvWithoutCodigo)).toThrow();
  });

  it('throws on a CSV header missing PRECO_TETO', () => {
    const csvWithoutPrecoTeto = 'EMPRESA,CODIGO\nAlfa Energia Participacoes,RPFA3\n';

    expect(() => parseWalletCsv(csvWithoutPrecoTeto)).toThrow();
  });
});
