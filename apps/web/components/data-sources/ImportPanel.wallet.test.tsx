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

import { UNSKIPPABLE_ERRORS_HINT } from './ImportFooter';
import { WalletImportSection } from './WalletImportSection';

const HEADER = 'CODIGO,PRECO_TETO,RECOMENDACAO,ALOCACAO_SUGERIDA';
const CLEAN_92 = [HEADER, 'AAAA3,10,COMPRA,50', 'BBBB3,20,NEUTRO,42'].join('\n');
const BAD_RECOMENDACAO = [HEADER, 'AAAA3,10,COMPRA,50', 'BBBB3,20,XYZ,50'].join('\n');

function csv(content: string, name = 'wallet.csv') {
  return new File([content], name, { type: 'text/csv' });
}
function fileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}
async function attach(file: File) {
  fireEvent.change(fileInput(), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByTestId('summary-rows')).toBeInTheDocument());
}
function renderSection(onImported = vi.fn()) {
  render(<WalletImportSection wallets={[]} onImported={onImported} />);
  return { onImported };
}
function fillDetails() {
  fireEvent.change(screen.getByLabelText(/Research house/), { target: { value: 'Meridian' } });
  fireEvent.change(screen.getByLabelText(/Effective date/), { target: { value: '2026-09-01' } });
}
function importButton() {
  return screen.getByRole('button', { name: /^Import \d+ position/ });
}

describe('ImportPanel — model wallet', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders no skip checkbox and blocks the import when a row is invalid', async () => {
    renderSection();
    fillDetails();
    await attach(csv(BAD_RECOMENDACAO));

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(importButton()).toBeDisabled();
    expect(screen.getByText(UNSKIPPABLE_ERRORS_HINT)).toBeInTheDocument();
  });

  it('shows a weights warning naming the total without blocking the import', async () => {
    renderSection();
    fillDetails();
    await attach(csv(CLEAN_92));

    expect(screen.getByText(/totals 92/)).toBeInTheDocument();
    expect(importButton()).toBeEnabled();
  });

  it('posts the original file with effectiveDate and sourceName to the wallet endpoint', async () => {
    apiFetchMultipartMock.mockResolvedValue({ holdings: [{}, {}] });
    apiFetchMock.mockResolvedValue({});
    renderSection();
    fillDetails();
    const file = csv(CLEAN_92);
    await attach(file);

    fireEvent.click(importButton());

    await waitFor(() => expect(apiFetchMultipartMock).toHaveBeenCalledTimes(1));
    const [path, body] = apiFetchMultipartMock.mock.calls[0] as [string, FormData];
    expect(path).toBe('/advisor/recommended-portfolios/upload?wallet=DIVIDENDS');
    expect(body.get('file')).toBe(file);
    expect(body.get('effectiveDate')).toBe('2026-09-01');
    expect(body.get('sourceName')).toBe('Meridian');
  });

  it('logs the import with its wallet type, shows the banner and refreshes the summary', async () => {
    apiFetchMultipartMock.mockResolvedValue({ holdings: [{}, {}] });
    apiFetchMock.mockResolvedValue({});
    const { onImported } = renderSection();
    fillDetails();
    await attach(csv(CLEAN_92));

    fireEvent.click(importButton());

    await waitFor(() =>
      expect(screen.getByText(/Imported 2 positions into the Dividends wallet\./)).toBeInTheDocument(),
    );
    const [logPath, init] = apiFetchMock.mock.calls[0] as [string, { body: string }];
    expect(logPath).toBe('/data-sources/imports');
    expect(JSON.parse(init.body)).toMatchObject({
      source: 'WALLET',
      walletType: 'DIVIDENDS',
      records: 2,
      status: 'IMPORTED',
    });
    expect(onImported).toHaveBeenCalled();
  });

  it("keeps each wallet type's pending file when switching types", async () => {
    renderSection();
    await attach(csv(CLEAN_92, 'dividends.csv'));

    fireEvent.click(screen.getByRole('button', { name: /Small Caps/ }));
    expect(screen.queryByText('dividends.csv')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Dividends/ }));

    expect(screen.getByText('dividends.csv')).toBeInTheDocument();
  });

  it('says a new version is created and earlier versions are kept', () => {
    renderSection();
    expect(screen.getByText(/new version/i)).toBeInTheDocument();
    expect(screen.getByText(/earlier versions are kept/i)).toBeInTheDocument();
    expect(screen.getByText('Import model wallet · Dividends')).toBeInTheDocument();
  });
});
