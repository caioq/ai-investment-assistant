import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock, apiFetchMultipartMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  apiFetchMultipartMock: vi.fn(),
}));

vi.mock('../../lib/api-client', () => {
  class ApiError extends Error {
    constructor(
      readonly status: number,
      readonly body: unknown,
    ) {
      super(`API request failed with status ${status}`);
    }
  }
  return { apiFetch: apiFetchMock, apiFetchMultipart: apiFetchMultipartMock, ApiError };
});

import { createHoldingsImportSource, ImportPanel } from './ImportPanel';

const CLEAN = ['ticker,quantity,avgPrice', 'AAAA3,10,5.5', 'BBBB3,20,7'].join('\n');
const UNKNOWN = ['ticker,quantity,avgPrice', 'AAAA3,10,5.5', 'ZZZZ3,20,7'].join('\n');
const BAD_QTY = ['ticker,quantity,avgPrice', 'AAAA3,"1.234,56",5.5'].join('\n');
const REAL_EXPORT = [
  Array.from({ length: 23 }, (_, i) => `h${i}`).join(','),
  Array.from({ length: 23 }, (_, i) => `v${i}`).join(','),
  Array.from({ length: 23 }, (_, i) => `w${i}`).join(','),
].join('\n');

function csv(content: string) {
  return new File([content], 'holdings.csv', { type: 'text/csv' });
}
function fileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}
async function attach(file: File) {
  fireEvent.change(fileInput(), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByTestId('summary-rows')).toBeInTheDocument());
}
function importButton() {
  return screen.getByRole('button', { name: /^Import \d+ holding/ });
}
function panel(known: string[]) {
  return <ImportPanel source={createHoldingsImportSource(known)} />;
}

describe('ImportPanel — holdings', () => {
  afterEach(() => vi.clearAllMocks());

  it('reviews a file without any network call and flags a 1.234,56 quantity as an error', async () => {
    render(panel(['AAAA3', 'BBBB3']));
    await attach(csv(BAD_QTY));

    expect(screen.getAllByTestId('status-pill').some((p) => p.textContent === 'Error')).toBe(true);
    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(apiFetchMultipartMock).not.toHaveBeenCalled();
  });

  it('renders a 23-column export as row errors and disables the import', async () => {
    render(panel(['AAAA3']));
    await attach(csv(REAL_EXPORT));

    expect(screen.getAllByText(/expected 3 columns .* got 23/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /^Import/ })).toBeDisabled();
  });

  it('warns once about a ticker missing from knownTickers and still counts the row', async () => {
    render(panel(['AAAA3']));
    await attach(csv(UNKNOWN));

    expect(screen.getAllByText(/ZZZZ3 is not in the asset master/)).toHaveLength(1);
    expect(importButton()).toHaveTextContent('Import 2 holdings');
  });

  it('clears the warning once the ticker is known, with the same file', async () => {
    const { rerender } = render(panel(['AAAA3']));
    await attach(csv(UNKNOWN));
    expect(screen.getAllByText(/ZZZZ3 is not in the asset master/)).toHaveLength(1);

    // Re-attach the same file after the summary refresh supplied the new ticker list.
    rerender(panel(['AAAA3', 'ZZZZ3']));
    await attach(csv(UNKNOWN));
    expect(screen.queryByText(/is not in the asset master/)).not.toBeInTheDocument();
  });

  it('posts multipart to the holdings endpoint and names added and updated counts', async () => {
    apiFetchMultipartMock.mockResolvedValue({ created: 1, updated: 1, errors: [] });
    apiFetchMock.mockResolvedValue({});
    const onImported = vi.fn();
    render(
      <ImportPanel
        source={createHoldingsImportSource(['AAAA3', 'BBBB3'])}
        onImported={onImported}
      />,
    );
    await attach(csv(CLEAN));

    fireEvent.click(importButton());

    await waitFor(() =>
      expect(screen.getByText('Imported 2 holdings — 1 added, 1 updated.')).toBeInTheDocument(),
    );
    expect(apiFetchMultipartMock.mock.calls[0][0]).toBe('/portfolio/holdings/upload-csv');
    const logBody = JSON.parse(apiFetchMock.mock.calls[0][1].body);
    expect(logBody).toMatchObject({ source: 'HOLDINGS', records: 2 });
    expect(onImported).toHaveBeenCalled();
  });

  it('states that positions are added or updated and never implies replacing or deleting', () => {
    render(panel([]));
    const text = document.body.textContent ?? '';

    expect(text).toMatch(/added or updated/i);
    expect(text).toMatch(
      /Three columns, in this order: ticker, quantity, avgPrice\. Plain decimal numbers\./,
    );
    expect(text).not.toMatch(/replac|delet|overwrit|wipe|shared/i);
  });
});
