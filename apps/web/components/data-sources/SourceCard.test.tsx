import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SourceCard } from "./SourceCard";

describe("SourceCard", () => {
  const baseProps = {
    step: 1,
    name: "Assets",
    format: "CSV" as const,
    description: "Master list of tickers with sector, style and risk rating.",
    meta: "Sep 12, 2026 · 128 assets",
  };

  it("renders the step number, name, format label, description and meta line", () => {
    render(<SourceCard {...baseProps} selected={false} onSelect={vi.fn()} />);

    const card = screen.getByRole("button", { name: /Assets/ });
    expect(card).toHaveTextContent("1");
    expect(card).toHaveTextContent("Assets");
    expect(card).toHaveTextContent("CSV");
    expect(card).toHaveTextContent(baseProps.description);
    expect(card).toHaveTextContent("Sep 12, 2026 · 128 assets");
  });

  it("is a button press: aria-pressed reflects the selected state", () => {
    const { rerender } = render(
      <SourceCard {...baseProps} selected={false} onSelect={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: /Assets/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    rerender(<SourceCard {...baseProps} selected onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Assets/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("calls onSelect when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SourceCard {...baseProps} selected={false} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /Assets/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
