import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { apiFetchMock, apiFetchMultipartMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  apiFetchMultipartMock: vi.fn(),
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
    apiFetchMultipart: apiFetchMultipartMock,
    ApiError,
  };
});

import { RecommendedPortfoliosUpload } from "./RecommendedPortfoliosUpload";
import type { RecommendedPortfolio } from "../../../lib/types";

function makePortfolio(
  overrides: Partial<RecommendedPortfolio> = {},
): RecommendedPortfolio {
  return {
    id: "portfolio-1",
    userId: "user-1",
    walletType: "SMALL_CAPS",
    sourceName: null,
    effectiveDate: "2026-09-18",
    uploadedAt: "2026-09-18T00:00:00.000Z",
    holdings: [],
    ...overrides,
  };
}

function makeCsvFile(name = "wallet.csv") {
  return new File(["CODIGO,PRECO_TETO\nPETR4,40.99"], name, {
    type: "text/csv",
  });
}

describe("RecommendedPortfoliosUpload", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a validation error and fires no request when submitting without a wallet", async () => {
    apiFetchMock.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<RecommendedPortfoliosUpload />);

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    apiFetchMock.mockClear();

    const input = screen.getByLabelText(/csv/i) as HTMLInputElement;
    await user.upload(input, makeCsvFile());

    const submitButton = screen.getByRole("button", { name: /upload/i });
    await user.click(submitButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(/wallet/i);
    expect(apiFetchMultipartMock).not.toHaveBeenCalled();
  });

  it("posts to the URL carrying wallet=SMALL_CAPS with the file in the FormData", async () => {
    apiFetchMock.mockResolvedValue([]);
    apiFetchMultipartMock.mockResolvedValue(makePortfolio());
    const user = userEvent.setup();
    render(<RecommendedPortfoliosUpload />);

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());

    await user.selectOptions(
      screen.getByLabelText("Wallet"),
      "SMALL_CAPS",
    );

    const file = makeCsvFile();
    const input = screen.getByLabelText(/csv/i) as HTMLInputElement;
    await user.upload(input, file);

    const submitButton = screen.getByRole("button", { name: /upload/i });
    await user.click(submitButton);

    await waitFor(() => expect(apiFetchMultipartMock).toHaveBeenCalled());

    const [path, formData] = apiFetchMultipartMock.mock.calls[0];
    expect(path).toBe(
      "/advisor/recommended-portfolios/upload?wallet=SMALL_CAPS",
    );
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get("file")).toBe(file);
  });

  it("sends an edited effectiveDate as a form field in the same FormData", async () => {
    apiFetchMock.mockResolvedValue([]);
    apiFetchMultipartMock.mockResolvedValue(makePortfolio());
    const user = userEvent.setup();
    render(<RecommendedPortfoliosUpload />);

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());

    await user.selectOptions(
      screen.getByLabelText("Wallet"),
      "DIVIDENDS",
    );

    const dateInput = screen.getByLabelText(
      /effective date/i,
    ) as HTMLInputElement;
    await user.clear(dateInput);
    await user.type(dateInput, "2026-01-15");

    const input = screen.getByLabelText(/csv/i) as HTMLInputElement;
    await user.upload(input, makeCsvFile());

    await user.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() => expect(apiFetchMultipartMock).toHaveBeenCalled());

    const [, formData] = apiFetchMultipartMock.mock.calls[0];
    expect((formData as FormData).get("effectiveDate")).toBe("2026-01-15");
  });

  it("renders one row per wallet from GET /advisor/recommended-portfolios/latest with its effectiveDate", async () => {
    apiFetchMock.mockResolvedValue([
      makePortfolio({ walletType: "DIVIDENDS", effectiveDate: "2026-08-01" }),
      makePortfolio({
        walletType: "SMALL_CAPS",
        effectiveDate: "2026-07-15",
      }),
    ]);
    render(<RecommendedPortfoliosUpload />);

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(apiFetchMock.mock.calls[0][0]).toBe(
      "/advisor/recommended-portfolios/latest",
    );

    expect(await screen.findByText(/DIVIDENDS/)).toBeInTheDocument();
    expect(screen.getByText(/2026-08-01/)).toBeInTheDocument();
    expect(screen.getByText(/SMALL_CAPS/)).toBeInTheDocument();
    expect(screen.getByText(/2026-07-15/)).toBeInTheDocument();
  });

  it("disables the control while the upload is in flight", async () => {
    apiFetchMock.mockResolvedValue([]);
    let resolveUpload: (value: unknown) => void = () => {};
    apiFetchMultipartMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<RecommendedPortfoliosUpload />);

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());

    await user.selectOptions(
      screen.getByLabelText("Wallet"),
      "OVERALL_RECOMMENDED",
    );
    const input = screen.getByLabelText(/csv/i) as HTMLInputElement;
    await user.upload(input, makeCsvFile());

    const submitButton = screen.getByRole("button", { name: /upload/i });
    await user.click(submitButton);

    await waitFor(() => expect(submitButton).toBeDisabled());
    expect(input).toBeDisabled();

    resolveUpload(makePortfolio());
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });
});
