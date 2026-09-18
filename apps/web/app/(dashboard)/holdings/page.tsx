import { cookies } from "next/headers";

import { apiFetch } from "../../../lib/api-client";
import { AddHoldingForm } from "../../../components/holdings/AddHoldingForm";
import { HoldingsCsvUpload } from "../../../components/holdings/HoldingsCsvUpload";
import { HoldingsGrid } from "../../../components/dashboard/HoldingsGrid";
import type { HoldingWithAsset } from "../../../lib/types";

const ACCESS_TOKEN_COOKIE = "access_token";

/**
 * `/holdings` page — a Server Component inside the guarded `(dashboard)`
 * route group, composing the manual add form and CSV upload (both `'use
 * client'`, both call `router.refresh()` on success) with the current
 * holdings list fetched from `GET /portfolio/holdings` and rendered via the
 * shared `HoldingsGrid`. No auth check of its own: the group's
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
    <>
      <AddHoldingForm />
      <HoldingsCsvUpload />
      <HoldingsGrid holdings={holdings} />
    </>
  );
}
