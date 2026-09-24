// Unit-style spec (no database, no Nest app) for the demo seed's pure price-series
// generator. It lives under test/ and is named *.e2e-spec.ts because
// test/jest-e2e.json is the only Jest config that reaches this directory
// (see CONVENTIONS.md -> Backend -> Testing).
import { compoundedIndex, randomWalk, weekdaysEndingAt } from '../../prisma/seed/series';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe('demo seed series generator', () => {
  describe('weekdaysEndingAt', () => {
    it('ends on the last weekday on or before a Saturday and skips weekends', () => {
      const dates = weekdaysEndingAt(utc(2026, 9, 26), 5);

      expect(dates).toEqual([
        utc(2026, 9, 21),
        utc(2026, 9, 22),
        utc(2026, 9, 23),
        utc(2026, 9, 24),
        utc(2026, 9, 25),
      ]);
      for (const date of dates) {
        expect([0, 6]).not.toContain(date.getUTCDay());
        expect(date.getUTCHours()).toBe(0);
        expect(date.getUTCMinutes()).toBe(0);
        expect(date.getUTCSeconds()).toBe(0);
        expect(date.getUTCMilliseconds()).toBe(0);
      }
    });
  });

  describe('randomWalk', () => {
    const yearOfWeekdays = () => weekdaysEndingAt(utc(2026, 9, 25), 250);

    it('is reproducible for the same key and differs for a different key', () => {
      const dates = yearOfWeekdays();
      const input = { key: 'PETR4', endValue: 38.5, dates, dailyVolatility: 0.02 };

      const first = randomWalk(input);
      const second = randomWalk(input);
      const other = randomWalk({ ...input, key: 'VALE3' });

      expect(second).toEqual(first);
      expect(other).not.toEqual(first);
    });

    it('covers every date, ends exactly at endValue and stays positive', () => {
      const dates = yearOfWeekdays();
      const endValue = 38.47;
      const walk = randomWalk({ key: 'ITUB4', endValue, dates, dailyVolatility: 0.02 });

      expect(walk).toHaveLength(250);
      expect(walk[walk.length - 1].close).toBe(endValue);
      for (const point of walk) {
        expect(point.close).toBeGreaterThan(0);
      }
      expect(walk.map((point) => point.date)).toEqual(dates);
    });
  });

  describe('compoundedIndex', () => {
    it('starts at 100, strictly increases and compounds to about 110.5 over 252 days', () => {
      const dates = weekdaysEndingAt(utc(2026, 9, 25), 252);
      const index = compoundedIndex({ dates, annualRatePct: 10.5 });

      expect(index).toHaveLength(252);
      expect(index[0].value).toBe(100);
      for (let i = 1; i < index.length; i++) {
        expect(index[i].value).toBeGreaterThan(index[i - 1].value);
      }
      expect(index.map((point) => point.date)).toEqual(dates);
      expect(Math.abs(index[index.length - 1].value - 110.5)).toBeLessThan(0.1);
    });
  });
});
