import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { DataSourcesSummary } from "../../../lib/types";

const { cookiesMock, apiFetchMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  apiFetchMock: vi.fn(),
}));

// `next/font/local` is a build-time transform, not something Vitest can
// execute, so the loader is stubbed to the shape the page reads (same stub
// as `app/(auth)/layout.test.tsx`).
vi.mock("next/font/local", () => ({
  default: () => ({ variable: "font-fraunces-mock", className: "" }),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("../../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

import DataSourcesPage from "./page";

const EMPTY_SUMMARY: DataSourcesSummary = {
  assets: { count: 0, tickers: [], lastImportAt: null },
  holdings: { count: 0, lastImportAt: null },
  wallets: [],
  report: null,
};

const POPULATED_SUMMARY: DataSourcesSummary = {
  assets: {
    count: 128,
    tickers: ["PETR4", "VALE3"],
    lastImportAt: "2026-09-12T10:00:00.000Z",
  },
  holdings: { count: 12, lastImportAt: "2026-09-18T08:30:00.000Z" },
  wallets: [
    {
      walletType: "DIVIDENDS",
      effectiveDate: "2026-09-01T00:00:00.000Z",
      sourceName: "Research House",
      positions: 10,
    },
  ],
  report: {
    id: "report-1",
    title: "Carteira Recomendada — Setembro 2026",
    publisher: "Research House",
    publishedAt: "2026-09-05T00:00:00.000Z",
    fileName: "setembro-2026.pdf",
    uploadedAt: "2026-09-06T12:00:00.000Z",
  },
};

function cookieStoreWith(accessToken: string | undefined) {
  return {
    get: vi.fn((name: string) =>
      name === "access_token" && accessToken !== undefined
        ? { name, value: accessToken }
        : undefined,
    ),
  };
}

async function renderPage() {
  render(await DataSourcesPage());
}

beforeEach(() => {
  vi.clearAllMocks();
  cookiesMock.mockResolvedValue(cookieStoreWith("token-123"));
});

describe("DataSourcesPage", () => {
  it("renders the page heading and all four source card names", async () => {
    apiFetchMock.mockResolvedValue(EMPTY_SUMMARY);

    await renderPage();

    expect(
      screen.getByRole("heading", { name: "Data sources" }),
    ).toBeInTheDocument();
    for (const name of [
      "Assets",
      "Holdings",
      "Model wallets",
      "Research report",
    ]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it("forwards the access_token cookie to GET /data-sources/summary", async () => {
    apiFetchMock.mockResolvedValue(EMPTY_SUMMARY);

    await renderPage();

    expect(apiFetchMock).toHaveBeenCalledWith("/data-sources/summary", {
      headers: { Cookie: "access_token=token-123" },
    });
  });

  it("shows each card's meta line from the summary", async () => {
    apiFetchMock.mockResolvedValue(POPULATED_SUMMARY);

    await renderPage();

    expect(
      screen.getByRole("button", { name: /Assets/ }),
    ).toHaveTextContent("Sep 12, 2026 · 128 assets");
    expect(
      screen.getByRole("button", { name: /Holdings/ }),
    ).toHaveTextContent("Sep 18, 2026 · 12 positions");
    expect(
      screen.getByRole("button", { name: /Model wallets/ }),
    ).toHaveTextContent("1 of 3 wallets imported");
    expect(
      screen.getByRole("button", { name: /Research report/ }),
    ).toHaveTextContent("Carteira Recomendada — Setembro 2026 · Sep 5, 2026");
  });

  it("reads 'Never imported' on every card for an empty summary", async () => {
    apiFetchMock.mockResolvedValue(EMPTY_SUMMARY);

    await renderPage();

    expect(screen.getAllByText("Never imported")).toHaveLength(4);
  });

  it("opens on Assets and moves the selection when Holdings is clicked", async () => {
    apiFetchMock.mockResolvedValue(POPULATED_SUMMARY);
    const user = userEvent.setup();

    await renderPage();

    const assets = screen.getByRole("button", { name: /Assets/ });
    const holdings = screen.getByRole("button", { name: /Holdings/ });

    expect(assets).toHaveAttribute("aria-pressed", "true");
    expect(holdings).toHaveAttribute("aria-pressed", "false");

    await user.click(holdings);

    expect(holdings).toHaveAttribute("aria-pressed", "true");
    expect(assets).toHaveAttribute("aria-pressed", "false");
  });

  it("degrades to four 'Never imported' cards when the summary fetch rejects", async () => {
    apiFetchMock.mockRejectedValue(new Error("boom"));

    await expect(renderPage()).resolves.toBeUndefined();

    expect(
      screen.getByRole("heading", { name: "Data sources" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Never imported")).toHaveLength(4);
  });
});
