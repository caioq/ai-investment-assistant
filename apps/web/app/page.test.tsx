import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import Home from "./page";

describe("Home", () => {
  it("renders the placeholder under-construction text", () => {
    render(<Home />);

    expect(
      screen.getByText("AI Investment Assistant — under construction"),
    ).toBeInTheDocument();
  });
});
