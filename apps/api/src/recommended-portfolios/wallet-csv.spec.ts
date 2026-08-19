import { readFileSync } from 'fs';
import { join } from 'path';

import { parseWalletCsv } from './wallet-csv';
import { normalizeWalletRow } from './wallet-row';
import type { RawWalletRow } from './wallet-csv';

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

/**
 * RECOMMENDED_PORTFOLIOS_US-1_T-3 — row normalisation.
 *
 * Maps a `RawWalletRow` (RECOMMENDED_PORTFOLIOS_US-1_T-2) onto the
 * `RecommendedHolding` shape, using `parseBrazilianNumber`
 * (RECOMMENDED_PORTFOLIOS_US-1_T-1) for every numeric field.
 */
describe('normalizeWalletRow', () => {
  it('maps PRECO_TETO to limitPrice and ALOCACAO_SUGERIDA to targetWeightPct (spec AC-3)', () => {
    const overall = parseWalletCsv(readFixture('overall-recommended.csv'));

    // Alfa Energia Participacoes: PRECO_TETO "R$ 52,00", ALOCACAO_SUGERIDA "25,00%".
    const normalized = normalizeWalletRow(overall[0]);

    expect(normalized.limitPrice).toBe(52);
    expect(normalized.targetWeightPct).toBe(25);
  });

  it('maps a negative MARGEM_DE_SEGURANCA to marginOfSafetyPct (spec AC-3)', () => {
    const smallCaps = parseWalletCsv(readFixture('small-caps.csv'));

    // Bravo Educacao SA: MARGEM_DE_SEGURANCA "-8,63%".
    const normalized = normalizeWalletRow(smallCaps[1]);

    expect(normalized.marginOfSafetyPct).toBe(-8.63);
  });

  it('normalises COMPRA/NEUTRO/VENDA to BUY/NEUTRAL/SELL (spec AC-4)', () => {
    const overall = parseWalletCsv(readFixture('overall-recommended.csv'));
    const smallCaps = parseWalletCsv(readFixture('small-caps.csv'));

    expect(normalizeWalletRow(overall[0]).recommendation).toBe('BUY'); // COMPRA
    expect(normalizeWalletRow(overall[2]).recommendation).toBe('NEUTRAL'); // NEUTRO
    expect(normalizeWalletRow(smallCaps[1]).recommendation).toBe('SELL'); // VENDA
  });

  it('produces a row error, not null, for an unrecognised RECOMENDACAO value (spec AC-4)', () => {
    const row: RawWalletRow = {
      CODIGO: 'RPFA3',
      EMPRESA: 'Alfa Energia Participacoes',
      PRECO_TETO: 'R$ 52,00',
      ALOCACAO_SUGERIDA: '25,00%',
      RECOMENDACAO: 'MANTER',
      MARGEM_DE_SEGURANCA: undefined,
      DY: undefined,
    };

    expect(() => normalizeWalletRow(row)).toThrow();
  });

  it("normalises the tickerless row to assetId-less shape and keeps it (spec AC-1)", () => {
    const overall = parseWalletCsv(readFixture('overall-recommended.csv'));

    // The fixture's final row: "Renda Fixa - LFT Tesouro" carries no CODIGO.
    const normalized = overall.map(normalizeWalletRow);

    expect(normalized).toHaveLength(overall.length);
    const tickerless = normalized[normalized.length - 1];
    expect(tickerless.ticker).toBeNull();
    expect(tickerless.label).toBe('Renda Fixa - LFT Tesouro');
    expect(tickerless.targetWeightPct).toBe(15);
  });

  it('leaves targetWeightPct null (not 0) for every Dividends and Small Caps row (spec AC-2)', () => {
    const dividends = parseWalletCsv(readFixture('dividends.csv')).map(
      normalizeWalletRow,
    );
    const smallCaps = parseWalletCsv(readFixture('small-caps.csv')).map(
      normalizeWalletRow,
    );

    expect(dividends.every((row) => row.targetWeightPct === null)).toBe(true);
    expect(smallCaps.every((row) => row.targetWeightPct === null)).toBe(true);
  });

  it('never carries RISCO, SETOR, CATEGORIA, PRECO_ATUAL, VARIACAO or PRECO_TETO_2 (spec AC-7)', () => {
    const expectedKeys = [
      'dividendYieldPct',
      'label',
      'limitPrice',
      'marginOfSafetyPct',
      'recommendation',
      'targetWeightPct',
      'ticker',
    ];

    const allRows = [
      ...parseWalletCsv(readFixture('overall-recommended.csv')),
      ...parseWalletCsv(readFixture('dividends.csv')),
      ...parseWalletCsv(readFixture('small-caps.csv')),
    ];

    for (const row of allRows) {
      expect(Object.keys(normalizeWalletRow(row)).sort()).toEqual(expectedKeys);
    }
  });

  it('maps limitPrice from PRECO_TETO, not the disagreeing PRECO_TETO_2 (spec AC-6)', () => {
    const dividends = parseWalletCsv(readFixture('dividends.csv'));

    // Bravo Saneamento SA: PRECO_TETO "R$ 39,80" vs PRECO_TETO_2 "R$ 40,80".
    const normalized = normalizeWalletRow(dividends[1]);

    expect(normalized.limitPrice).toBe(39.8);
  });

  it("uppercases a lowercase CODIGO, matching findOrCreateAsset's normalisation", () => {
    const row: RawWalletRow = {
      CODIGO: 'rpfa3',
      EMPRESA: 'Alfa Energia Participacoes',
      PRECO_TETO: 'R$ 52,00',
      ALOCACAO_SUGERIDA: '25,00%',
      RECOMENDACAO: 'COMPRA',
      MARGEM_DE_SEGURANCA: undefined,
      DY: undefined,
    };

    expect(normalizeWalletRow(row).ticker).toBe('RPFA3');
  });
});
