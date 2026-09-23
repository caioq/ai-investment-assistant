import type { CSSProperties } from 'react';
import {
  parseBrazilianNumber,
  type Issue,
  type IssueSeverity,
  type ValidationResult,
} from '@ai-investment-assistant/shared';

/**
 * The review of one parsed CSV: summary strip, required-column check,
 * file-level notices, the full preview table and the issues list.
 *
 * Deliberately presentational — it receives an already-validated
 * `ValidationResult` plus the source's required columns and knows nothing
 * about which source is being imported, who validated it, or what the import
 * button will do. `ImportPanel` owns all of that.
 */
export interface CsvReviewProps {
  result: ValidationResult;
  /** The source's required column names, in template order. */
  requiredColumns: string[];
}

type RowStatus = 'valid' | 'warning' | 'error';

const STATUS_LABEL: Record<RowStatus, string> = {
  valid: 'Valid',
  warning: 'Warning',
  error: 'Error',
};

const STATUS_COLOR: Record<RowStatus, string> = {
  valid: 'var(--emerald)',
  warning: 'var(--amber)',
  error: 'var(--red)',
};

const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const PREVIEW_MAX_HEIGHT = 320;

function severityStatus(severity: IssueSeverity): RowStatus {
  return severity === 'error' ? 'error' : 'warning';
}

/**
 * The worst issue on each row, keyed by the issue's 1-based `row`. A row with
 * both an error and a warning counts once, as an error — the summary strip
 * and the live region both count rows, not issues, so "Rows" always equals
 * Valid + Warnings + Errors.
 */
