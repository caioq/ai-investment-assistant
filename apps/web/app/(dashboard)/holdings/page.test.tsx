import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { HoldingWithAsset } from "../../../lib/types";

const { cookiesMock, apiFetchMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  apiFetchMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
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
    apiFetchMultipart: vi.fn(),
    ApiError,
  };
});

import HoldingsPage from "./page";

function cookieStoreWith(accessToken: string | undefined) {
  return {
    get: vi.fn((name: string) =>
      name === "access_token" && accessToken !== undefined
        ? { name, value: accessToken }
        : undefined,
    ),
  };
}

const holdingStub: HoldingWithAsset = {
  id: "holding-1",
  userId: "user-1",
  assetId: "asset-1",
  quantity: 100,
  avgPrice: 25,
  metadata: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  asset: {
    id: "asset-1",
    ticker: "PETR4",
    name: "Petrobras",
    assetType: "STOCK",
    currency: "BRL",
    exchange: "B3",
    sector: "Energy",
    subSector: null,
    investmentStyle: null,
    riskRating: null,
    currentPrice: 30,
    currentChangePct: 1.2,
    priceUpdatedAt: "2026-08-01T00:00:00.000Z",
  },
};

describe("HoldingsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders both the add form and the CSV upload", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    apiFetchMock.mockResolvedValue([]);

    const element = await HoldingsPage();
    render(<>{element}</>);

    expect(screen.getByLabelText("Ticker")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity")).toBeInTheDocument();
    expect(screen.getByLabelText("Average Price")).toBeInTheDocument();
    expect(screen.getByLabelText("Upload CSV")).toBeInTheDocument();
  });

  it("renders the current holdings from the stubbed GET /portfolio/holdings response", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    apiFetchMock.mockResolvedValue([holdingStub]);

    const element = await HoldingsPage();
    render(<>{element}</>);

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/portfolio/holdings",
      expect.objectContaining({
        headers: { Cookie: "access_token=valid-token" },
      }),
    );
    expect(screen.getByText("PETR4")).toBeInTheDocument();
    expect(screen.getByTestId("holdings-count")).toHaveTextContent("1 holding");
  });

  it("still renders both input affordances when the holdings response is empty", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    apiFetchMock.mockResolvedValue([]);

    const element = await HoldingsPage();
    render(<>{element}</>);

    expect(screen.getByLabelText("Ticker")).toBeInTheDocument();
    expect(screen.getByLabelText("Upload CSV")).toBeInTheDocument();
    expect(
      screen.getByText("You don't have any holdings yet.", { exact: false }),
    ).toBeInTheDocument();
  });
});
