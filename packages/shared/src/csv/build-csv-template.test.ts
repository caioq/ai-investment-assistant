import { describe, expect, it } from 'vitest';

import { buildCsvTemplate, csvTemplateFileName } from './build-csv-template';
import { ASSETS_COLUMNS, HOLDINGS_COLUMNS, WALLET_COLUMNS } from './validators';

describe('buildCsvTemplate', () => {
  it('emits the assets required + optional columns as one comma-joined line', () => {
    expect(buildCsvTemplate('assets')).toBe(
      [...ASSETS_COLUMNS.required, ...ASSETS_COLUMNS.optional].join(','),
    );
  });

  it('emits the holdings columns from the shared definitions', () => {
    expect(buildCsvTemplate('holdings')).toBe('ticker,quantity,avgPrice');
    expect(buildCsvTemplate('holdings')).toBe(
      [...HOLDINGS_COLUMNS.required, ...HOLDINGS_COLUMNS.optional].join(','),
    );
  });

  it('includes the DY_ column for the dividends wallet but not for small caps', () => {
    const dividends = buildCsvTemplate('wallet', 'DIVIDENDS');
    const smallCaps = buildCsvTemplate('wallet', 'SMALL_CAPS');

    expect(dividends).toContain('DY_2026');
    expect(smallCaps).not.toContain('DY_2026');
    expect(smallCaps).toContain('DY_2025');
    expect(dividends).not.toBe(smallCaps);
  });

  it("prefixes a column name beginning with =, +, - or @ with ' (CSV injection)", () => {
    // Stand a renamed column definition up in place of a real one: the escaping
    // has to happen where the template is generated, not in a helper the
    // generator might forget to call.
    const original = WALLET_COLUMNS.DIVIDENDS;
    WALLET_COLUMNS.DIVIDENDS = {
      required: ['=cmd|calc'],
      optional: ['+1', '-2', '@x', 'plain'],
    };

    try {
      expect(buildCsvTemplate('wallet', 'DIVIDENDS')).toBe("'=cmd|calc,'+1,'-2,'@x,plain");
    } finally {
      WALLET_COLUMNS.DIVIDENDS = original;
    }
  });

  it('produces exactly one line with no trailing comma for every source', () => {
    const templates = [
      buildCsvTemplate('assets'),
      buildCsvTemplate('holdings'),
      buildCsvTemplate('wallet', 'OVERALL_RECOMMENDED'),
      buildCsvTemplate('wallet', 'DIVIDENDS'),
      buildCsvTemplate('wallet', 'SMALL_CAPS'),
    ];

    for (const template of templates) {
      expect(template.split('\n')).toHaveLength(1);
      expect(template.endsWith(',')).toBe(false);
      expect(template.startsWith(',')).toBe(false);
      expect(template.length).toBeGreaterThan(0);
    }
  });
});

describe('csvTemplateFileName', () => {
  it('names the file after the source, and after the wallet type for wallets', () => {
    expect(csvTemplateFileName('assets')).toBe('assets-template.csv');
    expect(csvTemplateFileName('holdings')).toBe('holdings-template.csv');
    expect(csvTemplateFileName('wallet', 'DIVIDENDS')).toBe('wallet-dividends-template.csv');
    expect(csvTemplateFileName('wallet', 'SMALL_CAPS')).toBe('wallet-small-caps-template.csv');
  });
});
