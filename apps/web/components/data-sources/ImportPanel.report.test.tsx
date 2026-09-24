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

import { ReportImportPanel } from './ReportImportPanel';

const PDF_BYTES =
  '%PDF-1.4\n1 0 obj << /Type /Catalog >>\n2 0 obj << /Type /Pages /Count 2 >>\n' +
  '3 0 obj << /Type /Page >>\n4 0 obj << /Type/Page >>\n%%EOF';

function makePdf(name = 'q3-outlook.pdf') {
  return new File([PDF_BYTES], name, { type: 'application/pdf' });
}

function fileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

function fillDetails() {
  fireEvent.change(screen.getByLabelText(/report title/i), { target: { value: 'Q3 Outlook' } });
  fireEvent.change(screen.getByLabelText(/publisher/i), { target: { value: 'Meridian Research' } });
  fireEvent.change(screen.getByLabelText(/publication date/i), { target: { value: '2026-09-01' } });
}

async function attachPdf() {
  fireEvent.change(fileInput(), { target: { files: [makePdf()] } });
  await waitFor(() => expect(screen.getByText(/2 pages/)).toBeInTheDocument());
}

type CurrentReport = Parameters<typeof ReportImportPanel>[0]['currentReport'];

function renderPanel(currentReport: CurrentReport = null) {
  const onImported = vi.fn();
  render(<ReportImportPanel currentReport={currentReport} onImported={onImported} />);
  return { onImported };
}

describe('ImportPanel — report', () => {
  afterEach(() => vi.clearAllMocks());

  it('disables the button and shows the details hint while details are empty', async () => {
    renderPanel();
    await attachPdf();
    expect(screen.getByRole('button', { name: 'Add to AI context' })).toBeDisabled();
    expect(screen.getByTestId('import-gate-hint')).toHaveTextContent(
      'Add title, publisher and publication date.',
    );
  });

  it('rejects a non-PDF and attaches nothing', async () => {
    renderPanel();
    fireEvent.change(fileInput(), {
      target: { files: [new File(['a,b'], 'report.csv', { type: 'text/csv' })] },
    });
    expect(await screen.findByText('report.csv is not a PDF file.')).toBeInTheDocument();
    expect(screen.queryByText(/pages/)).not.toBeInTheDocument();
  });

  it('enables "Add to AI context" once details are filled and a PDF is attached, with size and pages', async () => {
    renderPanel();
    fillDetails();
    await attachPdf();
    expect(screen.getByRole('button', { name: 'Add to AI context' })).toBeEnabled();
    expect(screen.getByText(/ · 2 pages/)).toBeInTheDocument();
  });

  it('names the current report in the most-recent-report note', () => {
    renderPanel({
      id: 'r1',
      title: 'Q2 Outlook',
      publisher: 'X',
      publishedAt: null,
      fileName: 'q2.pdf',
      uploadedAt: '2026-06-01T00:00:00.000Z',
    });
    expect(screen.getByTestId('report-note')).toHaveTextContent('Q2 Outlook');
  });

  it('posts multipart with the file and all three fields', async () => {
    apiFetchMultipartMock.mockResolvedValue({ id: 'r2' });
    apiFetchMock.mockResolvedValue({});
    renderPanel();
    fillDetails();
    await attachPdf();
    fireEvent.click(screen.getByRole('button', { name: 'Add to AI context' }));

    await waitFor(() => expect(apiFetchMultipartMock).toHaveBeenCalled());
    const [path, form] = apiFetchMultipartMock.mock.calls[0] as [string, FormData];
    expect(path).toBe('/advisor/reports/upload');
    expect((form.get('file') as File).name).toBe('q3-outlook.pdf');
    expect(form.get('title')).toBe('Q3 Outlook');
    expect(form.get('publisher')).toBe('Meridian Research');
    expect(form.get('publishedAt')).toBe('2026-09-01');
  });

  it('on success clears the file, logs REPORT / 1 record and shows a banner naming the title', async () => {
    apiFetchMultipartMock.mockResolvedValue({ id: 'r2' });
    apiFetchMock.mockResolvedValue({});
    const { onImported } = renderPanel();
    fillDetails();
    await attachPdf();
    fireEvent.click(screen.getByRole('button', { name: 'Add to AI context' }));

    expect(
      await screen.findByText('"Q3 Outlook" added to AI Advisor context.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/2 pages/)).not.toBeInTheDocument();
    const [path, init] = apiFetchMock.mock.calls[0] as [string, { body: string }];
    expect(path).toBe('/data-sources/imports');
    expect(JSON.parse(init.body)).toMatchObject({ source: 'REPORT', records: 1, status: 'IMPORTED' });
    expect(onImported).toHaveBeenCalled();
  });

  it('offers no way to paste report text', () => {
    renderPanel();
    expect(document.querySelector('textarea')).toBeNull();
    expect(screen.queryByText(/paste/i)).not.toBeInTheDocument();
  });
});
