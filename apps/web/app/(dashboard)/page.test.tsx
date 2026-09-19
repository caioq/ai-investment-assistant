import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type {
  AdvisorAnalysis,
  AllocationSlice,
  PortfolioSummary,
  PerformanceResponse,
} from "../../lib/types";

const { cookiesMock, apiFetchMock, getCurrentUserMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  apiFetchMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("../../lib/api-client", () => {
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

vi.mock("./layout", () => ({
  getCurrentUser: getCurrentUserMock,
}));

import { ApiError } from "../../lib/api-client";
import DashboardPage from "./page";

function cookieStoreWith(accessToken: string | undefined) {
  return {
    get: vi.fn((name: string) =>
      name === "access_token" && accessToken !== undefined
        ? { name, value: accessToken }
        : undefined,
    ),
  };
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatBRL(value: number): string {
  return currencyFormatter.format(value).replace(/\s/g, " ");
}

const summaryStub: PortfolioSummary = {
  totalInvested: 100000,
  currentValue: 112000,
  gainLoss: 12000,
  returnPct: 12,
};

const performanceStub: PerformanceResponse = {
  series: [
    { date: "2026-08-27", value: 110000 },
    { date: "2026-08-28", value: 112000 },
  ],
  cagr: 0.1,
  volatility: 0.2,
  maxDrawdown: -0.05,
  vsBenchmarkPct: 1.5,
};

const sectorAllocationStub: AllocationSlice[] = [
  { label: "Financials", value: 60000, pct: 60, color: "#2563eb" },
  { label: "Energy", value: 40000, pct: 40, color: "#16a34a" },
];

const stockAllocationStub: AllocationSlice[] = [
  { label: "PETR4", value: 70000, pct: 62.5, color: "#2563eb" },
  { label: "VALE3", value: 42000, pct: 37.5, color: "#16a34a" },
];

const unclassifiedOnlyStub: AllocationSlice[] = [
  { label: "Unclassified", value: 112000, pct: 100, color: "#94a3b8" },
];

const advisorAnalysisStub: AdvisorAnalysis = {
  score: 7,
  summary: "A well-diversified portfolio with moderate concentration risk.",
  strengths: ["Broad sector diversification"],
  risks: ["Overweight in financials"],
  recommendations: ["Consider trimming financials exposure"],
  impactMetrics: [{ label: "Sector concentration", value: "32%" }],
  model: "claude-sonnet",
  createdAt: "2026-09-01T12:00:00.000Z",
};

function mockApiFetchByPath(implementations: Record<string, () => Promise<unknown>>) {
  apiFetchMock.mockImplementation((path: string) => {
    const matched = Object.entries(implementations).find(([prefix]) =>
      path.startsWith(prefix),
    );
    if (!matched) {
      return Promise.reject(new Error(`unexpected path: ${path}`));
    }
    return matched[1]();
  });
}

describe("DashboardPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders PortfolioHeader and SummaryCards with values from the stubbed responses", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });
    mockApiFetchByPath({
      "/portfolio/summary": () => Promise.resolve(summaryStub),
      "/portfolio/performance": () => Promise.resolve(performanceStub),
      "/advisor/analysis/latest": () =>
        Promise.reject(new ApiError(404, { message: "not found" })),
    });

    const element = await DashboardPage();
    render(<>{element}</>);

    expect(screen.getByText("Jordan Mercer", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText(formatBRL(112000)).length).toBeGreaterThan(0);
    expect(screen.getByText(formatBRL(12000))).toBeInTheDocument();
    expect(screen.getByText(formatBRL(100000))).toBeInTheDocument();

    // 112000 - 110000 = 2000 day change, from the last two performance points.
    const badge = screen.getByTestId("day-change-badge");
    expect(badge.textContent?.replace(/\s/g, " ")).toContain(formatBRL(2000));
  });

  it("issues the summary and performance fetches concurrently", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });

    let resolveSummary!: (value: PortfolioSummary) => void;
    let resolvePerformance!: (value: PerformanceResponse) => void;
    const summaryPromise = new Promise<PortfolioSummary>((resolve) => {
      resolveSummary = resolve;
    });
    const performancePromise = new Promise<PerformanceResponse>((resolve) => {
      resolvePerformance = resolve;
    });

    mockApiFetchByPath({
      "/portfolio/summary": () => summaryPromise,
      "/portfolio/performance": () => performancePromise,
      "/advisor/analysis/latest": () =>
        Promise.reject(new ApiError(404, { message: "not found" })),
      "/portfolio/allocation?by=sector": () =>
        Promise.resolve(sectorAllocationStub),
      "/portfolio/allocation?by=stock": () =>
        Promise.resolve(stockAllocationStub),
    });

    const pagePromise = DashboardPage();

    // Give the page's own awaits (cookies(), etc.) a chance to run without
    // letting either deferred fetch promise resolve — if the fetches were
    // sequential, only one call would exist by now.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(apiFetchMock).toHaveBeenCalledTimes(5);
    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/portfolio/summary"),
      expect.anything(),
    );
    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/portfolio/performance"),
      expect.anything(),
    );
    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/advisor/analysis/latest"),
      expect.anything(),
    );
    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/portfolio/allocation?by=sector"),
      expect.anything(),
    );
    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/portfolio/allocation?by=stock"),
      expect.anything(),
    );

    resolveSummary(summaryStub);
    resolvePerformance(performanceStub);
    await pagePromise;
  });

  it("still renders the summary cards, with an em-dash daily change, when GET /portfolio/performance rejects", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });
    mockApiFetchByPath({
      "/portfolio/summary": () => Promise.resolve(summaryStub),
      "/portfolio/performance": () =>
        Promise.reject(new ApiError(500, { message: "boom" })),
      "/advisor/analysis/latest": () =>
        Promise.reject(new ApiError(404, { message: "not found" })),
    });

    const element = await DashboardPage();
    render(<>{element}</>);

    expect(screen.getByText(formatBRL(12000))).toBeInTheDocument();
    expect(screen.getByText(formatBRL(100000))).toBeInTheDocument();
    expect(screen.queryByTestId("day-change-badge")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("derives dayChange from the last two points of a two-point series", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });
    mockApiFetchByPath({
      "/portfolio/summary": () => Promise.resolve(summaryStub),
      "/portfolio/performance": () =>
        Promise.resolve({
          ...performanceStub,
          series: [
            { date: "2026-08-26", value: 99000 },
            { date: "2026-08-27", value: 110000 },
            { date: "2026-08-28", value: 108500 },
          ],
        }),
      "/advisor/analysis/latest": () =>
        Promise.reject(new ApiError(404, { message: "not found" })),
    });

    const element = await DashboardPage();
    render(<>{element}</>);

    // 108500 - 110000 = -1500, from the last two of the three points.
    const badge = screen.getByTestId("day-change-badge");
    expect(badge.textContent?.replace(/\s/g, " ")).toContain(formatBRL(-1500));
  });

  it("seeds AdvisorPanel with a stubbed GET /advisor/analysis/latest, rendering it in report state", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });
    mockApiFetchByPath({
      "/portfolio/summary": () => Promise.resolve(summaryStub),
      "/portfolio/performance": () => Promise.resolve(performanceStub),
      "/advisor/analysis/latest": () => Promise.resolve(advisorAnalysisStub),
    });

    const element = await DashboardPage();
    render(<>{element}</>);

    expect(screen.getByText(advisorAnalysisStub.summary)).toBeInTheDocument();
  });

  it("starts AdvisorPanel in idle, with the rest of the dashboard rendering normally, when GET /advisor/analysis/latest 404s", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });
    mockApiFetchByPath({
      "/portfolio/summary": () => Promise.resolve(summaryStub),
      "/portfolio/performance": () => Promise.resolve(performanceStub),
      "/advisor/analysis/latest": () =>
        Promise.reject(new ApiError(404, { message: "not found" })),
    });

    const element = await DashboardPage();
    render(<>{element}</>);

    expect(screen.getByText("Jordan Mercer", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText(formatBRL(112000)).length).toBeGreaterThan(0);
    expect(screen.getByText("Generate Portfolio Analysis")).toBeInTheDocument();
    expect(screen.queryByText(advisorAnalysisStub.summary)).not.toBeInTheDocument();
  });

  it("degrades AdvisorPanel to idle with an inline notice, without taking down the rest of the dashboard, when GET /advisor/analysis/latest 500s", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });
    mockApiFetchByPath({
      "/portfolio/summary": () => Promise.resolve(summaryStub),
      "/portfolio/performance": () => Promise.resolve(performanceStub),
      "/advisor/analysis/latest": () =>
        Promise.reject(new ApiError(500, { message: "boom" })),
    });

    const element = await DashboardPage();
    render(<>{element}</>);

    expect(screen.getByText("Jordan Mercer", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText(formatBRL(112000)).length).toBeGreaterThan(0);
    expect(screen.getByText("Generate Portfolio Analysis")).toBeInTheDocument();
    expect(
      screen.getByText(/couldn.t load your saved analysis/i),
    ).toBeInTheDocument();
  });

  it("renders the sector and stock allocation donuts with their own stubbed slices, distinguishable by title", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });
    mockApiFetchByPath({
      "/portfolio/summary": () => Promise.resolve(summaryStub),
      "/portfolio/performance": () => Promise.resolve(performanceStub),
      "/advisor/analysis/latest": () =>
        Promise.reject(new ApiError(404, { message: "not found" })),
      "/portfolio/allocation?by=sector": () =>
        Promise.resolve(sectorAllocationStub),
      "/portfolio/allocation?by=stock": () =>
        Promise.resolve(stockAllocationStub),
    });

    const element = await DashboardPage();
    render(<>{element}</>);

    expect(screen.getByText("By sector")).toBeInTheDocument();
    expect(screen.getByText("By stock")).toBeInTheDocument();

    expect(screen.getByText("Financials")).toBeInTheDocument();
    expect(screen.getByText("Energy")).toBeInTheDocument();
    expect(screen.getByText("PETR4")).toBeInTheDocument();
    expect(screen.getByText("VALE3")).toBeInTheDocument();
  });

  it("fetches allocation with by=sector and by=stock query strings", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });
    mockApiFetchByPath({
      "/portfolio/summary": () => Promise.resolve(summaryStub),
      "/portfolio/performance": () => Promise.resolve(performanceStub),
      "/advisor/analysis/latest": () =>
        Promise.reject(new ApiError(404, { message: "not found" })),
      "/portfolio/allocation?by=sector": () =>
        Promise.resolve(sectorAllocationStub),
      "/portfolio/allocation?by=stock": () =>
        Promise.resolve(stockAllocationStub),
    });

    const element = await DashboardPage();
    render(<>{element}</>);

    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/portfolio/allocation?by=sector"),
      expect.anything(),
    );
    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/portfolio/allocation?by=stock"),
      expect.anything(),
    );
  });

  it("renders a solely-'Unclassified' allocation response as a normal slice, not the empty state", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });
    mockApiFetchByPath({
      "/portfolio/summary": () => Promise.resolve(summaryStub),
      "/portfolio/performance": () => Promise.resolve(performanceStub),
      "/advisor/analysis/latest": () =>
        Promise.reject(new ApiError(404, { message: "not found" })),
      "/portfolio/allocation?by=sector": () =>
        Promise.resolve(unclassifiedOnlyStub),
      "/portfolio/allocation?by=stock": () =>
        Promise.resolve(stockAllocationStub),
    });

    const element = await DashboardPage();
    render(<>{element}</>);

    expect(screen.getByText("Unclassified")).toBeInTheDocument();
    expect(screen.getAllByText(formatBRL(112000)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/no holdings yet/i)).not.toBeInTheDocument();
  });

  it("still renders the header, summary cards, and advisor panel when both allocation fetches reject", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });
    mockApiFetchByPath({
      "/portfolio/summary": () => Promise.resolve(summaryStub),
      "/portfolio/performance": () => Promise.resolve(performanceStub),
      "/advisor/analysis/latest": () =>
        Promise.reject(new ApiError(404, { message: "not found" })),
      "/portfolio/allocation?by=sector": () =>
        Promise.reject(new ApiError(500, { message: "boom" })),
      "/portfolio/allocation?by=stock": () =>
        Promise.reject(new ApiError(500, { message: "boom" })),
    });

    const element = await DashboardPage();
    render(<>{element}</>);

    expect(screen.getByText("Jordan Mercer", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText(formatBRL(112000)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no holdings yet/i)).toHaveLength(2);
  });
});
