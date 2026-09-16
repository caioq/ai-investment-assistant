import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { cookiesMock, redirectMock, apiFetchMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  redirectMock: vi.fn(),
  apiFetchMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('../../lib/api-client', () => {
  class ApiError extends Error {
    readonly status: number;
    readonly body: unknown;

    constructor(status: number, body: unknown) {
      super(`API request failed with status ${status}`);
      this.name = 'ApiError';
      this.status = status;
      this.body = body;
    }
  }

  return {
    apiFetch: apiFetchMock,
    ApiError,
  };
});

import { ApiError } from '../../lib/api-client';
import DashboardLayout from './layout';

function cookieStoreWith(accessToken: string | undefined) {
  return {
    get: vi.fn((name: string) =>
      name === 'access_token' && accessToken !== undefined
        ? { name, value: accessToken }
        : undefined,
    ),
  };
}

describe('DashboardLayout', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /login and renders no children when there is no access_token cookie', async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith(undefined));

    const element = await DashboardLayout({
      children: <div data-testid="child">child content</div>,
    });
    render(<>{element}</>);

    expect(redirectMock).toHaveBeenCalledWith('/login');
    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it("renders children and the sidebar nav when the cookie's GET /auth/me resolves", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith('valid-token'));
    apiFetchMock.mockResolvedValue({
      id: 'user-1',
      email: 'jordan@example.com',
      name: 'Jordan Mercer',
    });

    const element = await DashboardLayout({
      children: <div data-testid="child">child content</div>,
    });
    render(<>{element}</>);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/auth/me',
      expect.objectContaining({
        headers: { Cookie: 'access_token=valid-token' },
      }),
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /holdings/i })).toHaveAttribute('href', '/holdings');
  });

  it('redirects to /login when GET /auth/me rejects with a 401 ApiError (expired token)', async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith('expired-token'));
    apiFetchMock.mockRejectedValue(new ApiError(401, { message: 'Unauthorized' }));

    const element = await DashboardLayout({
      children: <div data-testid="child">child content</div>,
    });
    render(<>{element}</>);

    expect(redirectMock).toHaveBeenCalledWith('/login');
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });
});
