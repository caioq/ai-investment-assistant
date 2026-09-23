import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DropZone } from './DropZone';

/**
 * jsdom has no real drag-and-drop, so a drop event carries a synthetic
 * `dataTransfer` with just the `files` list the component reads.
 */
function dropFiles(element: Element, files: File[]) {
  fireEvent.drop(element, {
    dataTransfer: { files, items: [], types: ['Files'] },
  });
}

function renderCsvZone(overrides: Partial<Parameters<typeof DropZone>[0]> = {}) {
  const onFile = vi.fn();
  const onReject = vi.fn();
  render(
    <DropZone
      accept=".csv"
      label="Drop an assets CSV here, or click to browse"
      hint="Columns are matched by name"
      onFile={onFile}
      onReject={onReject}
      {...overrides}
    />,
  );
  return { onFile, onReject };
}

describe('DropZone', () => {
  it('is reachable by keyboard and its accessible name mentions the accepted format', () => {
    renderCsvZone();

    const zone = screen.getByRole('button', {
      name: /drop an assets csv here, or click to browse.*csv only/i,
    });

    // A genuinely focusable control, not a div with a click handler.
    zone.focus();
    expect(zone).toHaveFocus();
    expect(zone.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('opens the file browser on Enter and on Space', () => {
    renderCsvZone();
    const zone = screen.getByRole('button', { name: /csv only/i });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    const click = vi.spyOn(input!, 'click').mockImplementation(() => {});

    fireEvent.keyDown(zone, { key: 'Enter' });
    expect(click).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(zone, { key: ' ' });
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('calls onFile (and not onReject) when a .csv is dropped', () => {
    const { onFile, onReject } = renderCsvZone();
    const zone = screen.getByRole('button', { name: /csv only/i });
    const file = new File(['ticker\nPETR4'], 'assets.csv', { type: 'text/csv' });

    dropFiles(zone, [file]);

    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile).toHaveBeenCalledWith(file);
    expect(onReject).not.toHaveBeenCalled();
  });

  it('rejects a .pdf dropped on a .csv zone without ever attaching it', () => {
    const { onFile, onReject } = renderCsvZone();
    const zone = screen.getByRole('button', { name: /csv only/i });
    const file = new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' });

    dropFiles(zone, [file]);

    expect(onReject).toHaveBeenCalledWith('report.pdf is not a CSV file.');
    expect(onFile).not.toHaveBeenCalled();
  });

  it('rejects a wrong-extension file chosen through the file browser too', () => {
    const { onFile, onReject } = renderCsvZone();
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onReject).toHaveBeenCalledWith('report.pdf is not a CSV file.');
    expect(onFile).not.toHaveBeenCalled();
  });

  it('rejects a .csv dropped on a .pdf zone with the PDF message', () => {
    const { onFile, onReject } = renderCsvZone({
      accept: '.pdf',
      label: 'Drop the research report PDF here, or click to browse',
    });
    const zone = screen.getByRole('button', { name: /pdf only/i });
    const file = new File(['a,b'], 'holdings.csv', { type: 'text/csv' });

    dropFiles(zone, [file]);

    expect(onReject).toHaveBeenCalledWith('holdings.csv is not a PDF file.');
    expect(onFile).not.toHaveBeenCalled();
  });

  it('toggles its drag-over state between dragover and dragleave', () => {
    renderCsvZone();
    const zone = screen.getByRole('button', { name: /csv only/i });

    expect(zone).toHaveAttribute('data-drag-over', 'false');

    fireEvent.dragOver(zone);
    expect(zone).toHaveAttribute('data-drag-over', 'true');

    fireEvent.dragLeave(zone);
    expect(zone).toHaveAttribute('data-drag-over', 'false');
  });

  it('clears the drag-over state after a drop', () => {
    renderCsvZone();
    const zone = screen.getByRole('button', { name: /csv only/i });

    fireEvent.dragOver(zone);
    dropFiles(zone, [new File(['a'], 'assets.csv', { type: 'text/csv' })]);

    expect(zone).toHaveAttribute('data-drag-over', 'false');
  });

  it('renders the hint', () => {
    renderCsvZone();
    expect(screen.getByText('Columns are matched by name')).toBeInTheDocument();
  });
});
