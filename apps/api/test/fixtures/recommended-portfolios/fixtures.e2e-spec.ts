import { readFileSync } from 'fs';
import { join } from 'path';

import { parse } from 'csv-parse/sync';

/**
 * Shape guard for the synthetic wallet-export fixtures in this directory
 * (RECOMMENDED_PORTFOLIOS_SHARED_T-3). The fixtures have no behaviour of their
 * own — this spec exists so that a later "tidy-up" of their deliberately odd
 * shape (column order, tickerless row, DY year suffix) fails loudly here
 * instead of silently making the parser tasks' tests vacuous. See README.md.
 *
 * Named `*.e2e-spec.ts` because that is the only Jest config in `apps/api`
 * that collects files under `test/` (the unit config has `rootDir: "src"`).
 * It reads files only — no database, no Nest application.
 */

const FIXTURE_DIR = __dirname;

const HEADERS = {
  'overall-recommended.csv':
    'EMPRESA,PRECO_ATUAL,PRECO_TETO,VARIACAO,CODIGO,ALOCACAO_SUGERIDA,RECOMENDACAO,DY_2026,RISCO',
  'dividends.csv':
    'CATEGORIA,EMPRESA,PRECO_ATUAL,PRECO_TETO,VARIACAO,CODIGO,RECOMENDACAO,MARGEM_DE_SEGURANCA,PRECO_TETO_2,DY_2026,RISCO',
  'small-caps.csv':
    'EMPRESA,SETOR,PRECO_ATUAL,PRECO_TETO,VARIACAO,CODIGO,RECOMENDACAO,MARGEM_DE_SEGURANCA,DY_2025,RISCO',
} as const;

type FixtureName = keyof typeof HEADERS;

const FIXTURE_NAMES = Object.keys(HEADERS) as FixtureName[];

function readFixture(name: FixtureName): string {
  return readFileSync(join(FIXTURE_DIR, name), 'utf8');
}

function rowsOf(name: FixtureName): Record<string, string>[] {
  return parse(readFixture(name), {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
}

/** "8,00%" / "R$ 1.234,56" / "-6,71%" -> number */
function brl(value: string): number {
  return Number(
    value
      .replace('R$', '')
      .replace('%', '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.'),
  );
}

describe('recommended-portfolios CSV fixtures', () => {
  it.each(FIXTURE_NAMES)('%s has the exact expected header', (name) => {
    const firstLine = readFixture(name).split('\n')[0].replace(/\r$/, '');

    expect(firstLine).toBe(HEADERS[name]);
  });

  it('overall-recommended.csv has exactly one tickerless row carrying a weight', () => {
    const tickerless = rowsOf('overall-recommended.csv').filter(
      (row) => row.CODIGO === '' && row.ALOCACAO_SUGERIDA !== '',
    );

    expect(tickerless).toHaveLength(1);
    expect(tickerless[0].EMPRESA).not.toBe('');
  });

  it("overall-recommended.csv's ALOCACAO_SUGERIDA values sum to 100", () => {
    const total = rowsOf('overall-recommended.csv').reduce(
      (sum, row) => sum + brl(row.ALOCACAO_SUGERIDA),
      0,
    );

    expect(total).toBeCloseTo(100, 6);
  });

  it('covers a thousands separator and a negative margin of safety', () => {
    const allText = FIXTURE_NAMES.map(readFixture).join('\n');
    expect(allText).toMatch(/R\$ \d\.\d{3},\d{2}/);

    const margins = FIXTURE_NAMES.flatMap((name) =>
      rowsOf(name)
        .map((row) => row.MARGEM_DE_SEGURANCA)
        .filter((value): value is string => Boolean(value)),
    );
    expect(margins.some((value) => brl(value) < 0)).toBe(true);
  });

  it('covers COMPRA, NEUTRO and VENDA across the set', () => {
    const recommendations = new Set(
      FIXTURE_NAMES.flatMap((name) =>
        rowsOf(name).map((row) => row.RECOMENDACAO),
      ),
    );

    for (const value of ['COMPRA', 'NEUTRO', 'VENDA']) {
      expect(recommendations.has(value)).toBe(true);
    }
  });
});
