import { cookies } from "next/headers";

import { apiFetch } from "../../../lib/api-client";
import { HoldingsGrid } from "../../../components/dashboard/HoldingsGrid";
import type { HoldingWithAsset } from "../../../lib/types";

const ACCESS_TOKEN_COOKIE = "access_token";

/**
 * `/holdings` page — a Server Component inside the guarded `(dashboard)`
 * route group, rendering the current holdings list fetched from
 * `GET /portfolio/holdings` via the shared `HoldingsGrid`. Read-only: data
 * is imported on `/data-sources`. No auth check of its own: the group's
 * `(dashboard)/layout.tsx` already guards every page in it (see
 * `getCurrentUser`), which is the entire point of that layout existing.
 */
export default async function HoldingsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const headers = { Cookie: `${ACCESS_TOKEN_COOKIE}=${accessToken}` };

  let holdings: HoldingWithAsset[] = [];
  try {
    holdings = await apiFetch<HoldingWithAsset[]>("/portfolio/holdings", {
      headers,
    });
  } catch {
    holdings = [];
  }

  return (
<HoldingsGrid holdings={holdings} />
  );
}
