import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("../../../lib/api-client", () => {
  class ApiError extends Error {
    readonly status: number;
    readonly body: unknown;

    constructor(status: number, body: unknown) {
      super(`API request failed with status ${status}`);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  }

  return {
    apiFetch: apiFetchMock,
    ApiError,
  };
});

vi.mock("./AdvisorReportUpload", () => ({
  AdvisorReportUpload: ({
    onUploaded,
  }: {
    onUploaded: (report: { id: string }) => void;
  }) => (
    <div data-testid="advisor-report-upload">
      <button
        type="button"
        onClick={() => onUploaded({ id: "report-42" })}
      >
        simulate report uploaded
      </button>
    </div>
  ),
}));

vi.mock("./RecommendedPortfoliosUpload", () => ({
  RecommendedPortfoliosUpload: () => (
    <div data-testid="recommended-portfolios-upload" />
  ),
}));

vi.mock("./AdvisorAnalysisResult", () => ({
  AdvisorAnalysisResult: ({ analysis }: { analysis: { summary: string } }) => (
    <div data-testid="advisor-analysis-result">{analysis.summary}</div>
  ),
}));

import { ApiError } from "../../../lib/api-client";
import { AdvisorPanel } from "./AdvisorPanel";
import type { AdvisorAnalysis } from "../../../lib/types";

function makeAnalysis(overrides: Partial<AdvisorAnalysis> = {}): AdvisorAnalysis {
  return {
    score: 7,
    summary: "Solid, diversified portfolio.",
    strengths: ["Well diversified"],
    risks: [],
    recommendations: ["Consider trimming PETR4"],
    impactMetrics: [{ label: "Sector concentration", value: "-2.5%" }],
    model: "claude-sonnet-5",
    createdAt: "2026-09-18T00:00:00.000Z",
    ...overrides,
  };
}

/** A promise plus its resolve/reject exposed for manual control mid-test. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("AdvisorPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts in idle state with the uploads and the generate button", () => {
    render(<AdvisorPanel />);

    expect(screen.getByTestId("advisor-report-upload")).toBeInTheDocument();
    expect(
      screen.getByTestId("recommended-portfolios-upload"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /generate portfolio analysis/i }),
    ).toBeInTheDocument();
  });

  it("enters loading on click and renders the analysis result on resolution", async () => {
    const { promise, resolve } = deferred<AdvisorAnalysis>();
    apiFetchMock.mockReturnValue(promise);
    const user = userEvent.setup();
    render(<AdvisorPanel />);

    await user.click(
      screen.getByRole("button", { name: /generate portfolio analysis/i }),
    );

    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());

    resolve(makeAnalysis({ summary: "Great job diversifying." }));

    expect(
      await screen.findByTestId("advisor-analysis-result"),
    ).toHaveTextContent("Great job diversifying.");
  });

  it("disables the button while a request is in flight, and a second click issues no second request", async () => {
    const { promise, resolve } = deferred<AdvisorAnalysis>();
    apiFetchMock.mockReturnValue(promise);
    const user = userEvent.setup();
    render(<AdvisorPanel />);

    const button = screen.getByRole("button", {
      name: /generate portfolio analysis/i,
    });
    await user.click(button);

    await waitFor(() => expect(button).toBeDisabled());

    // A disabled button swallows userEvent.click, but assert intent anyway:
    // even if it were re-triggered (e.g. via keyboard), the handler itself
    // guards against re-entry.
    await user.click(button);

    expect(apiFetchMock).toHaveBeenCalledTimes(1);

    resolve(makeAnalysis());
    await screen.findByTestId("advisor-analysis-result");
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });

  it("omits advisorReportId when no report was uploaded this session", async () => {
    apiFetchMock.mockResolvedValue(makeAnalysis());
    const user = userEvent.setup();
    render(<AdvisorPanel />);

    await user.click(
      screen.getByRole("button", { name: /generate portfolio analysis/i }),
    );

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));

    const [path, init] = apiFetchMock.mock.calls[0];
    expect(path).toBe("/advisor/analyze");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).not.toHaveProperty("advisorReportId");
  });

  it("includes advisorReportId when a report was uploaded this session", async () => {
    apiFetchMock.mockResolvedValue(makeAnalysis());
    const user = userEvent.setup();
    render(<AdvisorPanel />);

    await user.click(
      screen.getByRole("button", { name: /simulate report uploaded/i }),
    );

    await user.click(
      screen.getByRole("button", { name: /generate portfolio analysis/i }),
    );

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));

    const [, init] = apiFetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({ advisorReportId: "report-42" });
  });

  it("enters error state on a rejected analyze call, and retry re-issues and can succeed", async () => {
    apiFetchMock.mockRejectedValueOnce(
      new ApiError(502, { statusCode: 502, message: "Analysis failed" }),
    );
    const user = userEvent.setup();
    render(<AdvisorPanel />);

    await user.click(
      screen.getByRole("button", { name: /generate portfolio analysis/i }),
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    apiFetchMock.mockResolvedValueOnce(
      makeAnalysis({ summary: "Recovered analysis." }),
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByTestId("advisor-analysis-result"),
    ).toHaveTextContent("Recovered analysis.");
  });

  it("'Ask Another Question' returns to idle without a DELETE request and without losing the held analysis", async () => {
    apiFetchMock.mockResolvedValue(makeAnalysis({ summary: "First analysis." }));
    const user = userEvent.setup();
    render(<AdvisorPanel />);

    await user.click(
      screen.getByRole("button", { name: /generate portfolio analysis/i }),
    );

    await screen.findByTestId("advisor-analysis-result");

    await user.click(
      screen.getByRole("button", { name: /ask another question/i }),
    );

    expect(screen.getByTestId("advisor-report-upload")).toBeInTheDocument();
    expect(
      screen.getByTestId("recommended-portfolios-upload"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("advisor-analysis-result"),
    ).not.toBeInTheDocument();

    // No DELETE request of any kind was fired by the transition.
    const deleteCalls = apiFetchMock.mock.calls.filter(([, init]) => {
      const method = (init as RequestInit | undefined)?.method;
      return method === "DELETE";
    });
    expect(deleteCalls).toHaveLength(0);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });
});
