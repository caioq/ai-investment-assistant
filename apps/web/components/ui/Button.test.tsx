import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("fires onClick when enabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    fireEvent.click(screen.getByRole("button", { name: "Click me" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Click me
      </Button>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Click me" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("sets aria-busy and disabled when loading", () => {
    render(<Button loading>Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it('renders the navy gradient for variant="navy"', () => {
    render(<Button variant="navy">Sign in</Button>);

    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button.getAttribute("style")).toContain("var(--navy)");
    expect(button.getAttribute("style")).toContain("var(--navy-2)");
  });

  it('renders a spinner and sets aria-busy + disabled when loading with variant="navy"', () => {
    render(
      <Button variant="navy" loading>
        Signing in
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Signing in" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("button-spinner")).toBeInTheDocument();
  });
});
