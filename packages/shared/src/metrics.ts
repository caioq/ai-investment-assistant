/**
 * A single point in a portfolio (or benchmark) value time series, as
 * populated in `PortfolioValueSnapshot` / `BenchmarkSnapshot`.
 */
export interface PortfolioValuePoint {
  date: Date;
  value: number;
}

const TRADING_DAYS_PER_YEAR = 252;
const DAYS_PER_YEAR = 365.25;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Compound annual growth rate over `series`, assumed sorted ascending by
 * date: `(last / first) ** (1 / years) - 1`, where `years` is the actual
 * elapsed calendar span between the first and last date (day count /
 * 365.25) — not the number of data points. Snapshots are weekday-only, so
 * counting points would treat ~252 trading days as 252/365.25 of a year
 * and inflate every result.
 *
 * Returns 0 for a series shorter than two points and for a first value of
 * 0, never NaN/Infinity/a throw.
 */
export function cagr(series: PortfolioValuePoint[]): number {
  if (series.length < 2) return 0;

  const first = series[0];
  const last = series[series.length - 1];
  if (first.value === 0) return 0;

  const elapsedDays = (last.date.getTime() - first.date.getTime()) / MS_PER_DAY;
  const years = elapsedDays / DAYS_PER_YEAR;
  if (years <= 0) return 0;

  return Math.pow(last.value / first.value, 1 / years) - 1;
}

/**
 * Annualised standard deviation of daily returns (`vᵢ / vᵢ₋₁ - 1`), using
 * the sample (n-1) standard deviation scaled by `√252` (trading days per
 * year), which is what makes it comparable to published figures.
 *
 * Returns 0 for a series shorter than two points and for a flat series.
 */
export function volatility(series: PortfolioValuePoint[]): number {
  if (series.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const previous = series[i - 1].value;
    if (previous === 0) continue;
    returns.push(series[i].value / previous - 1);
  }
  if (returns.length < 2) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);

  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/**
 * Largest peak-to-trough decline over `series`, as a positive fraction,
 * computed by tracking the running maximum. Not `(max - min) / max`: that
 * formula reports a drawdown for a series that only ever rises, because
 * the minimum can precede the maximum.
 *
 * Returns 0 for a series shorter than two points and for a strictly
 * increasing (or flat) series.
 */
export function maxDrawdown(series: PortfolioValuePoint[]): number {
  if (series.length < 2) return 0;

  let runningMax = series[0].value;
  let worstDrawdown = 0;

  for (const point of series) {
    if (point.value > runningMax) {
      runningMax = point.value;
    }
    if (runningMax > 0) {
      const drawdown = (runningMax - point.value) / runningMax;
      if (drawdown > worstDrawdown) {
        worstDrawdown = drawdown;
      }
    }
  }

  return worstDrawdown;
}
