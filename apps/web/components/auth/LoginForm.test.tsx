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
import { LoginForm } from "./LoginForm";

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /log in|sign in/i }));
}

describe("LoginForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls the api client with the entered email and password on submit", async () => {
    apiFetchMock.mockResolvedValue({ id: "user-1", email: "jordan@example.com", name: "Jordan" });
    render(<LoginForm />);

    fillAndSubmit("jordan@example.com", "correct-horse");

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/auth/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "jordan@example.com", password: "correct-horse" }),
        }),
      );
    });
  });

  it("disables the submit button while pending and re-enables it after it rejects", async () => {
    let rejectLogin: (err: unknown) => void = () => {};
    apiFetchMock.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectLogin = reject;
      }),
    );
    render(<LoginForm />);

    fillAndSubmit("jordan@example.com", "wrong-password");

    const button = screen.getByRole("button", { name: /log in|sign in/i });
    await waitFor(() => expect(button).toBeDisabled());

    rejectLogin(new ApiError(401, { message: "Unauthorized" }));

    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("shows a generic error message and does not navigate on a 401", async () => {
    apiFetchMock.mockRejectedValue(new ApiError(401, { message: "Unauthorized" }));
    render(<LoginForm />);

    fillAndSubmit("jordan@example.com", "wrong-password");

    await waitFor(() => {
      expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a distinct 'something went wrong' message on a non-401 failure", async () => {
    apiFetchMock.mockRejectedValue(new Error("network failure"));
    render(<LoginForm />);

    fillAndSubmit("jordan@example.com", "correct-horse");

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/incorrect email or password/i)).not.toBeInTheDocument();
  });

  it("navigates to / on a successful login", async () => {
    apiFetchMock.mockResolvedValue({ id: "user-1", email: "jordan@example.com", name: "Jordan" });
    render(<LoginForm />);

    fillAndSubmit("jordan@example.com", "correct-horse");

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });
});
