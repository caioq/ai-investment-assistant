import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

function segmentsWithColor(container: HTMLElement, token: string): Element[] {
  return Array.from(container.querySelectorAll('[data-testid="strength-segment"]')).filter(
    (segment) => (segment.getAttribute("style") ?? "").includes(`var(${token})`),
  );
}

describe("PasswordStrengthMeter", () => {
  it("shows the empty-field hint and the Too weak label for an empty password", () => {
    render(<PasswordStrengthMeter password="" />);

    expect(screen.getByText("Use 8+ characters")).toBeInTheDocument();
    expect(screen.getByText("Too weak")).toBeInTheDocument();
  });

  it("shows the typing hint and two amber segments for a fair password", () => {
    const { container } = render(<PasswordStrengthMeter password="abcdefgh1" />);

    expect(
      screen.getByText("Mix upper, lower, numbers, and a symbol"),
    ).toBeInTheDocument();
    expect(screen.getByText("Fair")).toBeInTheDocument();
    expect(segmentsWithColor(container, "--amber")).toHaveLength(2);
  });

  it("shows four emerald segments for a strong password", () => {
    const { container } = render(<PasswordStrengthMeter password="Abcdefgh1!xy" />);

    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(segmentsWithColor(container, "--emerald")).toHaveLength(4);
  });

  it("hides the segment track from assistive tech but not the label", () => {
    const { container } = render(<PasswordStrengthMeter password="abcdefgh1" />);

    const track = container.querySelector('[data-testid="strength-segments"]');
    expect(track).not.toBeNull();
    expect(track).toHaveAttribute("aria-hidden", "true");

    const label = screen.getByText("Fair");
    expect(label.closest('[aria-hidden="true"]')).toBeNull();
  });
});
