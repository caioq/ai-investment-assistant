/**
 * "Sep 12, 2026" — the date format every `/data-sources` meta line and note
 * uses (the design prototype's `fmtDate`). Formatted in **UTC**, not the
 * viewer's zone: `lastImportAt` is a timestamp but `effectiveDate`/
 * `publishedAt` are dates serialized as UTC midnight, which a
 * negative-offset local zone would render a day early.
 */
export function formatSourceDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}
