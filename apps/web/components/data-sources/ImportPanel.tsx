'use client';

import { useRef, useState, type ReactNode } from 'react';
import {
  ASSETS_COLUMNS,
  parseCsv,
  validateAssetsRows,
  type CsvTemplateSource,
  type ValidationResult,
  type WalletType,
} from '@ai-investment-assistant/shared';

import { apiFetch, apiFetchMultipart, ApiError } from '../../lib/api-client';
import { DropZone, type DropZoneAccept } from '../ui/DropZone';
import { FileChip, type FileChipKind } from '../ui/FileChip';
import { Banner } from './Banner';
import { CsvReview } from './CsvReview';
import { ImportFooter } from './ImportFooter';
import { TemplateDownloadButton } from './TemplateDownloadButton';

/** Mirrors `apps/api/prisma/schema.prisma`'s `enum ImportSource`. */
export type ImportLogSource = 'ASSETS' | 'HOLDINGS' | 'WALLET' | 'REPORT';

/**
 * Everything one source (assets, holdings, a wallet type, or the report)
 * needs to drive `ImportPanel` — the panel itself never branches on *which*
 * source it's showing, only on this config (spec →
 * `specs/data-sources/spec.md`, task note: "keep everything source-specific
 * in props or a per-source config, not in branches inside the panel").
 */
export interface ImportPanelSourceConfig {
  /** Keys the panel's per-source pending-file state: `'assets' | 'holdings' | `wallet:${WalletType}` | 'report'`. */
  key: string;
  /** Panel header title, e.g. "Import assets". */
  title: string;
  /** One line on what importing does. */
  description: string;
  /** An extra one-liner shown under the description (e.g. the shared-assets note). */
  note?: string;
  accept: DropZoneAccept;
  dropZoneLabel: string;
  dropZoneHint: ReactNode;
  /** Omit for a source with no CSV template (the report is a PDF). */
  templateSource?: CsvTemplateSource;
  walletType?: WalletType;
  /** Extra fields rendered between the header and the drop zone (wallet selector, report metadata, …). */
  detailsSlot?: ReactNode;
  /** Defaults to `true` — only wallet/report sources have fields that can be incomplete. */
  detailsComplete?: boolean;
  detailsHint?: string;
  /** The source's required column names, in template order (empty for a non-CSV source). */
  requiredColumns: string[];
  /** Runs `validateAssetsRows`/`validateHoldingsRows`/`validateWalletRows` with whatever context this source needs, bound by the caller. */
  validate: (parsed: ReturnType<typeof parseCsv>) => ValidationResult;
  /**
   * Whether the *server* can honour skipping row errors (see
   * `ImportFooter`'s own doc comment) — `true` for assets/holdings, `false`
   * for a wallet.
   */
  skipAvailable: boolean;
  buttonLabel: (rowsToWrite: number) => string;
  importingLabel?: string;
  importEndpoint: string;
  /** Extra multipart fields alongside the file (e.g. a wallet's `effectiveDate`/`sourceName`). */
  extraFormFields?: () => Record<string, string>;
  /** Reads the import endpoint's response into the shape `ImportLog`/the banner need. */
  parseImportResponse: (response: unknown) => { records: number; errors: string[] };
  /** The success banner's leading sentence, e.g. "Imported {n} assets into the asset master." */
  successMessage: (recordsWritten: number) => string;
  logSource: ImportLogSource;
}

export interface ImportPanelProps {
  source: ImportPanelSourceConfig;
  /** Called after a successful import (and its `ImportLog` write) so the caller can refresh `GET /data-sources/summary`. */
  onImported?: () => void;
}

interface SourceState {
  file: File | null;
  validation: ValidationResult | null;
  skipErrors: boolean;
  banner: { kind: 'success' | 'error'; message: string } | null;
  importing: boolean;
}

const EMPTY_STATE: SourceState = {
  file: null,
  validation: null,
  skipErrors: true,
  banner: null,
  importing: false,
};

const UNEXPECTED_ERROR = 'Something went wrong. Please try again.';

function extractApiErrorMessage(body: unknown): string {
  if (
    body !== null &&
    typeof body === 'object' &&
    'message' in body &&
    (body as { message?: unknown }).message !== undefined
  ) {
    const { message } = body as { message: unknown };
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }
  return UNEXPECTED_ERROR;
}

function fileChipKind(accept: DropZoneAccept): FileChipKind {
  return accept === '.pdf' ? 'pdf' : 'csv';
}

/**
 * The reusable import panel every data-sources card composes
 * (`specs/data-sources/spec.md` → Presentation → Composition): a header,
 * an optional details slot, the drop zone / file chip, the CSV review, and
 * the import gate footer, with an outcome banner above all of it.
 *
 * State (the attached file, its validation, the skip choice, the banner) is
 * kept **per source key**, not reset on every render — so switching which
 * source card is selected and switching back never discards a pending file
 * (spec → "Each source keeps its own pending file").
 */
