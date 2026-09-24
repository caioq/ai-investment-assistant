import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ImportLogEntry } from "../../lib/types";
import { ImportHistory } from "./ImportHistory";

function log(overrides: Partial<ImportLogEntry> = {}): ImportLogEntry {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    source: "ASSETS",
    walletType: null,
    fileName: "assets.csv",
    records: 42,
    status: "IMPORTED",
    message: null,
    errors: null,
    createdAt: "2026-09-12T10:00:00.000Z",
    ...overrides,
  };
}

describe("ImportHistory", () => {
  it("renders one body row per log, newest first, under real <th> headers", () => {
    const logs = [
      log({ id: "c", fileName: "newest.csv", createdAt: "2026-09-14T10:00:00.000Z" }),
      log({ id: "b", fileName: "middle.csv", createdAt: "2026-09-13T10:00:00.000Z" }),
      log({ id: "a", fileName: "oldest.csv", createdAt: "2026-09-12T10:00:00.000Z" }),
    ];

    render(<ImportHistory logs={logs} />);

    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(headers).toEqual(["Date", "Source", "File", "Records", "Status"]);

    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(bodyRows).toHaveLength(3);
    expect(bodyRows[0]).toHaveTextContent("newest.csv");
    expect(bodyRows[1]).toHaveTextContent("middle.csv");
    expect(bodyRows[2]).toHaveTextContent("oldest.csv");
  });

  it("shows '8 · 2 rejected' for a partial success and hides the messages until expanded", async () => {
    const user = userEvent.setup();
    const errors = ["row 3: unknown riskRating 'AA+'", "row 7: empty ticker"];

    render(<ImportHistory logs={[log({ records: 8, errors })]} />);

    expect(screen.getByText("8 · 2 rejected")).toBeInTheDocument();
    expect(screen.queryByText(errors[0])).not.toBeInTheDocument();
    expect(screen.queryByText(errors[1])).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /rejected rows/i }));

    expect(screen.getByText(errors[0])).toBeInTheDocument();
    expect(screen.getByText(errors[1])).toBeInTheDocument();
  });

  it("flips aria-expanded on the rejected-rows toggle", async () => {
    const user = userEvent.setup();

    render(
      <ImportHistory logs={[log({ records: 8, errors: ["row 3: bad", "row 7: bad"] })]} />,
    );

    const toggle = screen.getByRole("button", { name: /rejected rows/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("spells out a failed import rather than relying on colour alone", () => {
    render(
      <ImportHistory
        logs={[
          log({ status: "FAILED", records: 0, message: "File is not a CSV file." }),
          log({ id: "ok", status: "IMPORTED" }),
        ]}
      />,
    );

    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(within(bodyRows[0]).getByText("Failed")).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText("Imported")).toBeInTheDocument();
  });

  it("renders an empty state and no rows when nothing has been imported", () => {
    render(<ImportHistory logs={[]} />);

    expect(screen.queryAllByRole("row")).toHaveLength(0);
    expect(screen.getByText(/nothing has been imported yet/i)).toBeInTheDocument();
  });
});
