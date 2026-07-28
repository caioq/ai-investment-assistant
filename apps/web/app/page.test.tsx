import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SHARED_PACKAGE_NAME } from "@ai-investment-assistant/shared";

import Home from "./page";

describe("Home", () => {
  it("renders the placeholder under-construction text", () => {
    render(<Home />);

    expect(
      screen.getByText("AI Investment Assistant — under construction"),
    ).toBeInTheDocument();
  });

  it("renders the shared package name imported from @ai-investment-assistant/shared", () => {
    render(<Home />);

    expect(screen.getByTestId("shared-package-name")).toHaveTextContent(
      SHARED_PACKAGE_NAME,
    );
  });
});
