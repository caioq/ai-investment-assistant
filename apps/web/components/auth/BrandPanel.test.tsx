import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandPanel } from "./BrandPanel";
import { PRODUCT_NAME, TRUST_SIGNALS } from "./auth-content";

describe("BrandPanel", () => {
  it('renders the Sign in headline and value points for mode="signin"', () => {
    render(<BrandPanel mode="signin" />);

    expect(
      screen.getByText("Your whole portfolio, in one clear view."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Allocation by sector, stock, investment style, and risk",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Performance measured against Ibovespa and CDI"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "AI portfolio reviews: strengths, risks, and recommendations",
      ),
    ).toBeInTheDocument();
  });

  it('renders the Create account headline and value points for mode="signup"', () => {
    render(<BrandPanel mode="signup" />);

    expect(
      screen.getByText("Start with clarity, not spreadsheets."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Import your holdings from a simple CSV file"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Compare against your research house's model portfolios",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No brokerage credentials needed, ever"),
    ).toBeInTheDocument();
  });

  it.each(["signin", "signup"] as const)(
    "renders PRODUCT_NAME and the three trust signals in %s mode",
    (mode) => {
      render(<BrandPanel mode={mode} />);

      expect(PRODUCT_NAME).toBe("AI Investment Assistant");
      expect(screen.getByText(PRODUCT_NAME)).toBeInTheDocument();
      expect(TRUST_SIGNALS).toEqual([
        "Securely hashed passwords",
        "No brokerage access",
        "Private to your account",
      ]);
      for (const signal of TRUST_SIGNALS) {
        expect(screen.getByText(signal)).toBeInTheDocument();
      }
    },
  );

  it.each(["signin", "signup"] as const)(
    "contains none of the design's untrue claims in %s mode",
    (mode) => {
      const { container } = render(<BrandPanel mode={mode} />);
      const text = container.textContent ?? "";

      expect(text).not.toContain("Portland");
      expect(text).not.toContain("S&P 500");
      expect(text).not.toContain("SOC 2");
    },
  );
});
