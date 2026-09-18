import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { apiFetchMultipartMock, refreshMock } = vi.hoisted(() => ({
  apiFetchMultipartMock: vi.fn(),
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
    apiFetchMultipart: apiFetchMultipartMock,
    ApiError,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { ApiError } from "../../lib/api-client";
import { HoldingsCsvUpload } from "./HoldingsCsvUpload";

function makeCsvFile(name = "holdings.csv") {
  return new File(["Ticker,Quantidade,Preco Médio\nPETR4,100,32.50"], name, {
    type: "text/csv",
  });
}

async function selectFile(
  user: ReturnType<typeof userEvent.setup>,
  file: File,
) {
  const input = screen.getByLabelText(/csv/i) as HTMLInputElement;
  await user.upload(input, file);
  return input;
}

describe("HoldingsCsvUpload", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends the selected file as multipart form data via apiFetchMultipart, without an explicit Content-Type", async () => {
    apiFetchMultipartMock.mockResolvedValue({
      created: 1,
      updated: 0,
      errors: [],
    });
    const user = userEvent.setup();
    render(<HoldingsCsvUpload />);

    const file = makeCsvFile();
    await selectFile(user, file);

    await waitFor(() => expect(apiFetchMultipartMock).toHaveBeenCalled());

    const [path, formData, init] = apiFetchMultipartMock.mock.calls[0];
    expect(path).toBe("/portfolio/holdings/upload-csv");
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get("file")).toBe(file);
    expect(init === undefined || (init as RequestInit).headers === undefined).toBe(true);
  });

  it("renders both counts and no error list for a clean import", async () => {
    apiFetchMultipartMock.mockResolvedValue({
      created: 12,
      updated: 3,
      errors: [],
    });
    const user = userEvent.setup();
    render(<HoldingsCsvUpload />);

    await selectFile(user, makeCsvFile());

    expect(await screen.findByText(/12 created/i)).toBeInTheDocument();
    expect(screen.getByText(/3 updated/i)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("renders success counts AND every error entry for a partial import", async () => {
    apiFetchMultipartMock.mockResolvedValue({
      created: 9,
      updated: 0,
      errors: ["row 4: unknown ticker XPTO99", "row 7: quantity must be positive"],
    });
    const user = userEvent.setup();
    render(<HoldingsCsvUpload />);

    await selectFile(user, makeCsvFile());

    expect(await screen.findByText(/9 created/i)).toBeInTheDocument();
    expect(screen.getByText(/0 updated/i)).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("row 4: unknown ticker XPTO99");
    expect(items[1]).toHaveTextContent("row 7: quantity must be positive");
  });

  it("disables the file input while the upload is in flight", async () => {
    let resolveUpload: (value: unknown) => void = () => {};
    apiFetchMultipartMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<HoldingsCsvUpload />);

    const input = await selectFile(user, makeCsvFile());
    await waitFor(() => expect(input).toBeDisabled());

    resolveUpload({ created: 1, updated: 0, errors: [] });
    await waitFor(() => expect(input).not.toBeDisabled());
  });

  it("calls router.refresh() after a successful upload", async () => {
    apiFetchMultipartMock.mockResolvedValue({
      created: 1,
      updated: 0,
      errors: [],
    });
    const user = userEvent.setup();
    render(<HoldingsCsvUpload />);

    await selectFile(user, makeCsvFile());

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("renders an error message and leaves the input usable again after a rejected upload", async () => {
    apiFetchMultipartMock.mockRejectedValue(
      new ApiError(500, { statusCode: 500, message: "Internal Server Error" }),
    );
    const user = userEvent.setup();
    render(<HoldingsCsvUpload />);

    const input = await selectFile(user, makeCsvFile());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await waitFor(() => expect(input).not.toBeDisabled());

    apiFetchMultipartMock.mockResolvedValue({
      created: 1,
      updated: 0,
      errors: [],
    });
    await selectFile(user, makeCsvFile("holdings-2.csv"));

    await waitFor(() => expect(apiFetchMultipartMock).toHaveBeenCalledTimes(2));
  });
});
