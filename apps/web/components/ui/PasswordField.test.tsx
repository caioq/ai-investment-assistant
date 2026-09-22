import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PasswordField } from "./PasswordField";

describe("PasswordField", () => {
  it("starts hidden, with a 'Show password' toggle that is not pressed", () => {
    render(<PasswordField id="password" label="Password" />);

    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("type", "password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveTextContent("Show");
  });

  it("reveals the password when the toggle is clicked, and hides it again", () => {
    render(<PasswordField id="password" label="Password" />);
    const input = screen.getByLabelText("Password", { exact: true });

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));

    expect(input).toHaveAttribute("type", "text");
    const toggle = screen.getByRole("button", { name: "Hide password" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("Hide");

    fireEvent.click(toggle);

    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("aria-pressed", "false");
  });

  it("the exact 'Password' label matches only the input, not the toggle", () => {
    render(<PasswordField id="password" label="Password" />);

    const matches = screen.getAllByLabelText("Password", { exact: true });
    expect(matches).toHaveLength(1);
    expect(matches[0].tagName).toBe("INPUT");
  });

  it("passes error through to the underlying field", () => {
    render(<PasswordField id="password" label="Password" error="Password is required." />);

    const input = screen.getByLabelText("Password", { exact: true });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Password is required.");
  });
});
