/** Today at UTC midnight — same helper as `portfolio.service.ts`'s and
 * `market-data.service.ts`'s own `todayAtUtcMidnight`, kept local here rather
 * than shared since each is a one-liner and none of the three modules import
 * each other. */
function todayAtUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Resolves `POST /advisor/recommended-portfolios/upload`'s optional
 * `effectiveDate` form field (an `@IsDateString()`-validated ISO string, see
 * `UploadWalletBodyDto`) to a UTC-midnight `Date`, matching
 * `RecommendedPortfolio.effectiveDate`'s `@db.Date` column — and defaults to
 * today when the field is omitted, per spec.md -> API Contract.
 *
 * Only the date portion of the input is kept (`YYYY-MM-DD`), even if a full
 * ISO timestamp with a time/offset component is supplied — the column is
 * date-only, so anything past the first 10 characters would be silently
 * truncated by Postgres anyway; doing it here makes that explicit rather than
 * accidentally depending on the caller's local timezone via `Date` parsing.
 */
export function parseEffectiveDate(raw: string | undefined): Date {
  if (raw === undefined) {
    return todayAtUtcMidnight();
  }

  const [year, month, day] = raw.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
