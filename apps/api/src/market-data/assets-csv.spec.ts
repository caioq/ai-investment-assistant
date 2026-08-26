import { readFileSync } from 'fs';
import { join } from 'path';

import { parseAssetsCsv } from './assets-csv';

/**
 * MARKET_DATA_US-5_T-2 — header-driven column resolution.
 *
 * Reads the four synthetic fixtures from MARKET_DATA_US-5_T-1
 * (apps/api/test/fixtures/market-data/) to prove the parser reads columns
 * by header *name*, never by position, and preserves the absent-column vs
 * empty-cell distinction that US-5_T-4 depends on.
 */

const FIXTURE_DIR = join(
  __dirname,
  '..',
  '..',
  'test',
  'fixtures',
  'market-data',
);

function readFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), 'utf8');
}

describe('parseAssetsCsv', () => {
  it('parses assets-full.csv into one RawAssetRow per data row, resolved by header name', () => {
    const rows = parseAssetsCsv(readFixture('assets-full.csv'));

    // MDAS4: sector "REAL ESTATE", subSector "FUNDOS IMOBILIARIOS" — a
    // transposed mapping would swap these two.
    const mdas4 = rows.find((row) => row.ticker === 'MDAS4');
    expect(mdas4).toBeDefined();
    expect(mdas4?.sector).toBe('REAL ESTATE');
    expect(mdas4?.subSector).toBe('FUNDOS IMOBILIARIOS');
    expect(mdas4?.investmentStyle).toBe('ETF');
    expect(mdas4?.riskRating).toBe('C');
    expect(mdas4?.assetType).toBe('EQUITY');
  });

  it('keeps the empty-ticker furniture row in the output (skipping it is the service’s job)', () => {
    const rows = parseAssetsCsv(readFixture('assets-full.csv'));

    const emptyTickerRow = rows.find((row) => row.ticker === '');
    expect(emptyTickerRow).toBeDefined();
    expect(emptyTickerRow?.sector).toBe('NOTES');
  });

  it('yields undefined for columns absent from assets-partial.csv’s header', () => {
    const rows = parseAssetsCsv(readFixture('assets-partial.csv'));

    for (const row of rows) {
      expect(typeof row.sector).toBe('string');
      expect(row.investmentStyle).toBeUndefined();
      expect(row.riskRating).toBeUndefined();
      expect(row.assetType).toBeUndefined();
    }
  });

  it('yields an empty string, not undefined, for a present-but-empty cell', () => {
    const rows = parseAssetsCsv(readFixture('assets-empty-cells.csv'));

    const mdas1 = rows.find((row) => row.ticker === 'MDAS1');
    expect(mdas1).toBeDefined();
    expect(mdas1?.riskRating).toBe('');
  });

  it('throws on a CSV header missing ticker, rather than returning rows of undefined', () => {
    const csvWithoutTicker = 'sector,subSector\nFINANCIAL,BANCOS\n';

    expect(() => parseAssetsCsv(csvWithoutTicker)).toThrow();
  });
});
