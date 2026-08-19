import { parseBrazilianNumber } from './brazilian-number';

describe('parseBrazilianNumber', () => {
  describe('currency-prefixed values', () => {
    const cases: [string, number][] = [
      ['R$ 40,99', 40.99],
      // The thousands case: no real export exercises it today (every published
      // price is under R$ 100), but an implementation that only strips ','
      // would turn this into 1.23456 or NaN.
      ['R$ 1.234,56', 1234.56],
    ];

    it.each(cases)('parses %p as %p', (raw, expected) => {
      expect(parseBrazilianNumber(raw)).toBe(expected);
    });
  });

  describe('percent-suffixed values', () => {
    const cases: [string, number][] = [
      ['8,00%', 8],
      ['-6,71%', -6.71],
      ['0,00%', 0],
    ];

    it.each(cases)('parses %p as %p', (raw, expected) => {
      expect(parseBrazilianNumber(raw)).toBe(expected);
    });
  });

  describe('absent values', () => {
    // null, never 0 — an absent column arrives this way, and 0 would read as a
    // real published value ("allocate nothing" instead of "not published").
    const cases: (string | undefined)[] = ['', '   ', undefined];

    it.each(cases)('returns null (not 0) for %p', (raw) => {
      expect(parseBrazilianNumber(raw)).toBeNull();
    });
  });

  describe('non-numeric values', () => {
    // NaN, distinguishable from null, so a caller can reject the row rather
    // than storing a silent null.
    const cases: string[] = ['abc', 'R$'];

    it.each(cases)('returns NaN (not null) for %p', (raw) => {
      const result = parseBrazilianNumber(raw);
      expect(result).toBeNaN();
      expect(result).not.toBeNull();
    });
  });

  it('does not turn a plain en-US "12.5" into 125', () => {
    // Chosen behaviour: a '.' is only treated as a thousands separator when it
    // actually groups digits in threes (1.234, 1.234.567). "12.5" doesn't, so
    // the dot is kept as a decimal point. The exports never produce this form;
    // the point is that it can never silently inflate a value by 10x.
    expect(parseBrazilianNumber('12.5')).toBe(12.5);
  });
});
