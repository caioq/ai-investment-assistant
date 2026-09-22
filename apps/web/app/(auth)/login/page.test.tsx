import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const { redirectIfAuthenticatedMock } = vi.hoisted(() => ({
  redirectIfAuthenticatedMock: vi.fn(),
}));

vi.mock("../redirect-if-authenticated", () => ({
  redirectIfAuthenticated: redirectIfAuthenticatedMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders AuthScreen in Sign in mode for an unauthenticated visitor", async () => {
    redirectIfAuthenticatedMock.mockResolvedValue(undefined);

    const element = await LoginPage();
    const { container } = render(<>{element}</>);

    expect(redirectIfAuthenticatedMock).toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Password", { exact: true }),
    ).toBeInTheDocument();
    // Scoped to the <form>: the mode switcher above it has its own
    // "Sign in" button, so an unscoped query matches two elements.
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(
      within(form as HTMLElement).getByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("does not render the form when the guard redirects an authenticated visitor", async () => {
    // `redirect()` signals by throwing a NEXT_REDIRECT error, so the guard
    // never returns for an authenticated visitor and the page body never runs.
    redirectIfAuthenticatedMock.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(LoginPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Welcome back" }),
    ).not.toBeInTheDocument();
  });
});
