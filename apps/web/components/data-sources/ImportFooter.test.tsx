import type { ValidationResult } from '@ai-investment-assistant/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImportFooter, type ImportFooterProps } from './ImportFooter';

function rows(count: number) {
  return Array.from({ length: count }, (_, index) => ({ ticker: `TCK${index + 1}` }));
}

function result(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    columns: ['ticker'],
    rows: rows(10),
    rowIssues: [],
    fileIssues: [],
    ...overrides,
  };
}

function renderFooter(overrides: Partial<ImportFooterProps> = {}) {
  const props: ImportFooterProps = {
    validation: result(),
    skipAvailable: true,
    skipErrors: true,
    onSkipErrorsChange: () => {},
    detailsComplete: true,
    buttonLabel: (count) => `Import ${count} assets`,
    importing: false,
    onImport: () => {},
    onCancel: () => {},
    ...overrides,
  };

  return render(<ImportFooter {...props} />);
}

const TWO_BAD_ROWS = result({
  rowIssues: [
    { row: 3, severity: 'error', message: 'row 3: unrecognised riskRating "ZZZ"' },
    { row: 7, severity: 'error', message: 'row 7: unrecognised riskRating "QQQ"' },
  ],
});

describe('ImportFooter', () => {
  it('offers the skip checkbox and counts only the rows that will be written', () => {
    renderFooter({ validation: TWO_BAD_ROWS });

    const checkbox = screen.getByRole('checkbox', { name: 'Skip 2 rows with errors' });
    expect(checkbox).toBeChecked();
    expect(screen.getByRole('button', { name: 'Import 8 assets' })).toBeEnabled();
  });

  it('blocks the import when skipping is available but unchecked', () => {
    renderFooter({ validation: TWO_BAD_ROWS, skipErrors: false });

    expect(screen.getByRole('button', { name: /^Import/ })).toBeDisabled();
    expect(screen.getByText('Fix errors or skip those rows to continue.')).toBeInTheDocument();
  });

  it('renders no checkbox and blocks on any row error when skipping is unavailable', () => {
    renderFooter({
      skipAvailable: false,
      validation: result({
        rows: rows(5),
        rowIssues: [{ row: 2, severity: 'error', message: 'row 2: invalid PRECO_TETO' }],
      }),
      buttonLabel: (count) => `Import ${count} positions`,
    });

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Import/ })).toBeDisabled();
    expect(
      screen.getByText('Fix the errors and re-upload — a wallet file is imported all at once.'),
    ).toBeInTheDocument();
  });

  it('blocks on a missing required column even with skip checked', () => {
    renderFooter({
      validation: result({
        rows: [],
        fileIssues: [{ severity: 'error', message: 'Missing required column: ticker' }],
      }),
    });

    expect(screen.getByRole('button', { name: /^Import/ })).toBeDisabled();
    expect(screen.getByText('Add the missing columns and re-upload.')).toBeInTheDocument();
  });

  it('blocks while the source detail fields are incomplete', () => {
    renderFooter({
      detailsComplete: false,
      detailsHint: 'Add the research house and effective date.',
    });

    expect(screen.getByRole('button', { name: /^Import/ })).toBeDisabled();
    expect(screen.getByText('Add the research house and effective date.')).toBeInTheDocument();
  });

  it('marks the button busy while importing and ignores repeat clicks', () => {
    const onImport = vi.fn();
    renderFooter({ importing: true, onImport, importingLabel: 'Importing' });

    const button = screen.getByRole('button', { name: /Importing/ });
    expect(button).toHaveAttribute('aria-busy', 'true');

    fireEvent.click(button);
    fireEvent.click(button);
    expect(onImport).not.toHaveBeenCalled();
  });

  it('imports once per click when the gate is open, and cancels', () => {
    const onImport = vi.fn();
    const onCancel = vi.fn();
    renderFooter({ onImport, onCancel });

    fireEvent.click(screen.getByRole('button', { name: 'Import 10 assets' }));
    expect(onImport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('toggles the skip state through its setter', () => {
    const onSkipErrorsChange = vi.fn();
    renderFooter({ validation: TWO_BAD_ROWS, onSkipErrorsChange });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Skip 2 rows with errors' }));
    expect(onSkipErrorsChange).toHaveBeenCalledWith(false);
  });

  it('disables the button with no hint before a file is attached', () => {
    renderFooter({ validation: null });

    expect(screen.getByRole('button', { name: /^Import/ })).toBeDisabled();
    expect(screen.queryByTestId('import-gate-hint')).not.toBeInTheDocument();
  });
});
