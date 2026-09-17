import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PortfolioSummary, PerformanceResponse } from "../../lib/types";

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
    });

    const element = await DashboardPage();
    render(<>{element}</>);

    expect(screen.getByText("Jordan Mercer", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(formatBRL(112000))).toBeInTheDocument();
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
    });

    const pagePromise = DashboardPage();

    // Give the page's own awaits (cookies(), etc.) a chance to run without
    // letting either deferred fetch promise resolve — if the fetches were
    // sequential, only one call would exist by now.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/portfolio/summary"),
      expect.anything(),
    );
    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/portfolio/performance"),
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
    });

    const element = await DashboardPage();
    render(<>{element}</>);

    // 108500 - 110000 = -1500, from the last two of the three points.
    const badge = screen.getByTestId("day-change-badge");
    expect(badge.textContent?.replace(/\s/g, " ")).toContain(formatBRL(-1500));
  });
});
