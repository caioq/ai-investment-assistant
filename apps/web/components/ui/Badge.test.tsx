import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("applies the positive tone for tone=\"positive\"", () => {
    render(<Badge tone="positive">+3.2%</Badge>);

    const badge = screen.getByText("+3.2%");
    expect(badge).toHaveStyle({ color: "var(--emerald)" });
  });

  it("applies the negative tone for tone=\"negative\"", () => {
    render(<Badge tone="negative">-1.4%</Badge>);

    const badge = screen.getByText("-1.4%");
    expect(badge).toHaveStyle({ color: "var(--red)" });
  });
});
