import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ValidationResult } from '@ai-investment-assistant/shared';
import { CsvReview } from './CsvReview';

/**
 * 10 rows, 2 of them carrying an error and 1 a warning — the fixture the
 * task's test field describes. Row 4's `sector` is empty so the preview's
 * "—" placeholder can be asserted.
 */
function buildResult(): ValidationResult {
  const rows = Array.from({ length: 10 }, (_, index) => ({
    ticker: `TCK${index + 1}`,
    sector: index === 3 ? '' : 'Financials',
    riskRating: 'AAA',
  }));

  return {
    columns: ['ticker', 'sector', 'riskRating'],
    rows,
    rowIssues: [
      { row: 5, severity: 'warning', message: 'row 5: TCK5 is not in the asset master' },
      { row: 7, severity: 'error', message: 'row 7: unrecognised riskRating "ZZZ"' },
      { row: 3, severity: 'error', message: 'row 3: unrecognised riskRating "XX"' },
    ],
    fileIssues: [],
  };
}

const REQUIRED_COLUMNS = ['ticker', 'assetType'];

describe('CsvReview', () => {
  it('summarises rows, valid rows, warnings and errors', () => {
    render(<CsvReview result={buildResult()} requiredColumns={REQUIRED_COLUMNS} />);

    expect(screen.getByTestId('summary-rows')).toHaveTextContent('10');
    expect(screen.getByTestId('summary-valid')).toHaveTextContent('7');
    expect(screen.getByTestId('summary-warnings')).toHaveTextContent('1');
    expect(screen.getByTestId('summary-errors')).toHaveTextContent('2');
  });

  it('marks a present required column with a check and a missing one with a cross', () => {
    render(<CsvReview result={buildResult()} requiredColumns={REQUIRED_COLUMNS} />);

    const present = screen.getByTestId('column-check-ticker');
    expect(present).toHaveTextContent('✓');
    expect(present).toHaveTextContent('ticker');

    const missing = screen.getByTestId('column-check-assetType');
    expect(missing).toHaveTextContent('✕');
    expect(missing).toHaveTextContent('assetType');
  });

  it('renders every row of the preview table with real headers and a placeholder for empty cells', () => {
    render(<CsvReview result={buildResult()} requiredColumns={REQUIRED_COLUMNS} />);

    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual([
      '#',
      'ticker',
      'sector',
      'riskRating',
      'Status',
    ]);

    const bodyRows = table.querySelectorAll('tbody tr');
    expect(bodyRows).toHaveLength(10);

    const fourthRowCells = within(bodyRows[3] as HTMLElement).getAllByRole('cell');
    expect(fourthRowCells[2]).toHaveTextContent('—');
  });

  it('lists errors before warnings, each naming its row number', () => {
    render(<CsvReview result={buildResult()} requiredColumns={REQUIRED_COLUMNS} />);

    const issues = screen.getAllByTestId('issue-item').map((item) => item.textContent ?? '');
    expect(issues).toHaveLength(3);
    expect(issues[0]).toContain('Row 3');
    expect(issues[1]).toContain('Row 7');
    expect(issues[2]).toContain('Row 5');
    expect(issues[0]).toContain('Error');
    expect(issues[1]).toContain('Error');
    expect(issues[2]).toContain('Warning');
  });

  it('announces the parse result through one polite live region', () => {
    const { container } = render(
      <CsvReview result={buildResult()} requiredColumns={REQUIRED_COLUMNS} />,
    );

    const regions = container.querySelectorAll('[aria-live="polite"]');
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveTextContent('10 rows, 2 errors, 1 warning');
  });

  it('omits the zero parts of the announcement and pluralises correctly', () => {
    const result: ValidationResult = {
      columns: ['ticker'],
      rows: [{ ticker: 'PETR4' }],
      rowIssues: [],
      fileIssues: [],
    };
    const { container } = render(<CsvReview result={result} requiredColumns={['ticker']} />);

    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('1 row');
  });

  it('never conveys status by colour alone — every status pill carries its word', () => {
    render(<CsvReview result={buildResult()} requiredColumns={REQUIRED_COLUMNS} />);

    const pills = screen.getAllByTestId('status-pill');
    expect(pills.length).toBeGreaterThan(0);
    for (const pill of pills) {
      expect(['Valid', 'Warning', 'Error']).toContain(pill.textContent);
    }
  });

  it('renders one notice per file-level issue', () => {
    const result = buildResult();
    result.fileIssues = [
      { severity: 'warning', message: 'ALOCACAO_SUGERIDA totals 92%, not 100%' },
    ];
    render(<CsvReview result={result} requiredColumns={REQUIRED_COLUMNS} />);

    const notices = screen.getAllByTestId('file-issue');
    expect(notices).toHaveLength(1);
    expect(notices[0]).toHaveTextContent('ALOCACAO_SUGERIDA totals 92%, not 100%');
  });
});
