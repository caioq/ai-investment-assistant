import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { apiFetchMock, pushMock, refreshMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
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
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

import { AuthScreen } from "./AuthScreen";
import { ApiError } from "../../lib/api-client";

// The segmented control's "Sign in" button and the submit button share the
// same visible text while idle (spec: both are literally "Sign in"), and the
// submit button's own label changes to "Signing in" while pending — so find
// it by `type="submit"` rather than by accessible name, which is the only
// thing that stays stable across both states.
function getSubmitButton(): HTMLElement {
  const submitButton = screen
    .getAllByRole("button")
    .find((button) => button.getAttribute("type") === "submit");
  if (!submitButton) {
    throw new Error("submit button not found");
  }
  return submitButton;
}

function clickSubmit() {
  fireEvent.click(getSubmitButton());
}

beforeEach(() => {
  apiFetchMock.mockReset();
  pushMock.mockReset();
  refreshMock.mockReset();
});

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

describe("AuthScreen (signin mode) submit", () => {
  function fillValidForm() {
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
      target: { value: "hunter2" },
    });
  }

  it("calls apiFetch('/auth/login', …) once with the trimmed email and the password in the JSON body", async () => {
    apiFetchMock.mockResolvedValue(undefined);
    render(<AuthScreen startMode="signin" />);

    // A leading/trailing-whitespace email, set on the underlying <input>'s
    // value directly — `type="email"`'s own value-sanitization algorithm
    // would otherwise strip the padding before this test ever exercises the
    // component's own `email.trim()` call.
    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    Object.defineProperty(emailInput, "value", {
      value: "  ana@example.com  ",
      configurable: true,
    });
    fireEvent.change(emailInput);
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
      target: { value: "hunter2" },
    });
    clickSubmit();

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "ana@example.com", password: "hunter2" }),
      }),
    );
  });

  it('shows "Signing in" and aria-busy while pending, and a second click leaves apiFetch at one call', async () => {
    let resolveLogin: (() => void) | undefined;
    apiFetchMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogin = () => resolve();
      }),
    );
    render(<AuthScreen startMode="signin" />);

    fillValidForm();
    clickSubmit();

    await waitFor(() => expect(getSubmitButton()).toHaveTextContent("Signing in"));
    expect(getSubmitButton()).toHaveAttribute("aria-busy", "true");

    clickSubmit();
    expect(apiFetchMock).toHaveBeenCalledTimes(1);

    resolveLogin?.();
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });

  it("resolving calls router.push('/') and then router.refresh()", async () => {
    apiFetchMock.mockResolvedValue(undefined);
    render(<AuthScreen startMode="signin" />);

    fillValidForm();
    clickSubmit();

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());

    expect(pushMock).toHaveBeenCalledWith("/");
    const pushOrder = pushMock.mock.invocationCallOrder[0];
    const refreshOrder = refreshMock.mock.invocationCallOrder[0];
    expect(pushOrder).toBeLessThan(refreshOrder);
  });

  it('rejecting with ApiError(401) shows "Email or password is incorrect.", never navigates, and keeps both input values', async () => {
    apiFetchMock.mockRejectedValue(new ApiError(401, { message: "Unauthorized" }));
    render(<AuthScreen startMode="signin" />);

    fillValidForm();
    clickSubmit();

    // The `alert` ARIA role doesn't compute its accessible name from text
    // content (WAI-ARIA: "Name from: author" only), so `getByRole` can't
    // filter by `name` here — find the alert region, then assert its text.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password is incorrect.",
    );
    expect(pushMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Email")).toHaveValue("ana@example.com");
    expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("hunter2");
  });

  it('rejecting with ApiError(429) shows the throttle message', async () => {
    apiFetchMock.mockRejectedValue(new ApiError(429, { message: "Too Many Requests" }));
    render(<AuthScreen startMode="signin" />);

    fillValidForm();
    clickSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts. Please wait a minute and try again.",
    );
  });

  it('rejecting with a network TypeError shows "Couldn\'t reach the server. Please try again."', async () => {
    apiFetchMock.mockRejectedValue(new TypeError("fetch failed"));
    render(<AuthScreen startMode="signin" />);

    fillValidForm();
    clickSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't reach the server. Please try again.",
    );
  });
});
