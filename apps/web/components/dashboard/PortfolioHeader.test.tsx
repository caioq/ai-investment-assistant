import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortfolioHeader } from "./PortfolioHeader";

describe("PortfolioHeader", () => {
  it("renders the formatted BRL total and the user's name", () => {
    render(
      <PortfolioHeader
        userName="Ana"
        currentValue={125000.5}
        dayChange={0}
        dayChangePct={0}
      />,
    );

    expect(screen.getByText("Ana", { exact: false })).toBeInTheDocument();
    const expectedTotal = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
      .format(125000.5)
      .replace(/\s/g, " ");
    expect(screen.getByText(expectedTotal)).toBeInTheDocument();
  });

  it("renders a positive-tone badge with an up indicator for a positive dayChange", () => {
    render(
      <PortfolioHeader
        userName="Ana"
        currentValue={125000.5}
        dayChange={1200}
        dayChangePct={0.96}
      />,
    );

    const badge = screen.getByTestId("day-change-badge")
      .firstElementChild as HTMLElement;
    expect(badge).toHaveStyle({ color: "var(--emerald)" });
    expect(badge.textContent).toMatch(/^[↑▲]/);
  });

  it("renders a negative-tone badge for a negative dayChange", () => {
    render(
      <PortfolioHeader
        userName="Ana"
        currentValue={125000.5}
        dayChange={-800}
        dayChangePct={-0.64}
      />,
    );

    const badge = screen.getByTestId("day-change-badge")
      .firstElementChild as HTMLElement;
    expect(badge).toHaveStyle({ color: "var(--red)" });
  });

  it("renders an em-dash and no badge tone when dayChange is null, with no NaN or R$ 0,00", () => {
    render(
      <PortfolioHeader
        userName="Ana"
        currentValue={125000.5}
        dayChange={null}
        dayChangePct={null}
      />,
    );

    expect(screen.queryByTestId("day-change-badge")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("NaN");
    expect(document.body.textContent).not.toContain("R$ 0,00");
  });
});
