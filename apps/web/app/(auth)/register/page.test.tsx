import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { cookiesMock, redirectMock, apiFetchMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  redirectMock: vi.fn(),
  apiFetchMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

import RegisterPage from "./page";

function cookieStoreWith(accessToken: string | undefined) {
  return {
    get: vi.fn((name: string) =>
      name === "access_token" && accessToken !== undefined
        ? { name, value: accessToken }
        : undefined,
    ),
  };
}

describe("RegisterPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the register form and a link to /login for an unauthenticated visitor", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith(undefined));

    const element = await RegisterPage();
    render(<>{element}</>);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("redirects to / when the visitor is already authenticated", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    apiFetchMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });

    const element = await RegisterPage();
    render(<>{element}</>);

    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
