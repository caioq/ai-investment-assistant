import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetch } from "../../lib/api-client";

const ACCESS_TOKEN_COOKIE = "access_token";

/**
 * The inverse of the `(dashboard)` group's `getCurrentUser` guard
 * (`apps/web/app/(dashboard)/layout.tsx`): probes the same `access_token`
 * cookie + `GET /auth/me` combination, but redirects to `/` on *success*
 * rather than on failure. Called by both `(auth)` pages so a visitor who
 * still holds a valid session (e.g. a stale `/login` bookmark) doesn't get
 * offered a form to log into the session they already have.
 *
 * Any failure — no cookie, a 401, or any other error — is treated as "not
 * authenticated" and simply returns, letting the page render its form.
 */
export async function redirectIfAuthenticated(): Promise<void> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return;
  }

  try {
    await apiFetch("/auth/me", {
      headers: { Cookie: `${ACCESS_TOKEN_COOKIE}=${accessToken}` },
    });
    redirect("/");
  } catch {
    return;
  }
}
