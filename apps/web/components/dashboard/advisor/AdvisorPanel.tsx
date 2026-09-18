"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import type { AdvisorAnalysis, AdvisorReport } from "../../../lib/types";
import { Button } from "../../ui/Button";
import { AdvisorReportUpload } from "./AdvisorReportUpload";
import { RecommendedPortfoliosUpload } from "./RecommendedPortfoliosUpload";
import { AdvisorAnalysisResult } from "./AdvisorAnalysisResult";

const UNEXPECTED_ERROR =
  "Something went wrong generating your analysis. Please try again.";

type PanelState = "idle" | "loading" | "report" | "error";

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

/**
 * Owns the advisor panel's `idle` -> `loading` -> `report` | `error` state
 * machine (`specs/dashboard-ui/spec.md` Behavior Notes). Composes the three
 * leaf components from earlier `US-7` tasks: `AdvisorReportUpload` (whose
 * `onUploaded` callback is captured here purely to remember the uploaded
 * report's id, nothing else), `RecommendedPortfoliosUpload` (self-contained,
 * takes no props), and `AdvisorAnalysisResult` (rendered once an analysis is
 * held in state). Does not load `GET /advisor/analysis/latest` on mount —
 * that is `US-7_T-5`'s job, layered on top of this component.
 */
export function AdvisorPanel() {
  const [state, setState] = useState<PanelState>("idle");
  const [advisorReportId, setAdvisorReportId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AdvisorAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLoading = state === "loading";

  async function generateAnalysis() {
    // Belt-and-suspenders re-entry guard: the button is disabled for the
    // entire in-flight duration below, but a disabled button can still be
    // re-triggered via keyboard in some edge cases, and every call here is a
    // paid Claude request — this must never fire twice concurrently.
    if (isLoading) {
      return;
    }

    setState("loading");
    setErrorMessage(null);

    try {
      const result = await apiFetch<AdvisorAnalysis>("/advisor/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(advisorReportId ? { advisorReportId } : {}),
        }),
      });
      setAnalysis(result);
      setState("report");
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? extractApiErrorMessage(err.body) : UNEXPECTED_ERROR,
      );
      setState("error");
    }
  }

  function handleReportUploaded(report: AdvisorReport) {
    setAdvisorReportId(report.id);
  }

  // "Ask Another Question" is a purely local transition back to `idle` — no
  // DELETE request, and `analysis` is deliberately left in state (not
  // cleared) rather than nulled out, per the story's "deletes nothing" note.
  function handleAskAnotherQuestion() {
    setState("idle");
  }

  if (state === "report" && analysis) {
    return (
      <div>
        <AdvisorAnalysisResult analysis={analysis} />
        <Button type="button" variant="secondary" onClick={handleAskAnotherQuestion}>
          Ask Another Question
        </Button>
      </div>
    );
  }

  return (
    <div>
      <AdvisorReportUpload onUploaded={handleReportUploaded} />
      <RecommendedPortfoliosUpload />

      {state === "loading" && (
        <div role="status">
          <p>Generating your portfolio analysis&hellip;</p>
          <p>
            This usually takes up to a minute — the advisor is reading your
            holdings, any report you added, and the model wallets before
            writing up its findings.
          </p>
        </div>
      )}

      {state === "error" && errorMessage !== null && (
        <p role="alert">{errorMessage}</p>
      )}

      <Button type="button" onClick={generateAnalysis} disabled={isLoading}>
        {state === "error" ? "Retry" : "Generate Portfolio Analysis"}
      </Button>
    </div>
  );
}
