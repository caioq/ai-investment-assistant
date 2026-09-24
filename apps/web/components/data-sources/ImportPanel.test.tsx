import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock, apiFetchMultipartMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  apiFetchMultipartMock: vi.fn(),
}));

vi.mock('../../lib/api-client', () => {
  class ApiError extends Error {
    readonly status: number;
    readonly body: unknown;

    constructor(status: number, body: unknown) {
      super(`API request failed with status ${status}`);
      this.name = 'ApiError';
      this.status = status;
      this.body = body;
    }
  }

  return {
    apiFetch: apiFetchMock,
    apiFetchMultipart: apiFetchMultipartMock,
    ApiError,
  };
});

import { ApiError } from '../../lib/api-client';
import { ImportPanel, createAssetsImportSource, type ImportPanelSourceConfig } from './ImportPanel';

/** 10 rows, 2 with an unrecognised `riskRating` (rows 3 and 6). */
const ASSETS_CSV = [
  'ticker,sector,riskRating',
  'AAAA3,Financials,AAA',
  'BBBB3,Financials,AA',
  'CCCC3,Financials,ZZZ',
  'DDDD3,Financials,A',
  'EEEE3,Financials,BBB',
  'FFFF3,Financials,ZZZ',
  'GGGG3,Financials,BB',
  'HHHH3,Financials,B',
  'IIII3,Financials,CCC',
  'JJJJ3,Financials,D',
].join('\n');

function makeCsvFile(content = ASSETS_CSV, name = 'assets.csv') {
  return new File([content], name, { type: 'text/csv' });
}

function getFileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

async function attach(file: File) {
  fireEvent.change(getFileInput(), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByTestId('summary-rows')).toBeInTheDocument());
}

function renderAssetsPanel(overrides: Partial<ImportPanelSourceConfig> = {}) {
  const source: ImportPanelSourceConfig = { ...createAssetsImportSource([]), ...overrides };
  const onImported = vi.fn();
  render(<ImportPanel source={source} onImported={onImported} />);
  return { source, onImported };
}

describe('ImportPanel — assets', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('parses and validates on attach, with no network call', async () => {
    renderAssetsPanel();

    await attach(makeCsvFile());

    expect(screen.getByTestId('summary-rows')).toHaveTextContent('10');
    expect(screen.getByTestId('summary-valid')).toHaveTextContent('8');
    expect(screen.getByTestId('summary-errors')).toHaveTextContent('2');
    expect(apiFetchMultipartMock).not.toHaveBeenCalled();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('imports by posting the original file, multipart, to the assets endpoint', async () => {
    apiFetchMultipartMock.mockResolvedValue({ created: 6, updated: 2, errors: [] });
    apiFetchMock.mockResolvedValue({});
    renderAssetsPanel();

    const file = makeCsvFile();
    await attach(file);

    const button = screen.getByRole('button', { name: 'Import 8 assets' });
    fireEvent.click(button);

    await waitFor(() => expect(apiFetchMultipartMock).toHaveBeenCalledTimes(1));
    const [path, formData] = apiFetchMultipartMock.mock.calls[0];
    expect(path).toBe('/market-data/assets/import');
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get('file')).toBe(file);
  });

  it('on a partial success: clears the file, logs the import, refreshes the summary, and shows the banner', async () => {
    apiFetchMultipartMock.mockResolvedValue({
      created: 6,
      updated: 2,
      errors: ['row 3: unrecognised riskRating "ZZZ"', 'row 6: unrecognised riskRating "ZZZ"'],
    });
    apiFetchMock.mockResolvedValue({});
    const { onImported } = renderAssetsPanel();

    await attach(makeCsvFile());
    fireEvent.click(screen.getByRole('button', { name: 'Import 8 assets' }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));
    const [path, init] = apiFetchMock.mock.calls[0];
    expect(path).toBe('/data-sources/imports');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      source: 'ASSETS',
      fileName: 'assets.csv',
      records: 8,
      status: 'IMPORTED',
      errors: ['row 3: unrecognised riskRating "ZZZ"', 'row 6: unrecognised riskRating "ZZZ"'],
    });

    // File cleared: the drop zone is back, not the file chip / review.
    expect(screen.queryByTestId('summary-rows')).not.toBeInTheDocument();
    expect(getFileInput()).not.toBeNull();

    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('Imported 8 assets into the asset master.');
    expect(banner).toHaveTextContent('2 rows with errors skipped.');

    expect(onImported).toHaveBeenCalledTimes(1);
  });

  it('on a rejected upload: keeps the file and review, shows an error banner, and logs a FAILED row', async () => {
    apiFetchMultipartMock.mockRejectedValue(
      new ApiError(500, { statusCode: 500, message: 'Internal Server Error' }),
    );
    apiFetchMock.mockResolvedValue({});
    renderAssetsPanel();

    await attach(makeCsvFile());
    fireEvent.click(screen.getByRole('button', { name: 'Import 8 assets' }));

    const banner = await screen.findByRole('alert');
    expect(banner).toBeInTheDocument();

    // The file and its review stay on screen.
    expect(screen.getByTestId('summary-rows')).toHaveTextContent('10');

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));
    const [path, init] = apiFetchMock.mock.calls[0];
    expect(path).toBe('/data-sources/imports');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      source: 'ASSETS',
      fileName: 'assets.csv',
      records: 0,
      status: 'FAILED',
    });
  });

  it('keeps a per-source pending file when the selected source changes and changes back', async () => {
    const assetsSource = createAssetsImportSource([]);
    const otherSource: ImportPanelSourceConfig = {
      ...assetsSource,
      key: 'holdings',
      title: 'Import holdings',
      dropZoneLabel: 'Drop the holdings CSV here, or click to browse',
    };

    const { rerender } = render(<ImportPanel source={assetsSource} />);
    await attach(makeCsvFile());
    expect(screen.getByText('assets.csv')).toBeInTheDocument();

    rerender(<ImportPanel source={otherSource} />);
    expect(screen.queryByText('assets.csv')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /drop the holdings csv here/i }),
    ).toBeInTheDocument();

    rerender(<ImportPanel source={assetsSource} />);
    expect(screen.getByText('assets.csv')).toBeInTheDocument();
    expect(screen.getByTestId('summary-rows')).toHaveTextContent('10');
  });

  it('states that assets are shared across every user', () => {
    renderAssetsPanel();

    expect(screen.getByTestId('source-note')).toHaveTextContent(/every user/i);
  });
});