export function ImportPanel({ source, onImported }: ImportPanelProps) {
  const [statesByKey, setStatesByKey] = useState<Record<string, SourceState>>({});
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const state = statesByKey[source.key] ?? EMPTY_STATE;

  function patchState(patch: Partial<SourceState>) {
    setStatesByKey((prev) => ({
      ...prev,
      [source.key]: { ...(prev[source.key] ?? EMPTY_STATE), ...patch },
    }));
  }

  function replaceState(next: SourceState) {
    setStatesByKey((prev) => ({ ...prev, [source.key]: next }));
  }

  async function attachFile(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);
    const validation = source.validate(parsed);
    patchState({ file, validation, skipErrors: true, banner: null });
  }

  function handleReject(message: string) {
    patchState({ banner: { kind: 'error', message } });
  }

  function handleRemove() {
    patchState({ file: null, validation: null, banner: null });
  }

  function handleReplaceInputChange(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(source.accept)) {
      const format = source.accept === '.pdf' ? 'PDF' : 'CSV';
      handleReject(`${file.name} is not a ${format} file.`);
      return;
    }
    void attachFile(file);
  }

  async function writeImportLog(body: Record<string, unknown>) {
    await apiFetch('/data-sources/imports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async function handleImport() {
    if (state.importing || state.file === null) {
      return;
    }

    const file = state.file;
    patchState({ importing: true });

    const formData = new FormData();
    formData.set('file', file);
    if (source.extraFormFields) {
      for (const [key, value] of Object.entries(source.extraFormFields())) {
        formData.set(key, value);
      }
    }

    try {
      const response = await apiFetchMultipart(source.importEndpoint, formData);
      const { records, errors } = source.parseImportResponse(response);

      await writeImportLog({
        source: source.logSource,
        ...(source.walletType ? { walletType: source.walletType } : {}),
        fileName: file.name,
        records,
        status: 'IMPORTED',
        ...(errors.length > 0 ? { errors } : {}),
      });

      let message = source.successMessage(records);
      if (errors.length > 0) {
        message += ` ${errors.length} row${errors.length === 1 ? '' : 's'} with errors skipped.`;
      }

      replaceState({
        file: null,
        validation: null,
        skipErrors: true,
        importing: false,
        banner: { kind: 'success', message },
      });

      onImported?.();
    } catch (err) {
      const message = err instanceof ApiError ? extractApiErrorMessage(err.body) : UNEXPECTED_ERROR;

      try {
        await writeImportLog({
          source: source.logSource,
          ...(source.walletType ? { walletType: source.walletType } : {}),
          fileName: file.name,
          records: 0,
          status: 'FAILED',
          message,
        });
      } catch {
        // Logging the failure itself failing must never mask the original
        // import error shown below.
      }

      patchState({ importing: false, banner: { kind: 'error', message } });
    }
  }

  const attached = state.file !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {state.banner ? (
        <Banner
          kind={state.banner.kind}
          message={state.banner.message}
          onDismiss={() => patchState({ banner: null })}
        />
      ) : null}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            {source.title}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{source.description}</p>
          {source.note ? (
            <p data-testid="source-note" style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
              {source.note}
            </p>
          ) : null}
        </div>
        {source.templateSource ? (
          <TemplateDownloadButton source={source.templateSource} walletType={source.walletType} />
        ) : null}
      </div>

      {source.detailsSlot}

      {attached ? (
        <>
          <FileChip
            name={state.file!.name}
            meta={
              state.validation
                ? `${state.validation.rows.length} row${state.validation.rows.length === 1 ? '' : 's'} · ${state.validation.columns.length} column${state.validation.columns.length === 1 ? '' : 's'}`
                : ''
            }
            kind={fileChipKind(source.accept)}
            onReplace={() => replaceInputRef.current?.click()}
            onRemove={handleRemove}
          />
          <input
            ref={replaceInputRef}
            type="file"
            accept={source.accept}
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              handleReplaceInputChange(file);
            }}
          />
          {state.validation ? (
            <CsvReview result={state.validation} requiredColumns={source.requiredColumns} />
          ) : null}
        </>
      ) : (
        <DropZone
          accept={source.accept}
          label={source.dropZoneLabel}
          hint={source.dropZoneHint}
          onFile={(file) => void attachFile(file)}
          onReject={handleReject}
        />
      )}

      <ImportFooter
        validation={state.validation}
        skipAvailable={source.skipAvailable}
        skipErrors={state.skipErrors}
        onSkipErrorsChange={(skipErrors) => patchState({ skipErrors })}
        detailsComplete={source.detailsComplete ?? true}
        detailsHint={source.detailsHint}
        buttonLabel={source.buttonLabel}
        importingLabel={source.importingLabel}
        importing={state.importing}
        onImport={() => void handleImport()}
        onCancel={handleRemove}
      />
    </div>
  );
}

/**
 * The assets source's config — the reference the future holdings/wallet/
 * report tasks each mirror with their own `create*ImportSource` (spec →
 * "This task establishes the panel shape every other source reuses").
 * `knownTickers` is accepted for signature parity with the other sources
 * (`specs/data-sources/spec.md` → "Behaviour"), but the assets validator
 * itself has no unknown-ticker rule — assets *are* the asset master.
 */
export function createAssetsImportSource(knownTickers: string[]): ImportPanelSourceConfig {
  return {
    key: 'assets',
    title: 'Import assets',
    description:
      'Adds or updates assets by ticker; tickers not in the file are left untouched.',
    note: 'Assets are shared: importing here updates classification for every user, not just you.',
    accept: '.csv',
    dropZoneLabel: 'Drop the assets CSV here, or click to browse',
    dropZoneHint: 'Required: ticker. Optional: sector, subSector, investmentStyle, riskRating, assetType.',
    templateSource: 'assets',
    requiredColumns: ASSETS_COLUMNS.required,
    validate: (parsed) => validateAssetsRows(parsed, { knownCategories: knownTickers }),
    skipAvailable: true,
    buttonLabel: (rowsToWrite) => `Import ${rowsToWrite} asset${rowsToWrite === 1 ? '' : 's'}`,
    importingLabel: 'Importing',
    importEndpoint: '/market-data/assets/import',
    parseImportResponse: (response) => {
      const { created, updated, errors } = response as {
        created: number;
        updated: number;
        errors: string[];
      };
      return { records: created + updated, errors };
    },
    successMessage: (recordsWritten) =>
      `Imported ${recordsWritten} asset${recordsWritten === 1 ? '' : 's'} into the asset master.`,
    logSource: 'ASSETS',
  };
}
