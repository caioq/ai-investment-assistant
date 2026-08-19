import { parseEffectiveDate } from './wallet-date';

/**
 * RECOMMENDED_PORTFOLIOS_US-1_T-6 — `effectiveDate` parses to UTC midnight
 * (matching `RecommendedPortfolio.effectiveDate`'s `@db.Date` column) and
 * defaults to today when omitted, per spec.md -> API Contract.
 */
describe('parseEffectiveDate', () => {
  it('parses a date-only string to UTC midnight on that date', () => {
    const result = parseEffectiveDate('2026-03-15');

    expect(result.toISOString()).toBe('2026-03-15T00:00:00.000Z');
  });

  it('parses a full ISO timestamp string by keeping only its date portion', () => {
    const result = parseEffectiveDate('2026-03-15T23:59:59.000Z');

    expect(result.toISOString()).toBe('2026-03-15T00:00:00.000Z');
  });

  it('defaults to today at UTC midnight when omitted', () => {
    const now = new Date();
    const expected = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const result = parseEffectiveDate(undefined);

    expect(result.toISOString()).toBe(expected.toISOString());
  });
});
