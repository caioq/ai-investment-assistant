'use client';

import {
  WALLET_COLUMNS,
  validateWalletRows,
  type WalletType,
} from '@ai-investment-assistant/shared';

import type { DataSourcesSummary } from '../../lib/types';
import { WALLET_DETAILS_HINT } from './ImportFooter';
import { ImportPanel, type ImportPanelSourceConfig } from './ImportPanel';
import { WalletDetailsFields } from './WalletDetailsFields';
import { WALLET_TYPES, WalletTypeSelector } from './WalletTypeSelector';
import { useWalletImportState, walletFileKey, type WalletDetails } from './useWalletImportState';

/**
 * The model-wallets source's config for `ImportPanel`. Wallets differ from
 * assets/holdings in one rule: `POST /advisor/recommended-portfolios/upload`
 * rejects the whole file on one bad row, so `skipAvailable` is `false` (no
 * checkbox; any row error blocks the import) and the original file is always
 * what gets posted. Weights not summing to 100% ± 0.5% is a file-level
 * warning from `validateWalletRows`, which never blocks.
 */
export function createWalletImportSource({
  walletType,
  details,
  detailsSlot,
  knownTickers = [],
}: {
  walletType: WalletType;
  details: WalletDetails;
  detailsSlot: ImportPanelSourceConfig['detailsSlot'];
  knownTickers?: string[];
}): ImportPanelSourceConfig {
  const label = WALLET_TYPES.find((type) => type.value === walletType)?.label ?? walletType;
  const columns = WALLET_COLUMNS[walletType];

  return {
    key: walletFileKey(walletType),
    title: `Import model wallet · ${label}`,
    description:
      'Uploading creates a new version of this wallet; earlier versions are kept.',
    accept: '.csv',
    dropZoneLabel: 'Drop the wallet CSV here, or click to browse',
    dropZoneHint: `Required: ${columns.required.join(', ')}. The whole file is imported at once.`,
    templateSource: 'wallet',
    walletType,
    detailsSlot,
    detailsComplete:
      details.sourceName.trim() !== '' && details.effectiveDate.trim() !== '',
    detailsHint: WALLET_DETAILS_HINT,
    requiredColumns: columns.required,
    validate: (parsed) => validateWalletRows(parsed, { knownTickers, walletType }),
    skipAvailable: false,
    buttonLabel: (rowsToWrite) =>
      `Import ${rowsToWrite} position${rowsToWrite === 1 ? '' : 's'}`,
    importingLabel: 'Importing',
    importEndpoint: `/advisor/recommended-portfolios/upload?wallet=${walletType}`,
    extraFormFields: () => ({
      effectiveDate: details.effectiveDate,
      sourceName: details.sourceName.trim(),
    }),
    parseImportResponse: (response) => {
      const { holdings } = response as { holdings: unknown[] };
      return { records: holdings.length, errors: [] };
    },
    successMessage: (recordsWritten) =>
      `Imported ${recordsWritten} position${recordsWritten === 1 ? '' : 's'} into the ${label} wallet.`,
    logSource: 'WALLET',
  };
}

export interface WalletImportSectionProps {
  wallets: DataSourcesSummary['wallets'];
  knownTickers?: string[];
  onImported?: () => void;
}

/**
 * The model-wallets source: type selector + details fields (via
 * `useWalletImportState`) feeding the one shared `ImportPanel`. The panel
 * keeps a pending file per `wallet:{type}` key itself, so switching types
 * here never discards another type's file.
 */
export function WalletImportSection({ wallets, knownTickers, onImported }: WalletImportSectionProps) {
  const state = useWalletImportState();

  const source = createWalletImportSource({
    walletType: state.walletType,
    details: state.details,
    knownTickers,
    detailsSlot: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <WalletTypeSelector wallets={wallets} value={state.walletType} onChange={state.setWalletType} />
        <WalletDetailsFields details={state.details} onChange={state.setDetail} />
      </div>
    ),
  });

  return <ImportPanel source={source} onImported={onImported} />;
}
