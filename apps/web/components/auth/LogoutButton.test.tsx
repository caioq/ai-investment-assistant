import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { apiFetchMock, replaceMock, pushMock, refreshMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock,
    refresh: refreshMock,
  }),
}));

import { LogoutButton } from "./LogoutButton";

describe("LogoutButton", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls POST /auth/logout before navigating to /login via replace", async () => {
    let resolveLogout: () => void = () => {};
    apiFetchMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogout = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<LogoutButton />);

    const clickPromise = user.click(screen.getByRole("button", { name: /log ?out/i }));

    await vi.waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
    });
    expect(replaceMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();

    resolveLogout();
    await clickPromise;

    const logoutCallOrder = apiFetchMock.mock.invocationCallOrder[0];
    const replaceCallOrder = replaceMock.mock.invocationCallOrder[0];
    expect(logoutCallOrder).toBeLessThan(replaceCallOrder);

    expect(replaceMock).toHaveBeenCalledWith("/login");
    expect(pushMock).not.toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();
  });

  it("disables the button while in flight and issues no second request on a second click", async () => {
    let resolveLogout: () => void = () => {};
    apiFetchMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogout = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<LogoutButton />);

    const button = screen.getByRole("button", { name: /log ?out/i });
    const clickPromise = user.click(button);

    await vi.waitFor(() => {
      expect(button).toBeDisabled();
    });

    await user.click(button);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);

    resolveLogout();
    await clickPromise;
  });

  it("still navigates to /login when the logout request rejects", async () => {
    apiFetchMock.mockRejectedValue(new Error("network down"));

    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: /log ?out/i }));

    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
