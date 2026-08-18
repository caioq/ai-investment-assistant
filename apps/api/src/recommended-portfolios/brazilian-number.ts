/**
 * A `.` is only a thousands separator when it actually groups digits in threes
 * (`1.234`, `1.234.567`). Anything else — `12.5` — is left alone and read as an
 * en-US decimal point, so a value that never came from these exports can't be
 * silently inflated tenfold.
 */
const THOUSANDS_GROUPED = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/;

/**
 * Parses a value as published in a research house's wallet export — Brazilian
 * formatting: currency prefix (`"R$ 40,99"`), percent suffix (`"8,00%"`),
 * negatives (`"-6,71%"`), `,` decimal separator and `.` thousands separator
 * (`"R$ 1.234,56"` → `1234.56`). `Number("8,00%")` is `NaN`, so every row of
 * every real export needs this before any numeric parse.
 *
 * Three outcomes, deliberately distinguishable from one another:
 * - a `number` — the value parsed;
 * - `null` — the value is absent (empty, whitespace-only, or `undefined`, which
 *   is how a column the wallet doesn't publish arrives). Never `0`, since `0` is
 *   itself a valid published value and would read as "allocate nothing" rather
 *   than "not published";
 * - `NaN` — the value is present but isn't a number after normalisation
 *   (`"abc"`, `"R$"`). Check with `Number.isNaN(result)`; callers reject the
 *   whole row on this rather than storing a silent `null`.
 */
export function parseBrazilianNumber(raw: string | undefined): number | null {
  if (raw === undefined) {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }

  // Strip the currency prefix, the percent suffix and any inner whitespace
  // (including the non-breaking space some exports put after "R$").
  const stripped = trimmed
    .replace(/R\$/gi, '')
    .replace(/%/g, '')
    .replace(/[\s\u00a0]/g, '');

  if (stripped === '') {
    return NaN;
  }

  // Thousands separators go first, then the decimal comma becomes a point —
  // doing it the other way round would leave two `.` in `"1.234,56"`.
  const normalised = (
    THOUSANDS_GROUPED.test(stripped) ? stripped.replace(/\./g, '') : stripped
  ).replace(',', '.');

  // Number('') is 0 and Number('  ') is 0, both already excluded above; what's
  // left that Number() would still accept loosely (hex, Infinity) isn't a
  // published value, so require a plain decimal shape.
  if (!/^-?\d*\.?\d+$/.test(normalised)) {
    return NaN;
  }

  return Number(normalised);
}
