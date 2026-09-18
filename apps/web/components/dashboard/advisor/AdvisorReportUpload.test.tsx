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

import { ApiError } from "../../../lib/api-client";
import { AdvisorReportUpload } from "./AdvisorReportUpload";
import type { AdvisorReport } from "../../../lib/types";

function makeReport(overrides: Partial<AdvisorReport> = {}): AdvisorReport {
  return {
    id: "report-1",
    userId: "user-1",
    sourceName: null,
    fileName: "report.pdf",
    rawText: "some extracted text",
    uploadedAt: "2026-09-18T00:00:00.000Z",
    ...overrides,
  };
}

function makePdfFile(name = "report.pdf") {
  return new File(["%PDF-1.4 fake pdf content"], name, {
    type: "application/pdf",
  });
}

describe("AdvisorReportUpload", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends the selected PDF as multipart form data via apiFetchMultipart", async () => {
    const report = makeReport();
    apiFetchMultipartMock.mockResolvedValue(report);
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<AdvisorReportUpload onUploaded={onUploaded} />);

    const input = screen.getByLabelText(/pdf/i) as HTMLInputElement;
    const file = makePdfFile();
    await user.upload(input, file);

    await waitFor(() => expect(apiFetchMultipartMock).toHaveBeenCalled());
    expect(apiFetchMock).not.toHaveBeenCalled();

    const [path, formData] = apiFetchMultipartMock.mock.calls[0];
    expect(path).toBe("/advisor/reports/upload");
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get("file")).toBe(file);
  });

  it("sends the pasted text as a JSON body via apiFetch", async () => {
    const report = makeReport({ sourceName: "XP Research", fileName: null });
    apiFetchMock.mockResolvedValue(report);
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<AdvisorReportUpload onUploaded={onUploaded} />);

    await user.click(screen.getByRole("button", { name: /paste/i }));

    const sourceInput = screen.getByLabelText(/source/i);
    await user.type(sourceInput, "XP Research");

    const textInput = screen.getByLabelText(/text/i);
    await user.type(textInput, "some pasted report text");

    await user.click(screen.getByRole("button", { name: "Add report" }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(apiFetchMultipartMock).not.toHaveBeenCalled();

    const [path, init] = apiFetchMock.mock.calls[0];
    expect(path).toBe("/advisor/reports/upload");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      text: "some pasted report text",
      sourceName: "XP Research",
    });
  });

  it("invokes onUploaded with the created report on success (PDF path)", async () => {
    const report = makeReport();
    apiFetchMultipartMock.mockResolvedValue(report);
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<AdvisorReportUpload onUploaded={onUploaded} />);

    const input = screen.getByLabelText(/pdf/i) as HTMLInputElement;
    await user.upload(input, makePdfFile());

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(report));
  });

  it("invokes onUploaded with the created report on success (paste path)", async () => {
    const report = makeReport({ sourceName: "XP Research", fileName: null });
    apiFetchMock.mockResolvedValue(report);
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<AdvisorReportUpload onUploaded={onUploaded} />);

    await user.click(screen.getByRole("button", { name: /paste/i }));
    await user.type(screen.getByLabelText(/text/i), "some pasted report text");
    await user.click(screen.getByRole("button", { name: "Add report" }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(report));
  });

  it("disables the control while the upload is in flight", async () => {
    let resolveUpload: (value: unknown) => void = () => {};
    apiFetchMultipartMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<AdvisorReportUpload onUploaded={onUploaded} />);

    const input = screen.getByLabelText(/pdf/i) as HTMLInputElement;
    await user.upload(input, makePdfFile());

    await waitFor(() => expect(input).toBeDisabled());

    resolveUpload(makeReport());
    await waitFor(() => expect(input).not.toBeDisabled());
  });

  it("renders an error and does not invoke onUploaded on a rejected upload", async () => {
    apiFetchMultipartMock.mockRejectedValue(
      new ApiError(400, { statusCode: 400, message: "Invalid PDF" }),
    );
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<AdvisorReportUpload onUploaded={onUploaded} />);

    const input = screen.getByLabelText(/pdf/i) as HTMLInputElement;
    await user.upload(input, makePdfFile());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onUploaded).not.toHaveBeenCalled();
    await waitFor(() => expect(input).not.toBeDisabled());
  });
});
