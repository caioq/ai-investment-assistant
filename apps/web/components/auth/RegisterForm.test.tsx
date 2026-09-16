import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

import { ApiError } from "../../lib/api-client";
import { RegisterForm } from "./RegisterForm";

function fillAndSubmit(email: string, password: string, name = "") {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
  if (name !== "") {
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: name } });
  }
  fireEvent.click(screen.getByRole("button", { name: /register|sign up|create account/i }));
}

describe("RegisterForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("omits name from the request body when it is left blank", async () => {
    apiFetchMock.mockResolvedValue({ id: "user-1", email: "jordan@example.com", name: null });
    render(<RegisterForm />);

    fillAndSubmit("jordan@example.com", "correct-horse");

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/auth/register",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "jordan@example.com", password: "correct-horse" }),
        }),
      );
    });
  });

  it("includes name in the request body when provided", async () => {
    apiFetchMock.mockResolvedValue({ id: "user-1", email: "jordan@example.com", name: "Jordan" });
    render(<RegisterForm />);

    fillAndSubmit("jordan@example.com", "correct-horse", "Jordan");

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/auth/register",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "jordan@example.com",
            password: "correct-horse",
            name: "Jordan",
          }),
        }),
      );
    });
  });

  it("disables the submit button while pending and re-enables it after it rejects", async () => {
    let rejectRegister: (err: unknown) => void = () => {};
    apiFetchMock.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRegister = reject;
      }),
    );
    render(<RegisterForm />);

    fillAndSubmit("jordan@example.com", "correct-horse");

    const button = screen.getByRole("button", { name: /register|sign up|create account/i });
    await waitFor(() => expect(button).toBeDisabled());

    rejectRegister(new ApiError(409, { message: "Email already registered" }));

    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("shows a field-level 'already registered' error with a link to /login on a 409", async () => {
    apiFetchMock.mockRejectedValue(new ApiError(409, { message: "Email already registered" }));
    render(<RegisterForm />);

    fillAndSubmit("jordan@example.com", "correct-horse");

    await waitFor(() => {
      expect(screen.getByText(/already registered/i)).toBeInTheDocument();
    });
    const loginLink = screen.getByRole("link", { name: /log in|sign in/i });
    expect(loginLink).toHaveAttribute("href", "/login");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a distinct 'something went wrong' message on a non-409 failure", async () => {
    apiFetchMock.mockRejectedValue(new Error("network failure"));
    render(<RegisterForm />);

    fillAndSubmit("jordan@example.com", "correct-horse");

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/already registered/i)).not.toBeInTheDocument();
  });

  it("navigates to / on a successful registration", async () => {
    apiFetchMock.mockResolvedValue({ id: "user-1", email: "jordan@example.com", name: null });
    render(<RegisterForm />);

    fillAndSubmit("jordan@example.com", "correct-horse");

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });
});
