'use client';

import {
  buildCsvTemplate,
  csvTemplateFileName,
  type CsvTemplateSource,
  type WalletType,
} from '@ai-investment-assistant/shared';

import { Button } from '../ui/Button';

export interface TemplateDownloadButtonProps {
  source: CsvTemplateSource;
  /** Required when `source` is `"wallet"` — each wallet type has its own template. */
  walletType?: WalletType;
}

/**
 * "Download CSV template" for a CSV import source (`DATA_SOURCES_SHARED_T-9`).
 * Purely presentational and self-contained: the import panel renders it in its
 * header, but it owns the whole download itself so no parent has to.
 *
 * The file is generated in the browser from the shared column definitions —
 * never fetched — so it can never drift from what the parser accepts.
 */
export function TemplateDownloadButton({ source, walletType }: TemplateDownloadButtonProps) {
  function handleClick() {
    const csv = buildCsvTemplate(source, walletType);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = csvTemplateFileName(source, walletType);
    // Firefox only follows a click on an anchor that's actually in the
    // document, so it's appended and removed again around the click.
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // The blob stays alive until it's revoked; the download has already been
    // handed to the browser by the time the click returns.
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleClick}
      style={{ fontSize: 13, padding: '6px 10px', color: 'var(--blue)' }}
    >
      Download CSV template
    </Button>
  );
}
