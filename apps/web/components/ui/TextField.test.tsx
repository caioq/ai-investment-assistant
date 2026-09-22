import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("associates its label with the input", () => {
    render(<TextField id="email" label="Email" type="email" />);

    const input = screen.getByLabelText("Email");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("type", "email");
  });

  it("forwards native input props", () => {
    render(<TextField id="email" label="Email" name="email" autoComplete="email" defaultValue="a@b.co" />);

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(input).toHaveValue("a@b.co");
  });

  it("is not marked invalid and has no description without an error", () => {
    render(<TextField id="email" label="Email" />);

    const input = screen.getByLabelText("Email");
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("links the error message through aria-describedby and sets aria-invalid", () => {
    render(<TextField id="email" label="Email" error="Email is required." />);

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const description = document.getElementById(describedBy!);
    expect(description).toHaveTextContent("Email is required.");
    expect(input).toHaveAccessibleDescription("Email is required.");
  });
});
