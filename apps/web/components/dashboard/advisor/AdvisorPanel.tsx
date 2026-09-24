"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import type { AdvisorAnalysis } from "../../../lib/types";
import { Button } from "../../ui/Button";
import { AdvisorAnalysisResult } from "./AdvisorAnalysisResult";

const UNEXPECTED_ERROR =
  "Something went wrong generating your analysis. Please try again.";

const LOAD_ERROR_NOTICE =
  "We couldn't load your saved analysis. You can still generate a new one.";

type PanelState = "idle" | "loading" | "report" | "error";

interface AdvisorPanelProps {
  /**
   * Seeds the panel from `GET /advisor/analysis/latest`, fetched
   * server-side in `(dashboard)/page.tsx` (`US-7_T-5`) so a previously
   * generated report is on screen on first paint, with no client round trip
   * and no extra Claude spend. `undefined` (the default) starts the panel in
   * `idle`, same as a `404` (no analysis yet) from that endpoint.
   */
  initialAnalysis?: AdvisorAnalysis;
  /**
   * Set when the server-side load of `GET /advisor/analysis/latest` itself
   * failed with something other than the expected `404` (e.g. a `500`). The
   * panel still starts in `idle` — it must never block the rest of the
   * dashboard — but shows an inline notice distinct from the silent,
   * error-free `404`/new-user case.
   */
  initialLoadFailed?: boolean;
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

/**
 * Owns the advisor panel's `idle` -> `loading` -> `report` | `error` state
 * machine (`specs/dashboard-ui/spec.md` Behavior Notes). Composes `AdvisorAnalysisResult` (rendered once an analysis is
 * held in state). Uploads live on `/data-sources`, not here. Seeded from `GET /advisor/analysis/latest` via
 * `initialAnalysis`/`initialLoadFailed`, fetched server-side by
 * `(dashboard)/page.tsx` (`US-7_T-5`) — this component itself does no
 * fetching on mount.
 */
export function AdvisorPanel({
  initialAnalysis,
  initialLoadFailed = false,
}: AdvisorPanelProps = {}) {
  const [state, setState] = useState<PanelState>(
    initialAnalysis ? "report" : "idle",
  );
  const [analysis, setAnalysis] = useState<AdvisorAnalysis | null>(
    initialAnalysis ?? null,
  );
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
        // Empty body: the API uses the user's most recent report.
        body: JSON.stringify({}),
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
      {state === "idle" && initialLoadFailed && (
        <p role="alert">{LOAD_ERROR_NOTICE}</p>
      )}

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
