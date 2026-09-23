import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// `next/font/local` is a build-time transform, not something Vitest can
// execute, so the loader is stubbed to the shape the layout reads.
vi.mock("next/font/local", () => ({
  default: () => ({ variable: "font-fraunces-mock", className: "" }),
}));

import AuthLayout from "./layout";

describe("AuthLayout", () => {
  it("renders its children", () => {
    render(
      <AuthLayout>
        <p>Auth form goes here</p>
      </AuthLayout>,
    );

    expect(screen.getByText("Auth form goes here")).toBeInTheDocument();
  });
});
