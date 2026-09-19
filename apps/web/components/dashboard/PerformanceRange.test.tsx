import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
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

import { PerformanceRange } from "./PerformanceRange";
import type { PerformanceResponse } from "../../lib/types";

function makeResponse(
  points: number,
  overrides: Partial<PerformanceResponse> = {},
): PerformanceResponse {
  return {
    series: Array.from({ length: points }, (_, i) => ({
      date: `2026-0${(i % 9) + 1}-01`,
      value: 100 + i,
    })),
    cagr: 0,
    volatility: 0,
    maxDrawdown: 0,
    vsBenchmarkPct: 0,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("PerformanceRange", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders initialData with no fetch fired on initial render", () => {
    const initialData = makeResponse(4);

    render(
      <PerformanceRange initialData={initialData} benchmark="IBOVESPA" />,
    );

    expect(apiFetchMock).not.toHaveBeenCalled();
    const d = screen.getByTestId("portfolio-line").getAttribute("d") ?? "";
    const commandCount = (d.match(/[ML]/g) ?? []).length;
    expect(commandCount).toBe(4);
  });

  it("fetches range=1Y on click and re-renders with the new series", async () => {
    const initialData = makeResponse(4);
    const newData = makeResponse(7);
    apiFetchMock.mockResolvedValue(newData);

    const user = userEvent.setup();
    render(
      <PerformanceRange initialData={initialData} benchmark="IBOVESPA" />,
    );

    await user.click(screen.getByRole("button", { name: "1Y" }));

    await waitFor(() => {
      const d = screen.getByTestId("portfolio-line").getAttribute("d") ?? "";
      const commandCount = (d.match(/[ML]/g) ?? []).length;
      expect(commandCount).toBe(7);
    });

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    const [path] = apiFetchMock.mock.calls[0];
    expect(path).toContain("range=1Y");
    expect(path).toContain("benchmark=IBOVESPA");
  });

  it("marks the active range with aria-pressed, both initially and after a click", async () => {
    const initialData = makeResponse(4);
    const newData = makeResponse(7);
    apiFetchMock.mockResolvedValue(newData);

    const user = userEvent.setup();
    render(
      <PerformanceRange initialData={initialData} benchmark="IBOVESPA" />,
    );

    expect(screen.getByRole("button", { name: "6M" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "1Y" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "ALL" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(screen.getByRole("button", { name: "1Y" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "1Y" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    expect(screen.getByRole("button", { name: "6M" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "ALL" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("ignores a stale response when a slower ALL request resolves after a faster 1Y request", async () => {
    const initialData = makeResponse(4);
    const allDeferred = deferred<PerformanceResponse>();
    const yearDeferred = deferred<PerformanceResponse>();

    apiFetchMock.mockImplementationOnce(() => allDeferred.promise);
    apiFetchMock.mockImplementationOnce(() => yearDeferred.promise);

    const user = userEvent.setup();
    render(
      <PerformanceRange initialData={initialData} benchmark="IBOVESPA" />,
    );

    await user.click(screen.getByRole("button", { name: "ALL" }));
    await user.click(screen.getByRole("button", { name: "1Y" }));

    // Resolve 1Y first, then ALL (out of order vs. click order).
    yearDeferred.resolve(makeResponse(7));
    await waitFor(() => {
      const d = screen.getByTestId("portfolio-line").getAttribute("d") ?? "";
      const commandCount = (d.match(/[ML]/g) ?? []).length;
      expect(commandCount).toBe(7);
    });

    allDeferred.resolve(makeResponse(20));

    // Give the (ignored) ALL resolution a tick to (not) apply.
    await new Promise((r) => setTimeout(r, 0));

    const d = screen.getByTestId("portfolio-line").getAttribute("d") ?? "";
    const commandCount = (d.match(/[ML]/g) ?? []).length;
    expect(commandCount).toBe(7);
    expect(screen.getByRole("button", { name: "1Y" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps the previous series and shows a retry affordance when a fetch rejects", async () => {
    const initialData = makeResponse(4);
    apiFetchMock.mockRejectedValueOnce(new Error("network failure"));

    const user = userEvent.setup();
    render(
      <PerformanceRange initialData={initialData} benchmark="IBOVESPA" />,
    );

    await user.click(screen.getByRole("button", { name: "1Y" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /retry/i }),
      ).toBeInTheDocument();
    });

    const d = screen.getByTestId("portfolio-line").getAttribute("d") ?? "";
    const commandCount = (d.match(/[ML]/g) ?? []).length;
    expect(commandCount).toBe(4);
  });
});
