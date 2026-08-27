import { readFileSync } from 'fs';
import { join } from 'path';

import { parse } from 'csv-parse/sync';

/**
 * Shape guard for the synthetic assets-CSV fixtures in this directory
 * (MARKET_DATA_US-5_T-1). The fixtures have no behaviour of their own — this
 * spec exists so that a later "tidy-up" of their deliberately odd shape (the
 * empty-ticker furniture row, the absent-vs-empty column distinction, the
 * still-Portuguese `DIVIDENDOS` and unrecognised `Z` risk rating) fails
 * loudly here instead of silently making the parser/import tasks' tests
 * vacuous. See README.md.
 *
 * Named `*.e2e-spec.ts` because that is the only Jest config in `apps/api`
 * that collects files under `test/` (the unit config has `rootDir: "src"`).
 * It reads files only — no database, no Nest application.
 */

const FIXTURE_DIR = __dirname;

const FIXTURE_NAMES = [
  'assets-full.csv',
  'assets-partial.csv',
  'assets-empty-cells.csv',
  'assets-bad-values.csv',
] as const;

type FixtureName = (typeof FIXTURE_NAMES)[number];

const FULL_HEADER = 'ticker,sector,subSector,investmentStyle,riskRating,assetType';

function readFixture(name: FixtureName): string {
  return readFileSync(join(FIXTURE_DIR, name), 'utf8');
}

function rowsOf(name: FixtureName): Record<string, string>[] {
  return parse(readFixture(name), {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
}

function headerOf(name: FixtureName): string[] {
  const firstLine = readFixture(name).split('\n')[0].replace(/\r$/, '');
  return firstLine.split(',');
}

describe('market-data assets CSV fixtures', () => {
  it.each(FIXTURE_NAMES)('%s exists and parses with csv-parse/sync', (name) => {
    expect(() => rowsOf(name)).not.toThrow();
    expect(rowsOf(name).length).toBeGreaterThan(0);
  });

  it("assets-full.csv's header is exactly the six column names in spec order", () => {
    const firstLine = readFixture('assets-full.csv').split('\n')[0].replace(/\r$/, '');
    expect(firstLine).toBe(FULL_HEADER);
  });

  it('assets-full.csv has at least one data row with an empty ticker', () => {
    const emptyTickerRows = rowsOf('assets-full.csv').filter((row) => row.ticker === '');
    expect(emptyTickerRows.length).toBeGreaterThan(0);
  });

  it("assets-partial.csv's header has only ticker and sector", () => {
    const header = headerOf('assets-partial.csv');

    expect(header).toEqual(expect.arrayContaining(['ticker', 'sector']));
    expect(header).not.toEqual(
      expect.arrayContaining(['investmentStyle', 'riskRating', 'assetType']),
    );
  });

  it('assets-empty-cells.csv has riskRating present but empty on at least one row', () => {
    const header = headerOf('assets-empty-cells.csv');
    expect(header).toContain('riskRating');

    const emptyRiskRatingRows = rowsOf('assets-empty-cells.csv').filter(
      (row) => row.riskRating === '',
    );
    expect(emptyRiskRatingRows.length).toBeGreaterThan(0);
  });

  it('assets-bad-values.csv contains an unrecognised riskRating and a Portuguese investmentStyle', () => {
    const rows = rowsOf('assets-bad-values.csv');

    expect(rows.some((row) => row.riskRating === 'Z')).toBe(true);
    expect(rows.some((row) => row.investmentStyle === 'DIVIDENDOS')).toBe(true);
  });
});
