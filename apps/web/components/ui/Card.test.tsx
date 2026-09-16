import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("renders its title and children", () => {
    render(
      <Card title="Holdings">
        <p>Card body content</p>
      </Card>,
    );

    expect(screen.getByText("Holdings")).toBeInTheDocument();
    expect(screen.getByText("Card body content")).toBeInTheDocument();
  });
});
