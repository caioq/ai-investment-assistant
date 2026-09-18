import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { apiFetchMock, refreshMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  refreshMock: vi.fn(),
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { ApiError } from "../../lib/api-client";
import { AddHoldingForm } from "./AddHoldingForm";

async function fillForm(user: ReturnType<typeof userEvent.setup>, ticker: string, quantity: string, avgPrice: string) {
  await user.type(screen.getByLabelText(/ticker/i), ticker);
  await user.type(screen.getByLabelText(/quantity/i), quantity);
  await user.type(screen.getByLabelText(/avg price|average price/i), avgPrice);
}

describe("AddHoldingForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("posts an upper-cased ticker and numeric quantity/avgPrice from lower-case, string-typed input", async () => {
    apiFetchMock.mockResolvedValue({ id: "holding-1" });
    const user = userEvent.setup();
    render(<AddHoldingForm />);

    await fillForm(user, "petr4", "100", "32.5");
    await user.click(screen.getByRole("button", { name: /add holding/i }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/portfolio/holdings",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ ticker: "PETR4", quantity: 100, avgPrice: 32.5 }),
        }),
      );
    });
  });

  it("rejects a zero or negative quantity client-side and fires no request", async () => {
    const user = userEvent.setup();
    render(<AddHoldingForm />);

    await fillForm(user, "petr4", "0", "32.5");
    await user.click(screen.getByRole("button", { name: /add holding/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/quantity/i);
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("disables submit while the request is in flight", async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    apiFetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<AddHoldingForm />);

    await fillForm(user, "petr4", "100", "32.5");
    await user.click(screen.getByRole("button", { name: /add holding/i }));

    const button = screen.getByRole("button", { name: /add holding/i });
    await waitFor(() => expect(button).toBeDisabled());

    resolveRequest({ id: "holding-1" });
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("clears the form fields and calls router.refresh() on a successful submission", async () => {
    apiFetchMock.mockResolvedValue({ id: "holding-1" });
    const user = userEvent.setup();
    render(<AddHoldingForm />);

    await fillForm(user, "petr4", "100", "32.5");
    await user.click(screen.getByRole("button", { name: /add holding/i }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());

    expect(screen.getByLabelText(/ticker/i)).toHaveValue("");
    expect(screen.getByLabelText(/quantity/i)).toHaveValue(null);
    expect(screen.getByLabelText(/avg price|average price/i)).toHaveValue(null);
  });

  it("renders the API's validation message inline on a 400", async () => {
    apiFetchMock.mockRejectedValue(
      new ApiError(400, { statusCode: 400, message: ["ticker must be longer than 0 characters"], error: "Bad Request" }),
    );
    const user = userEvent.setup();
    render(<AddHoldingForm />);

    await fillForm(user, "petr4", "100", "32.5");
    await user.click(screen.getByRole("button", { name: /add holding/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ticker must be longer than 0 characters",
    );
  });
});
