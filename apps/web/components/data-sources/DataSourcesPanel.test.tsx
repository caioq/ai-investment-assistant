import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
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
  return { apiFetch: vi.fn(), apiFetchMultipart: vi.fn(), ApiError };
});

import type { DataSourcesSummary } from '../../lib/types';
import { DataSourcesPanel } from './DataSourcesPanel';

const SUMMARY: DataSourcesSummary = {
  assets: { count: 2, tickers: ['AAAA3', 'BBBB3'], lastImportAt: null },
  holdings: { count: 0, lastImportAt: null },
  wallets: [],
  report: null,
};

const HEADER = 'CODIGO,PRECO_TETO,RECOMENDACAO,ALOCACAO_SUGERIDA';

function csv(content: string) {
  return new File([content], 'file.csv', { type: 'text/csv' });
}
function fileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

describe('DataSourcesPanel', () => {
  it('mounts the assets import panel on load, since Assets is the selected card', () => {
    render(<DataSourcesPanel summary={SUMMARY} />);

    expect(screen.getByRole('heading', { name: 'Import assets' })).toBeInTheDocument();
    expect(fileInput()).toBeInTheDocument();
  });

  it("treats the summary's asset tickers as known when reviewing a wallet file", async () => {
    render(<DataSourcesPanel summary={SUMMARY} />);
    fireEvent.click(screen.getByRole('button', { name: /Model wallets/ }));

    // AAAA3 and BBBB3 are both in the asset master, so neither row may warn.
    const known = [HEADER, 'AAAA3,10,COMPRA,50', 'BBBB3,20,NEUTRO,50'].join('\n');
    fireEvent.change(fileInput(), { target: { files: [csv(known)] } });

    await waitFor(() => expect(screen.getByTestId('summary-rows')).toBeInTheDocument());
    expect(screen.queryByText(/is not in the asset master/)).not.toBeInTheDocument();
  });

  it('still warns about a wallet ticker that is not in the asset master', async () => {
    render(<DataSourcesPanel summary={SUMMARY} />);
    fireEvent.click(screen.getByRole('button', { name: /Model wallets/ }));

    const unknown = [HEADER, 'ZZZZ3,10,COMPRA,100'].join('\n');
    fireEvent.change(fileInput(), { target: { files: [csv(unknown)] } });

    await waitFor(() => expect(screen.getByTestId('summary-rows')).toBeInTheDocument());
    expect(screen.getAllByText(/ZZZZ3 is not in the asset master/).length).toBeGreaterThan(0);
  });

  it('reaches the report import panel through the Research report card', () => {
    render(<DataSourcesPanel summary={SUMMARY} />);
    fireEvent.click(screen.getByRole('button', { name: /Research report/ }));

    // Each panel is tested on its own; this guards that the *page* can reach it.
    expect(screen.getByRole('heading', { name: 'Add research report' })).toBeInTheDocument();
    expect(fileInput()).toBeInTheDocument();
  });

  it('mounts only the selected source’s panel', () => {
    render(<DataSourcesPanel summary={SUMMARY} />);
    expect(screen.getByRole('heading', { name: 'Import assets' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Research report/ }));
    expect(screen.queryByRole('heading', { name: 'Import assets' })).not.toBeInTheDocument();
  });
});
