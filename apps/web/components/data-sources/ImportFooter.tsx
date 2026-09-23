'use client';

import type { ValidationResult } from '@ai-investment-assistant/shared';

import { Button } from '../ui/Button';

/** The gate hints, verbatim from `specs/data-sources/spec.md` → Import gate. */
export const MISSING_COLUMNS_HINT = 'Add the missing columns and re-upload.';
export const SKIPPABLE_ERRORS_HINT = 'Fix errors or skip those rows to continue.';
export const UNSKIPPABLE_ERRORS_HINT =
  'Fix the errors and re-upload — a wallet file is imported all at once.';
export const WALLET_DETAILS_HINT = 'Add the research house and effective date.';
export const REPORT_DETAILS_HINT = 'Add title, publisher and publication date.';
/** Not in the spec's list: no rule there covers a file that parses to zero rows. */
export const NO_ROWS_HINT = 'This file has no rows to import.';

/**
 * Every validator prefixes its missing-required-column file issue with this
 * (`Missing required column: ticker` for assets, `Missing required
 * column(s): …` elsewhere — see `packages/shared/src/csv/validators.ts`), so
 * the gate can tell that blocking issue apart from a file-level warning
 * without a second prop restating what the validator already reported.
 */
const MISSING_COLUMN_PREFIX = 'Missing required column';

export interface ImportFooterProps {
  /** The attached file's validation result; `null` until a file is attached. */
  validation: ValidationResult | null;
  /**
   * Whether the *server* can honour skipping for this source. Assets and
   * holdings import valid rows and return the rest, so skipping is real; the
   * wallet endpoint rejects the whole file on one bad row, so it is `false`
   * there and no checkbox is rendered (spec → "Skip rows with errors" only
   * where the server can honour it). Never inferred from the validation.
   */
  skipAvailable: boolean;
  /** Owned by the panel; it seeds this `true`, per spec ("checked by default"). */
  skipErrors: boolean;
  onSkipErrorsChange: (skipErrors: boolean) => void;
  /** Whether this source's detail fields (wallet / report) are filled in. */
  detailsComplete: boolean;
  /** Shown when `detailsComplete` is false — `WALLET_DETAILS_HINT` or `REPORT_DETAILS_HINT`. */
  detailsHint?: string;
  /** Built from the rows that will actually be written, e.g. "Import 8 assets". */
  buttonLabel: (rowsToWrite: number) => string;
  /** In-flight label, e.g. "Importing" / "Processing". */
  importingLabel?: string;
  importing: boolean;
  onImport: () => void;
  onCancel: () => void;
}

function countErrorRows(validation: ValidationResult): number {
  const rowsWithErrors = new Set(
    validation.rowIssues
      .filter((issue) => issue.severity === 'error' && issue.row !== undefined)
      .map((issue) => issue.row),
  );
  return rowsWithErrors.size;
}

export function ImportFooter({
  validation,
  skipAvailable,
  skipErrors,
  onSkipErrorsChange,
  detailsComplete,
  detailsHint,
  buttonLabel,
  importingLabel = 'Importing',
  importing,
  onImport,
  onCancel,
}: ImportFooterProps) {
  const errorRows = validation ? countErrorRows(validation) : 0;
  const missingColumns = Boolean(
    validation?.fileIssues.some(
      (issue) => issue.severity === 'error' && issue.message.startsWith(MISSING_COLUMN_PREFIX),
    ),
  );
  const skipping = skipAvailable && skipErrors && errorRows > 0;
  const rowsToWrite = validation
    ? Math.max(0, validation.rows.length - (skipping ? errorRows : 0))
    : 0;

  // First unmet gate rule, in the order the spec lists them. `undefined`
  // means either the gate is open or no file is attached yet (nothing is
  // wrong with a file the user hasn't chosen).
  let hint: string | undefined;
  if (validation === null) {
    hint = undefined;
  } else if (missingColumns) {
    hint = MISSING_COLUMNS_HINT;
  } else if (errorRows > 0 && !skipAvailable) {
    hint = UNSKIPPABLE_ERRORS_HINT;
  } else if (errorRows > 0 && !skipErrors) {
    hint = SKIPPABLE_ERRORS_HINT;
  } else if (rowsToWrite < 1) {
    hint = NO_ROWS_HINT;
  } else if (!detailsComplete) {
    hint = detailsHint;
  }

  const gateOpen =
    validation !== null &&
    !missingColumns &&
    (errorRows === 0 || skipping) &&
    rowsToWrite >= 1 &&
    detailsComplete;

  const showSkipCheckbox = validation !== null && errorRows > 0 && !missingColumns && skipAvailable;

  function handleImport() {
    // Belt and suspenders, per CONVENTIONS.md → "Disable-and-guard a button
    // that triggers a paid API call": the button is disabled while in
    // flight, and the handler still refuses to fire a second upload.
    if (importing || !gateOpen) {
      return;
    }
    onImport();
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        paddingTop: 14,
        borderTop: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        {showSkipCheckbox ? (
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={skipErrors}
              onChange={(event) => onSkipErrorsChange(event.target.checked)}
            />
            {`Skip ${errorRows} ${errorRows === 1 ? 'row' : 'rows'} with errors`}
          </label>
        ) : null}
        {hint ? (
          <p
            data-testid="import-gate-hint"
            style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}
          >
            {hint}
          </p>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
        <Button variant="secondary" onClick={onCancel} disabled={importing}>
          Cancel
        </Button>
        <Button variant="navy" loading={importing} disabled={!gateOpen} onClick={handleImport}>
          {importing ? importingLabel : buttonLabel(rowsToWrite)}
        </Button>
      </div>
    </div>
  );
}
