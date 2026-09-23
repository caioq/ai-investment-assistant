import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FileChip } from './FileChip';

describe('FileChip', () => {
  it('renders the file name, meta line and format tile', () => {
    render(
      <FileChip
        name="holdings.csv"
        meta="12 KB · 24 rows · 5 columns"
        kind="csv"
        onReplace={() => {}}
        onRemove={() => {}}
      />,
    );

    expect(screen.getByText('holdings.csv')).toBeInTheDocument();
    expect(screen.getByText('12 KB · 24 rows · 5 columns')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  it('calls onReplace and onRemove from its accessibly-named actions', () => {
    const onReplace = vi.fn();
    const onRemove = vi.fn();
    render(
      <FileChip
        name="report.pdf"
        meta="240 KB · 8 pages"
        kind="pdf"
        onReplace={onReplace}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Replace report.pdf' }));
    expect(onReplace).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Remove report.pdf' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
