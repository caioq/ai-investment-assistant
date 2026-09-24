"use client";

import { useCallback, useState } from "react";

import type { WalletType } from "../../lib/types";

export interface WalletDetails {
  /** `sourceName` — the research house the model wallet comes from. */
  sourceName: string;
  /** `effectiveDate`, as an `<input type="date">` value (`YYYY-MM-DD`). */
  effectiveDate: string;
}

/** `wallet:{type}` — the pending-file key each wallet type owns (spec → Goals). */
export function walletFileKey(walletType: WalletType): string {
  return `wallet:${walletType}`;
}

/** Today in the **viewer's** zone, as an `<input type="date">` value. */
export function todayInputValue(now: Date = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export interface WalletImportState {
  walletType: WalletType;
  setWalletType: (walletType: WalletType) => void;
  /** The selected type's details, defaulted per the spec's Detail fields table. */
  details: WalletDetails;
  setDetail: (field: keyof WalletDetails, value: string) => void;
  /** The file attached under the selected type, if any. */
  pendingFile: File | null;
  setPendingFile: (file: File | null) => void;
  /** Every pending file, keyed `wallet:{type}`. */
  pendingFiles: Record<string, File>;
}

/**
 * The state behind the model-wallets panel, kept per wallet type so that
 * switching types never discards work (`specs/data-sources/spec.md` → Goals:
 * "Each source keeps its own pending file"; US-4's "Each wallet type keeps
 * its own pending file (`wallet:{type}`)").
 *
 * Two defaults come from the spec's Detail fields table: **Research house**
 * defaults to the last value used in this session — so a type that hasn't
 * been touched yet inherits whatever was typed under another one, rather
 * than making the user retype the same house three times — and **Effective
 * date** defaults to today.
 *
 * The import panel itself lands in `US-4_T-2`; it consumes this hook rather
 * than holding its own copy of the selection.
 */
export function useWalletImportState(
  initialType: WalletType = "DIVIDENDS",
): WalletImportState {
  const [walletType, setWalletType] = useState<WalletType>(initialType);
  const [detailsByType, setDetailsByType] = useState<
    Partial<Record<WalletType, WalletDetails>>
  >({});
  const [lastSourceName, setLastSourceName] = useState("");
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  const details: WalletDetails = detailsByType[walletType] ?? {
    sourceName: lastSourceName,
    effectiveDate: todayInputValue(),
  };

  const setDetail = useCallback(
    (field: keyof WalletDetails, value: string) => {
      if (field === "sourceName") {
        setLastSourceName(value);
      }
      setDetailsByType((current) => ({
        ...current,
        [walletType]: {
          sourceName: lastSourceName,
          effectiveDate: todayInputValue(),
          ...current[walletType],
          [field]: value,
        },
      }));
    },
    [lastSourceName, walletType],
  );

  const setPendingFile = useCallback(
    (file: File | null) => {
      const key = walletFileKey(walletType);
      setPendingFiles((current) => {
        if (!file) {
          const rest = { ...current };
          delete rest[key];
          return rest;
        }
        return { ...current, [key]: file };
      });
    },
    [walletType],
  );

  return {
    walletType,
    setWalletType,
    details,
    setDetail,
    pendingFile: pendingFiles[walletFileKey(walletType)] ?? null,
    setPendingFile,
    pendingFiles,
  };
}
