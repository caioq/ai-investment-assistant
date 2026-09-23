import { describe, expect, it } from 'vitest';

import { findColumn, parseCsv } from './parse-csv';

describe('parseCsv', () => {
  it('returns the columns and rows keyed by header name', () => {
    const result = parseCsv('ticker,sector\nPETR4,Energia\nVALE3,Materiais');

    expect(result.columns).toEqual(['ticker', 'sector']);
    expect(result.rows).toEqual([
      { ticker: 'PETR4', sector: 'Energia' },
      { ticker: 'VALE3', sector: 'Materiais' },
    ]);
  });

  it('keeps a comma inside a quoted field as part of the value', () => {
    const result = parseCsv('a,b,c\n1,"b,c",3');

    expect(result.rows[0]).toEqual({ a: '1', b: 'b,c', c: '3' });
  });

  it('unescapes "" inside a quoted field', () => {
    const result = parseCsv('note\n"he said ""hi"""');

    expect(result.rows[0]).toEqual({ note: 'he said "hi"' });
  });

  it('trims headers and values', () => {
    const result = parseCsv(' ticker , sector \n PETR4 , Energia ');

    expect(result.columns).toEqual(['ticker', 'sector']);
    expect(result.rows).toEqual([{ ticker: 'PETR4', sector: 'Energia' }]);
  });

  it('tolerates \\r\\n line endings and a trailing blank line', () => {
    const result = parseCsv('ticker,sector\r\nPETR4,Energia\r\n');

    expect(result.columns).toEqual(['ticker', 'sector']);
    expect(result.rows).toEqual([{ ticker: 'PETR4', sector: 'Energia' }]);
  });

  it('keeps a newline inside a quoted field', () => {
    const result = parseCsv('ticker,note\nPETR4,"line one\nline two"');

    expect(result.rows).toEqual([{ ticker: 'PETR4', note: 'line one\nline two' }]);
  });

  it('yields no rows for a header-only file or an empty string', () => {
    expect(parseCsv('ticker,sector').rows).toEqual([]);
    expect(parseCsv('').rows).toEqual([]);
    expect(parseCsv('').columns).toEqual([]);
  });

  it('pads a short row with "" instead of throwing', () => {
    const result = parseCsv('ticker,sector,style\nPETR4,Energia');

    expect(result.rows).toEqual([{ ticker: 'PETR4', sector: 'Energia', style: '' }]);
  });

  it('ignores cells beyond the last header', () => {
    const result = parseCsv('ticker,sector\nPETR4,Energia,extra');

    expect(result.rows).toEqual([{ ticker: 'PETR4', sector: 'Energia' }]);
  });
});

describe('findColumn', () => {
  it("resolves a wanted name case-insensitively to the file's own spelling", () => {
    expect(findColumn(['Ticker'], 'ticker')).toBe('Ticker');
    expect(findColumn(['Ticker', 'Sector'], 'SECTOR')).toBe('Sector');
  });

  it('returns undefined when no column matches', () => {
    expect(findColumn(['Ticker'], 'sector')).toBeUndefined();
  });
});
