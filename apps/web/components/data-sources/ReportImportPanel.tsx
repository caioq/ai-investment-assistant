'use client';

import { useState } from 'react';

import type { DataSourcesSummary } from '../../lib/types';
import { TextField } from '../ui/TextField';
import { REPORT_DETAILS_HINT } from './ImportFooter';
import { ImportPanel, type ImportPanelSourceConfig } from './ImportPanel';

export interface ReportDetails {
  title: string;
  publisher: string;
  publishedAt: string;
}

const EMPTY_DETAILS: ReportDetails = { title: '', publisher: '', publishedAt: '' };

/**
 * Best-effort page count read in the browser without a PDF library: counts
 * `/Type /Page` dictionary markers (not `/Type /Pages`, the page-tree node).
 * Limits: pages stored inside compressed object streams (PDF 1.5+ "object
 * streams") are invisible to a byte scan, so such files can read low or 0;
 * it is a display hint only and never gates the upload.
 */
export function countPdfPages(bytes: ArrayBuffer): number {
  const text = new TextDecoder('latin1').decode(bytes);
  return (text.match(/\/Type\s*\/Page(?![A-Za-z])/g) ?? []).length;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type CurrentReport = DataSourcesSummary['report'];

/** The report source's `ImportPanel` config (PDF: no CSV review, template or skip). */
export function createReportImportSource(
  details: ReportDetails,
  detailsSlot: ImportPanelSourceConfig['detailsSlot'],
): ImportPanelSourceConfig {
  const title = details.title.trim();
  return {
    key: 'report',
    title: 'Add research report',
    description: 'A PDF the AI Advisor cites when reviewing your portfolio.',
    accept: '.pdf',
    dropZoneLabel: 'Drop the research report PDF here, or click to browse',
    dropZoneHint: 'One PDF file.',
    detailsSlot,
    detailsComplete: Boolean(title && details.publisher.trim() && details.publishedAt),
    detailsHint: REPORT_DETAILS_HINT,
    requiredColumns: [],
    hideReview: true,
    readFile: async (file) => {
      const pages = countPdfPages(await file.arrayBuffer());
      return {
        meta: `${formatFileSize(file.size)} · ${pages} pages`,
        validation: { columns: [], rows: [{}], rowIssues: [], fileIssues: [] },
      };
    },
    skipAvailable: false,
    buttonLabel: () => 'Add to AI context',
    importingLabel: 'Processing',
    importEndpoint: '/advisor/reports/upload',
    extraFormFields: () => ({
      title,
      publisher: details.publisher.trim(),
      publishedAt: details.publishedAt,
    }),
    parseImportResponse: () => ({ records: 1, errors: [] }),
    successMessage: () => `"${title}" added to AI Advisor context.`,
    logSource: 'REPORT',
  };
}

export interface ReportImportPanelProps {
  currentReport: CurrentReport;
  onImported?: () => void;
}

/** Owns the report's three detail fields and plugs the report source into `ImportPanel`. */
export function ReportImportPanel({ currentReport, onImported }: ReportImportPanelProps) {
  const [details, setDetails] = useState<ReportDetails>(EMPTY_DETAILS);
  const set = (field: keyof ReportDetails, value: string) =>
    setDetails((prev) => ({ ...prev, [field]: value }));

  const currentLabel = currentReport
    ? (currentReport.title ?? currentReport.fileName ?? 'Untitled report')
    : null;

  const detailsSlot = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
        <TextField
          id="report-title"
          label="Report title"
          required
          placeholder="e.g. Q3 Outlook"
          value={details.title}
          onChange={(event) => set('title', event.target.value)}
        />
        <TextField
          id="report-publisher"
          label="Publisher"
          required
          placeholder="e.g. Meridian Research"
          value={details.publisher}
          onChange={(event) => set('publisher', event.target.value)}
        />
        <TextField
          id="report-published-at"
          label="Publication date"
          type="date"
          required
          value={details.publishedAt}
          onChange={(event) => set('publishedAt', event.target.value)}
        />
      </div>
      <p data-testid="report-note" style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
        The advisor uses the most recent report.
        {currentLabel ? ` Currently: ${currentLabel}. A newer upload takes over.` : ''}
      </p>
    </>
  );

  return (
    <ImportPanel
      source={createReportImportSource(details, detailsSlot)}
      onImported={onImported}
    />
  );
}
