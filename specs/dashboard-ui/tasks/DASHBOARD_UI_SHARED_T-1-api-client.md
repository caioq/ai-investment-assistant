# DASHBOARD_UI_SHARED_T-1: `lib/api-client.ts` fetch wrapper

**Shared by:** US-1, US-2, US-3, US-4, US-5, US-6, US-7
**Status:** Not Started
**GitHub Issue:** #203 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Create `apps/web/lib/api-client.ts` — the single place the frontend talks to the NestJS API. Every other task in this module calls through it and never calls `fetch()` against the API directly.

- Base URL from `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:3001`), added to `.env.example` alongside the existing entries.
- Always `credentials: 'include'` — the `access_token` cookie is httpOnly and is the only auth mechanism (see `CONVENTIONS.md` → "Auth"). No `Authorization` header, no token in JS.
- A non-2xx response throws an `ApiError` carrying `status` and the parsed body, so callers can branch on `404` (advisor's "no analysis yet") and `401` (redirect to login) without re-parsing.
- `204` returns `undefined` rather than attempting `res.json()` — `POST /auth/logout` and `DELETE /portfolio/holdings/:id` both return it, and `res.json()` on an empty body throws a `SyntaxError` that reads like a network fault.
- A multipart helper that takes a `FormData` and **does not** set `Content-Type` — letting the browser write its own boundary. Three endpoints in this module are multipart uploads; a hand-set `Content-Type: multipart/form-data` without a boundary is the classic way to make all three fail with a server-side parse error.

Server Components call this too (see `CONVENTIONS.md` → "Component conventions"), so it must not touch `window`/`document` at module scope.

**Test:** `apps/web/lib/api-client.test.ts` (Vitest, `globalThis.fetch` stubbed with `vi.fn()`): (1) a GET sends `credentials: 'include'` and prefixes the configured base URL; (2) a `204` response resolves to `undefined` without calling `res.json()`; (3) a `404` rejects with an `ApiError` whose `status` is `404`; (4) the multipart helper sends the `FormData` body with **no** `Content-Type` header set.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
