import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const { apiFetchMock, pushMock, refreshMock, replaceMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  replaceMock: vi.fn(),
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
  useRouter: () => ({ push: pushMock, refresh: refreshMock, replace: replaceMock }),
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
  replaceMock.mockReset();
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

describe("AuthScreen (signup mode)", () => {
  function getForm(): HTMLFormElement {
    const form = document.querySelector("form");
    if (!form) {
      throw new Error("form not found");
    }
    return form as HTMLFormElement;
  }

  function fillValidSignupForm() {
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
      target: { value: "abcdefgh" },
    });
  }

  it('renders "Create your account" with Name, Email and Password in that order, plus the strength hint', () => {
    render(<AuthScreen startMode="signup" />);

    expect(screen.getByText("Create your account")).toBeInTheDocument();

    const inputs = Array.from(getForm().querySelectorAll("input"));
    expect(inputs.map((input) => input.getAttribute("autocomplete"))).toEqual([
      "name",
      "email",
      "new-password",
    ]);
    expect(screen.getByLabelText("Name")).toHaveAttribute("placeholder", "Ana Souza");
    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute(
      "placeholder",
      "At least 8 characters",
    );
    expect(screen.getByText("Use 8+ characters")).toBeInTheDocument();
  });

  it('submitting a whitespace-only name shows "Name is required." and focuses Name', () => {
    render(<AuthScreen startMode="signup" />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
      target: { value: "abcdefgh" },
    });
    clickSubmit();

    expect(screen.getByText("Name is required.", { selector: "p" })).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText("Name"));
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('a 7-character password shows "Use at least 8 characters." and never calls apiFetch', () => {
    render(<AuthScreen startMode="signup" />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
      target: { value: "abcdefg" },
    });
    clickSubmit();

    expect(
      screen.getByText("Use at least 8 characters.", { selector: "p" }),
    ).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("a valid submit posts the trimmed name and email to /auth/register, even at score 1", async () => {
    apiFetchMock.mockResolvedValue(undefined);
    render(<AuthScreen startMode="signup" />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  Ana " } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
      target: { value: "abcdefgh" },
    });

    // The advisory meter never blocks submission (spec → Password strength meter).
    expect(screen.getByText("Weak")).toBeInTheDocument();

    clickSubmit();

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "ana@example.com",
          password: "abcdefgh",
          name: "Ana",
        }),
      }),
    );
  });

  it('shows "Creating account" while pending, and a second click leaves apiFetch at one call', async () => {
    let resolveRegister: (() => void) | undefined;
    apiFetchMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRegister = () => resolve();
      }),
    );
    render(<AuthScreen startMode="signup" />);

    fillValidSignupForm();
    clickSubmit();

    await waitFor(() => expect(getSubmitButton()).toHaveTextContent("Creating account"));
    expect(getSubmitButton()).toHaveAttribute("aria-busy", "true");

    clickSubmit();
    expect(apiFetchMock).toHaveBeenCalledTimes(1);

    resolveRegister?.();
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });

  it('ApiError(409) shows "This email is already registered." on the Email field, keeping every value', async () => {
    apiFetchMock.mockRejectedValue(new ApiError(409, { message: "Conflict" }));
    render(<AuthScreen startMode="signup" />);

    fillValidSignupForm();
    clickSubmit();

    const emailInput = screen.getByLabelText("Email");
    await waitFor(() =>
      expect(
        screen.getByText("This email is already registered.", { selector: "p" }),
      ).toBeInTheDocument(),
    );
    // The message is wired to the Email field, not rendered as a form alert.
    const errorId = emailInput.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId as string)).toHaveTextContent(
      "This email is already registered.",
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Ana");
    expect(emailInput).toHaveValue("ana@example.com");
    expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("abcdefgh");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("ApiError(429) shows the throttle message in the form alert", async () => {
    apiFetchMock.mockRejectedValue(new ApiError(429, { message: "Too Many Requests" }));
    render(<AuthScreen startMode="signup" />);

    fillValidSignupForm();
    clickSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts. Please wait a minute and try again.",
    );
  });

  it('ApiError(400) shows "Check your details and try again." in the form alert', async () => {
    apiFetchMock.mockRejectedValue(new ApiError(400, { message: "Bad Request" }));
    render(<AuthScreen startMode="signup" />);

    fillValidSignupForm();
    clickSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Check your details and try again.",
    );
  });

  it("a successful registration calls router.push('/') and then router.refresh()", async () => {
    apiFetchMock.mockResolvedValue(undefined);
    render(<AuthScreen startMode="signup" />);

    fillValidSignupForm();
    clickSubmit();

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/");
    expect(pushMock.mock.invocationCallOrder[0]).toBeLessThan(
      refreshMock.mock.invocationCallOrder[0],
    );
  });

  it("the submit button is the one scoped to the form, since the mode toggle shares its name", () => {
    render(<AuthScreen startMode="signup" />);

    expect(within(getForm()).getByRole("button", { name: "Create account" })).toBe(
      getSubmitButton(),
    );
  });
});

describe("AuthScreen mode switching", () => {
  // The segmented control's segments share their accessible names with the
  // submit button ("Sign in" / "Create account"), so every toggle query is
  // scoped to the control itself — the same scoping rule the submit-button
  // helper above follows in the other direction.
  function getToggle(): HTMLElement {
    return screen.getByRole("group", { name: "Sign in or create account" });
  }

  function clickSegment(name: string) {
    fireEvent.click(within(getToggle()).getByRole("button", { name }));
  }

  /** The bottom switch line's button — a <button> inside the trailing <p>. */
  function clickSwitchLine(name: string) {
    const button = screen
      .getAllByRole("button", { name })
      .find((candidate) => candidate.closest("p") !== null);
    if (!button) {
      throw new Error(`switch-line button "${name}" not found`);
    }
    fireEvent.click(button);
  }

  it("switching to Create account keeps the typed values, clears errors, and replaces the URL in place", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    try {
      render(<AuthScreen startMode="signin" />);

      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@" } });
      fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
        target: { value: "secret123" },
      });
      clickSubmit();
      expect(
        screen.getByText("Enter a valid email address.", { selector: "p" }),
      ).toBeInTheDocument();

      clickSegment("Create account");

      expect(replaceState).toHaveBeenCalledWith(null, "", "/register");
      expect(screen.getByLabelText("Email")).toHaveValue("ana@");
      expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("secret123");
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();

      const heading = screen.getByRole("heading", { name: "Create your account" });
      expect(document.activeElement).toBe(heading);
    } finally {
      replaceState.mockRestore();
    }
  });

  it("the switch line switches back to Sign in and replaces the URL with /login", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    try {
      render(<AuthScreen startMode="signup" />);

      clickSwitchLine("Sign in");

      expect(replaceState).toHaveBeenCalledWith(null, "", "/login");
      expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    } finally {
      replaceState.mockRestore();
    }
  });

  it('marks the active segment with aria-pressed="true"', () => {
    render(<AuthScreen startMode="signin" />);

    clickSegment("Create account");

    expect(within(getToggle()).getByRole("button", { name: "Create account" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(getToggle()).getByRole("button", { name: "Sign in" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("never navigates with the router while switching (a navigation would remount and lose the input)", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    try {
      render(<AuthScreen startMode="signin" />);

      clickSegment("Create account");
      clickSwitchLine("Sign in");

      expect(replaceMock).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    } finally {
      replaceState.mockRestore();
    }
  });
});