function statusByRow(rowIssues: Issue[]): Map<number, RowStatus> {
  const statuses = new Map<number, RowStatus>();
  for (const issue of rowIssues) {
    if (issue.row === undefined) continue;
    const status = severityStatus(issue.severity);
    if (status === 'error' || statuses.get(issue.row) === undefined) {
      statuses.set(issue.row, status);
    }
  }
  return statuses;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** "10 rows, 2 errors, 1 warning", with the zero parts left out. */
function announcement(rows: number, errors: number, warnings: number): string {
  const parts = [plural(rows, 'row')];
  if (errors > 0) parts.push(plural(errors, 'error'));
  if (warnings > 0) parts.push(plural(warnings, 'warning'));
  return parts.join(', ');
}

/**
 * A column is numeric when every non-empty cell in it parses as a number, so
 * a Brazilian-formatted `PRECO_TETO` right-aligns while `EMPRESA` doesn't.
 */
function isNumericColumn(rows: Array<Record<string, string>>, column: string): boolean {
  let seen = false;
  for (const row of rows) {
    const value = (row[column] ?? '').trim();
    if (value === '') continue;
    const parsed = parseBrazilianNumber(value);
    if (parsed === null || Number.isNaN(parsed)) return false;
    seen = true;
  }
  return seen;
}

function StatusPill({ status }: { status: RowStatus }) {
  return (
    <span
      data-testid="status-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 20,
        whiteSpace: 'nowrap',
        color: STATUS_COLOR[status],
        background: 'color-mix(in srgb, currentColor 14%, transparent)',
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function SummaryMetric({
  testId,
  label,
  value,
  color,
}: {
  testId: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        flex: 1,
        minWidth: 96,
        padding: '10px 14px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--bg-card-alt)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export function CsvReview({ result, requiredColumns }: CsvReviewProps) {
  const { columns, rows, rowIssues, fileIssues } = result;

  const statuses = statusByRow(rowIssues);
  const errorRows = [...statuses.values()].filter((status) => status === 'error').length;
  const warningRows = [...statuses.values()].filter((status) => status === 'warning').length;
  const validRows = rows.length - errorRows - warningRows;

  const presentColumns = new Set(columns.map((column) => column.trim().toLowerCase()));
  const numericColumns = new Set(columns.filter((column) => isNumericColumn(rows, column)));

  const sortedIssues = [...rowIssues].sort((a, b) => {
    const bySeverity = Number(b.severity === 'error') - Number(a.severity === 'error');
    return bySeverity !== 0 ? bySeverity : (a.row ?? 0) - (b.row ?? 0);
  });

  const cellStyle: CSSProperties = {
    padding: '6px 10px',
    borderBottom: '1px solid var(--border)',
    fontSize: 12,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  };

  const headerStyle: CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    padding: '8px 10px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    background: 'var(--bg-card-alt)',
    borderBottom: '1px solid var(--border)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* One polite region for the whole review — the spec allows exactly one. */}
      <div
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {announcement(rows.length, errorRows, warningRows)}
      </div>

      {/* 1. Summary strip */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <SummaryMetric
          testId="summary-rows"
          label="Rows"
          value={rows.length}
          color="var(--text-primary)"
        />
        <SummaryMetric
          testId="summary-valid"
          label="Valid"
          value={validRows}
          color="var(--emerald)"
        />
        <SummaryMetric
          testId="summary-warnings"
          label="Warnings"
          value={warningRows}
          color={warningRows > 0 ? 'var(--amber)' : 'var(--text-tertiary)'}
        />
        <SummaryMetric
          testId="summary-errors"
          label="Errors"
          value={errorRows}
          color={errorRows > 0 ? 'var(--red)' : 'var(--text-tertiary)'}
        />
      </div>

      {/* 2. Required columns — glyph *and* word, never colour alone. */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {requiredColumns.map((column) => {
          const present = presentColumns.has(column.trim().toLowerCase());
          return (
            <span
              key={column}
              data-testid={`column-check-${column}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: MONOSPACE,
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 20,
                color: present ? 'var(--emerald)' : 'var(--red)',
                background: 'color-mix(in srgb, currentColor 12%, transparent)',
              }}
            >
              <span>{present ? '✓' : '✕'}</span>
              <span>{column}</span>
              <span style={{ fontFamily: 'inherit' }}>{present ? 'present' : 'missing'}</span>
            </span>
          );
        })}
      </div>

      {/* 3. File-level issues */}
      {fileIssues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fileIssues.map((issue, index) => {
            const status = severityStatus(issue.severity);
            return (
              <div
                key={`${issue.message}-${index}`}
                data-testid="file-issue"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  fontSize: 13,
                  color: STATUS_COLOR[status],
                  border: '1px solid color-mix(in srgb, currentColor 35%, transparent)',
                  background: 'color-mix(in srgb, currentColor 8%, transparent)',
                }}
              >
                <StatusPill status={status} />
                <span style={{ color: 'var(--text-secondary)' }}>{issue.message}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Preview table — every row, sticky header, scrolls past 320px. */}
      <div
        style={{
          maxHeight: PREVIEW_MAX_HEIGHT,
          overflow: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 12,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th scope="col" style={{ ...headerStyle, textAlign: 'right' }}>
                #
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  style={{
                    ...headerStyle,
                    fontFamily: MONOSPACE,
                    textAlign: numericColumns.has(column) ? 'right' : 'left',
                  }}
                >
                  {column}
                </th>
              ))}
              <th scope="col" style={headerStyle}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rowNumber = index + 1;
              const status = statuses.get(rowNumber) ?? 'valid';
              return (
                <tr
                  key={rowNumber}
                  style={
                    status === 'error'
                      ? { background: 'color-mix(in srgb, var(--red) 8%, transparent)' }
                      : undefined
                  }
                >
                  <td style={{ ...cellStyle, textAlign: 'right', color: 'var(--text-tertiary)' }}>
                    {rowNumber}
                  </td>
                  {columns.map((column) => {
                    const value = (row[column] ?? '').trim();
                    return (
                      <td
                        key={column}
                        style={{
                          ...cellStyle,
                          fontFamily: MONOSPACE,
                          textAlign: numericColumns.has(column) ? 'right' : 'left',
                        }}
                      >
                        {value === '' ? '—' : value}
                      </td>
                    );
                  })}
                  <td style={cellStyle}>
                    <StatusPill status={status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. Issues list — errors first, then warnings, each sorted by row. */}
      {sortedIssues.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {sortedIssues.map((issue, index) => (
            <li
              key={`${issue.row}-${issue.message}-${index}`}
              data-testid="issue-item"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}
            >
              <StatusPill status={severityStatus(issue.severity)} />
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Row {issue.row}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
