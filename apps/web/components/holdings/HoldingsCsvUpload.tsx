"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetchMultipart, ApiError } from "../../lib/api-client";
import type { CsvUploadResult } from "../../lib/types";

const UNEXPECTED_ERROR = "Something went wrong. Please try again.";

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

export function HoldingsCsvUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvUploadResult | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setResult(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiFetchMultipart<CsvUploadResult>(
        "/portfolio/holdings/upload-csv",
        formData,
      );
      setResult(response);
      router.refresh();
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

  return (
    <div>
      <label htmlFor="holdings-csv-upload">Upload CSV</label>
      <input
        id="holdings-csv-upload"
        ref={inputRef}
        type="file"
        accept=".csv"
        disabled={isUploading}
        onChange={handleChange}
      />
      {error !== null && <p role="alert">{error}</p>}
      {result !== null && (
        <div>
          <p>{result.created} created</p>
          <p>{result.updated} updated</p>
          {result.errors.length > 0 && (
            <ul>
              {result.errors.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
