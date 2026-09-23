import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { redirectIfAuthenticatedMock } = vi.hoisted(() => ({
  redirectIfAuthenticatedMock: vi.fn(),
}));

vi.mock("../redirect-if-authenticated", () => ({
  redirectIfAuthenticated: redirectIfAuthenticatedMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import RegisterPage from "./page";

describe("RegisterPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders AuthScreen in Create account mode for an unauthenticated visitor", async () => {
    redirectIfAuthenticatedMock.mockResolvedValue(undefined);

    const element = await RegisterPage();
    render(<>{element}</>);

    expect(redirectIfAuthenticatedMock).toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("does not render the form when the guard redirects an authenticated visitor", async () => {
    // `redirect()` signals by throwing a NEXT_REDIRECT error, so the guard
    // never returns for an authenticated visitor and the page body never runs.
    redirectIfAuthenticatedMock.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(RegisterPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Create your account" }),
    ).not.toBeInTheDocument();
  });
});
