import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { apiFetchMock, pushMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("../../lib/api-client", () => {
  class ApiError extends Error {
    readonly status: number;
    readonly body: unknown;

    constructor(status: number, body: unknown) {
      super(`API request failed with status ${status}`);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  }

  return {
    apiFetch: apiFetchMock,
    ApiError,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { AuthScreen } from "./AuthScreen";

// The segmented control's "Sign in" button and the submit button share the
// same visible text (spec: both are literally "Sign in"), so disambiguate by
// `type="submit"` rather than accessible name alone.
function clickSubmit() {
  const submitButton = screen
    .getAllByRole("button", { name: "Sign in" })
    .find((button) => button.getAttribute("type") === "submit");
  if (!submitButton) {
    throw new Error("submit button not found");
  }
  fireEvent.click(submitButton);
}

describe("AuthScreen (signin mode)", () => {
  it('renders "Welcome back", Email and Password fields, and no Name field', () => {
    render(<AuthScreen startMode="signin" />);

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password", { exact: true })).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("shows no error text before the first submit", () => {
    render(<AuthScreen startMode="signin" />);

    expect(screen.queryByText("Email is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Password is required.")).not.toBeInTheDocument();
  });

  it("submitting empty shows both required errors, focuses Email, and never calls apiFetch", () => {
    render(<AuthScreen startMode="signin" />);

    clickSubmit();

    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText("Email"));
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("typing a valid email after a failed submit clears the email error without another submit", () => {
    render(<AuthScreen startMode="signin" />);

    clickSubmit();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ana@example.com" },
    });

    expect(screen.queryByText("Email is required.")).not.toBeInTheDocument();
  });

  it("submitting an invalid email shows the format error", () => {
    render(<AuthScreen startMode="signin" />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
      target: { value: "some-password" },
    });
    clickSubmit();

    // The inline field error and the aria-live announcement region can carry
    // identical text when only one field has an error, so scope the query to
    // the inline error <p> (the aria-live region is a <div>).
    expect(
      screen.getByText("Enter a valid email address.", { selector: "p" }),
    ).toBeInTheDocument();
  });
});
