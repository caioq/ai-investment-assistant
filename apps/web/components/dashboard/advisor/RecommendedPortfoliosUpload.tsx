"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch, apiFetchMultipart, ApiError } from "../../../lib/api-client";
import type { RecommendedPortfolio, WalletType } from "../../../lib/types";
import { Button } from "../../ui/Button";

const UNEXPECTED_ERROR = "Something went wrong. Please try again.";
const WALLET_REQUIRED_ERROR = "Choose a wallet before uploading.";
const FILE_REQUIRED_ERROR = "Choose a CSV file before uploading.";

const WALLET_OPTIONS: { value: WalletType; label: string }[] = [
  { value: "DIVIDENDS", label: "Dividends" },
  { value: "OVERALL_RECOMMENDED", label: "Overall Recommended" },
  { value: "SMALL_CAPS", label: "Small Caps" },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function extractApiErrorMessage(body: unknown): string {
  if (
    body !== null &&
    typeof body === "object" &&
    "message" in body &&
    (body as { message?: unknown }).message !== undefined
  ) {
    const { message } = body as { message: unknown };
    if (Array.isArray(message)) {
      return message.join(", ");
    }
    if (typeof message === "string") {
      return message;
    }
  }
  return UNEXPECTED_ERROR;
}

export function RecommendedPortfoliosUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [wallet, setWallet] = useState<WalletType | "">("");
  const [effectiveDate, setEffectiveDate] = useState(todayIsoDate());
  const [sourceName, setSourceName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedPortfolio, setUploadedPortfolio] =
    useState<RecommendedPortfolio | null>(null);
  const [latest, setLatest] = useState<RecommendedPortfolio[]>([]);

  useEffect(() => {
    let cancelled = false;

    apiFetch<RecommendedPortfolio[]>("/advisor/recommended-portfolios/latest")
      .then((portfolios) => {
        if (!cancelled) {
          setLatest(portfolios);
        }
      })
      .catch(() => {
        // Nothing already loaded yet, or the fetch failed — either way the
        // "already loaded" summary is just empty, not an error state.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUploadedPortfolio(null);

    if (wallet === "") {
      setError(WALLET_REQUIRED_ERROR);
      return;
    }

    if (!file) {
      setError(FILE_REQUIRED_ERROR);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (effectiveDate.trim().length > 0) {
        formData.append("effectiveDate", effectiveDate.trim());
      }
      if (sourceName.trim().length > 0) {
        formData.append("sourceName", sourceName.trim());
      }

      const portfolio = await apiFetchMultipart<RecommendedPortfolio>(
        `/advisor/recommended-portfolios/upload?wallet=${wallet}`,
        formData,
      );
      setUploadedPortfolio(portfolio);
      setLatest((previous) => [
        ...previous.filter((entry) => entry.walletType !== portfolio.walletType),
        portfolio,
      ]);
      setFile(null);
      setSourceName("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(extractApiErrorMessage(err.body));
      } else {
        setError(UNEXPECTED_ERROR);
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <p>Upload a research house&apos;s model wallet CSV, one wallet at a time.</p>
      <p>
        Each upload adds a new snapshot to that wallet&apos;s history — it never
        replaces or deletes a previous upload, so re-uploading is always safe.
      </p>

      {latest.length > 0 && (
        <ul>
          {latest.map((portfolio) => (
            <li key={portfolio.id}>
              {portfolio.walletType}: {portfolio.effectiveDate}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="recommended-portfolio-wallet">Wallet</label>
          <select
            id="recommended-portfolio-wallet"
            value={wallet}
            onChange={(event) => {
              setWallet(event.target.value as WalletType | "");
              setError(null);
            }}
            disabled={isUploading}
          >
            <option value="">Select a wallet</option>
            {WALLET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="recommended-portfolio-effective-date">
            Effective date
          </label>
          <input
            id="recommended-portfolio-effective-date"
            type="date"
            value={effectiveDate}
            onChange={(event) => setEffectiveDate(event.target.value)}
            disabled={isUploading}
          />
        </div>

        <div>
          <label htmlFor="recommended-portfolio-source">Source (optional)</label>
          <input
            id="recommended-portfolio-source"
            type="text"
            value={sourceName}
            onChange={(event) => setSourceName(event.target.value)}
            disabled={isUploading}
          />
        </div>

        <div>
          <label htmlFor="recommended-portfolio-csv">Wallet CSV</label>
          <input
            id="recommended-portfolio-csv"
            ref={inputRef}
            type="file"
            accept=".csv"
            disabled={isUploading}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <Button type="submit" loading={isUploading} disabled={isUploading}>
          Upload wallet
        </Button>
      </form>

      {error !== null && <p role="alert">{error}</p>}
      {uploadedPortfolio !== null && (
        <p>
          Added: {uploadedPortfolio.walletType} ({uploadedPortfolio.effectiveDate})
        </p>
      )}
    </div>
  );
}
