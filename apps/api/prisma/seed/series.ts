/**
 * Pure, deterministic series generators for the demo seed (see
 * specs/demo-seed/spec.md -> "Series generation"). No Prisma dependency, so they
 * can be unit tested without a database.
 *
 * Every date is a weekday at UTC midnight, the same shape `todayAtUtcMidnight()`
 * produces in `PortfolioService` and `MarketDataService`.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Truncates a date to UTC midnight of the same UTC calendar day. */
function atUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * `count` weekday dates at UTC midnight in ascending order. The last one is
 * `end` itself if it's a weekday, otherwise the last weekday before it.
 */
export function weekdaysEndingAt(end: Date, count: number): Date[] {
  const dates: Date[] = [];
  let cursor = atUtcMidnight(end);
  while (dates.length < count) {
    if (!isWeekend(cursor)) dates.push(cursor);
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }
  return dates.reverse();
}

/** 32-bit FNV-1a hash, used to turn a string key into a PRNG seed. */
function hashKey(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: a tiny seeded PRNG returning floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample via Box-Muller. */
function normal(random: () => number): number {
  const u1 = 1 - random(); // (0, 1], so log() never sees 0
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * A reproducible random walk over `dates`, seeded from `key`. It's generated
 * backwards from `endValue` with multiplicative (log-normal) steps, so the last
 * close is exactly `endValue` and every close stays above zero.
 */
export function randomWalk({
  key,
  endValue,
  dates,
  dailyVolatility,
}: {
  key: string;
  endValue: number;
  dates: Date[];
  dailyVolatility: number;
}): { date: Date; close: number }[] {
  const random = mulberry32(hashKey(key));
  const closes = new Array<number>(dates.length);
  for (let i = dates.length - 1; i >= 0; i--) {
    closes[i] =
      i === dates.length - 1
        ? endValue
        : closes[i + 1] / Math.exp(dailyVolatility * normal(random));
  }
  return dates.map((date, i) => ({ date, close: closes[i] }));
}

/**
 * A CDI-shaped index: `start` on the first date, compounded once per date at
 * the daily rate `(1 + annualRatePct/100)^(1/252) - 1`, the same shape
 * `MarketDataService.syncCdi` stores.
 */
export function compoundedIndex({
  dates,
  annualRatePct,
  start = 100,
}: {
  dates: Date[];
  annualRatePct: number;
  start?: number;
}): { date: Date; value: number }[] {
  const dailyRate = Math.pow(1 + annualRatePct / 100, 1 / 252) - 1;
  let value = start;
  return dates.map((date, i) => {
    if (i > 0) value *= 1 + dailyRate;
    return { date, value };
  });
}
