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

import LoginPage from "./page";

function cookieStoreWith(accessToken: string | undefined) {
  return {
    get: vi.fn((name: string) =>
      name === "access_token" && accessToken !== undefined
        ? { name, value: accessToken }
        : undefined,
    ),
  };
}

describe("LoginPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the login form and a link to /register for an unauthenticated visitor", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith(undefined));

    const element = await LoginPage();
    render(<>{element}</>);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /register/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("redirects to / when the visitor is already authenticated", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("valid-token"));
    apiFetchMock.mockResolvedValue({
      id: "user-1",
      email: "jordan@example.com",
      name: "Jordan Mercer",
    });

    const element = await LoginPage();
    render(<>{element}</>);

    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
