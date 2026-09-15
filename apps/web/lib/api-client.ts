const DEFAULT_API_BASE_URL = "http://localhost:3001";

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
}

/**
 * Thrown by `apiFetch`/`apiFetchMultipart` for any non-2xx response, carrying
 * the HTTP status and the parsed response body so callers can branch on a
 * specific status (e.g. 404 for advisor's "no analysis yet", 401 to redirect
 * to login) without re-parsing the response themselves.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    throw new ApiError(res.status, body);
  }

  // A 204 (e.g. POST /auth/logout, DELETE /portfolio/holdings/:id) has no
  // body — calling res.json() on it throws a SyntaxError that reads like a
  // network fault, so short-circuit before attempting to parse it.
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

/**
 * The single place the frontend talks to the NestJS API — every fetch call
 * (from Server Components or client components) should go through this
 * rather than calling `fetch()` directly. Always sends the httpOnly
 * `access_token` cookie (`credentials: 'include'`), which is the only auth
 * mechanism (see CONVENTIONS.md → "Auth"). Does not touch `window`/`document`
 * at module scope, so it's safe to import from Server Components too.
 */
export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
  });

  return parseResponse<T>(res);
}

/**
 * Multipart upload helper for the module's file-upload endpoints (CSV
 * holdings, CSV recommended-portfolio wallets, PDF advisor reports).
 * Deliberately does not set a `Content-Type` header — the browser writes its
 * own `multipart/form-data; boundary=...` header for a `FormData` body, and a
 * hand-set `Content-Type: multipart/form-data` without a boundary is the
 * classic way to make the server-side parser fail on every one of them.
 */
export async function apiFetchMultipart<T = unknown>(
  path: string,
  formData: FormData,
  init: Omit<RequestInit, "body" | "headers"> = {},
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    ...init,
    credentials: "include",
    body: formData,
  });

  return parseResponse<T>(res);
}
