"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { apiFetch, apiFetchMultipart, ApiError } from "../../../lib/api-client";
import type { AdvisorReport } from "../../../lib/types";
import { Button } from "../../ui/Button";

const UNEXPECTED_ERROR = "Something went wrong. Please try again.";

type UploadMode = "pdf" | "paste";

export interface AdvisorReportUploadProps {
  onUploaded: (report: AdvisorReport) => void;
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

export function AdvisorReportUpload({ onUploaded }: AdvisorReportUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<UploadMode>("pdf");
  const [sourceName, setSourceName] = useState("");
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedReport, setUploadedReport] = useState<AdvisorReport | null>(
    null,
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setUploadedReport(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const report = await apiFetchMultipart<AdvisorReport>(
        "/advisor/reports/upload",
        formData,
      );
      setUploadedReport(report);
      onUploaded(report);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(extractApiErrorMessage(err.body));
      } else {
        setError(UNEXPECTED_ERROR);
      }
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handlePasteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (text.trim().length === 0) {
      return;
    }

    setError(null);
    setUploadedReport(null);
    setIsUploading(true);

    try {
      const report = await apiFetch<AdvisorReport>("/advisor/reports/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceName: sourceName.trim().length > 0 ? sourceName.trim() : undefined,
          text,
        }),
      });
      setUploadedReport(report);
      onUploaded(report);
      setSourceName("");
      setText("");
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
      <p>Add a report for extra context (optional) — the advisor works without one.</p>
      <div role="tablist" aria-label="Report upload method">
        <Button
          type="button"
          variant={mode === "pdf" ? "primary" : "secondary"}
          onClick={() => {
            setMode("pdf");
            setError(null);
          }}
          disabled={isUploading}
        >
          Upload PDF
        </Button>
        <Button
          type="button"
          variant={mode === "paste" ? "primary" : "secondary"}
          onClick={() => {
            setMode("paste");
            setError(null);
          }}
          disabled={isUploading}
        >
          Paste text
        </Button>
      </div>

      {mode === "pdf" && (
        <div>
          <label htmlFor="advisor-report-pdf">Report PDF</label>
          <input
            id="advisor-report-pdf"
            ref={inputRef}
            type="file"
            accept=".pdf"
            disabled={isUploading}
            onChange={handleFileChange}
          />
        </div>
      )}

      {mode === "paste" && (
        <form onSubmit={handlePasteSubmit}>
          <div>
            <label htmlFor="advisor-report-source">Source (optional)</label>
            <input
              id="advisor-report-source"
              type="text"
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
              disabled={isUploading}
            />
          </div>
          <div>
            <label htmlFor="advisor-report-text">Report text</label>
            <textarea
              id="advisor-report-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={isUploading}
              required
            />
          </div>
          <Button type="submit" loading={isUploading} disabled={isUploading}>
            Add report
          </Button>
        </form>
      )}

      {error !== null && <p role="alert">{error}</p>}
      {uploadedReport !== null && (
        <p>
          Added: {uploadedReport.sourceName ?? uploadedReport.fileName ?? "report"}
        </p>
      )}
    </div>
  );
}
