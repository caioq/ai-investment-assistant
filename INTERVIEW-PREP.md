# Interview prep notes

Personal review notes for the HowToo take-home interview. Summarizes the design decisions and known weaknesses discussed while reviewing the code. Not part of the product docs.

## README edits made

- **Motivation:** living in Australia, the B3 market is open while I'm asleep, so I wanted one place that pulls holdings and research together.
- **Advisor evals:** reworded in plain English (no "grounding" or "rubric"): deterministic assertions on the structured output plus an LLM-as-judge review.
- **Known issues:**
  - API-key item is now "fail fast in production when `ANTHROPIC_API_KEY` is missing".
  - Performance and empty-history items simplified.
  - "Jitter and circuit breaker" replaced with plain wording.
  - Two UX items added: no loading indicators; holdings can't be searched, sorted or edited.
  - PRs #164 and #182 linked.

## Decisions to be able to defend

### Background jobs: Redis + BullMQ vs a Postgres advisory lock

- A lock would only fix duplicate crons when two API instances run.
- Redis is justified because `POST /advisor/analyze` also needs a queue: return `202` with a job id, UI polls, retries with backoff, one analysis per user at a time.
- One tool covers both problems.

### Auth: JWT in an httpOnly cookie, not the `Authorization` header

- **Why:** XSS can't read the token, server components can forward it, and the browser attaches it automatically (`credentials: "include"`).
- **Flags:** `httpOnly: true`, `sameSite: 'lax'`, `secure` only in production.
- **Cost:** cookies need CSRF thought and CORS with credentials.
- **Guard location:** the auth check is in the `(dashboard)` layout, not `middleware.ts`, because middleware can't verify the JWT without copying `JWT_SECRET` into the frontend runtime.
- **Flow:** login sets the cookie via `Set-Cookie`; the browser stores it and sends it back; `JwtStrategy` reads it and `validate` puts `{ id, email }` on `req.user`. Every query is scoped by `req.user.id`, never a client-supplied user id.
- **Server-rendered pages:** the dashboard reads the cookie with `cookies()` and forwards it as a `Cookie` header on each API call.

### Server components on the dashboard

- The auth check and redirect happen before any HTML is sent (no flash of protected content).
- Data arrives with the HTML, fetched in parallel next to the API.
- Less JavaScript in the browser. Only stateful leaves are client components (7 files: `AdvisorPanel`, `PerformanceRange`, `SidebarNav`, and a few others).
- Not a real reason: the cookie (works from client components too) or hiding the API URL (it's `NEXT_PUBLIC_`).
- Catch: the page awaits six calls with `Promise.allSettled` and has no `Suspense`, so nothing streams (see weaknesses).

### Event `market-data.refresh.completed`

- Keeps the dependency one-way: portfolio -> market-data. Market-data announces, portfolio subscribes.
- Avoids a second cron that guesses how long the refresh takes.
- Emitted only on success. The listener also skips when `refreshed === 0`, so a failed Yahoo call can't record a fake flat day.

### Allocation computed in JS, not SQL

- Data is tiny (one user's holdings, tens of rows).
- Pure math lives in `packages/shared` (`computeAllocation`) and is unit-tested without a database.
- A SQL version needs `$queryRaw`: Prisma's `groupBy` can't group by a joined column or sum `quantity * COALESCE(currentPrice, avgPrice)`. It would also lose type safety.
- Switch only at much larger scale, and cache first (prices change once a day).
- Possible cheap win: the page calls allocation twice (sector, stock) and each call re-reads the same holdings.

### Styling

- Tailwind v4 plus CSS variables as design tokens (`globals.css`). No CSS-in-JS library.
- In practice most components use inline `style={{}}` (35 files vs 8 with `className`). Tailwind classes or a CSS module are used only where a pseudo-class is needed (`:focus`, hover).

## Weaknesses to be ready for

1. **JWTs never expire.** No `expiresIn` on `JwtModule`, no `maxAge` on the cookie, no server-side revocation. A leaked token works until `JWT_SECRET` changes. Fix: `signOptions.expiresIn` plus a matching cookie `maxAge`. _Not yet in the README._
2. **`syncCdi` casts unchecked JSON:** `(await response.json()) as SgsDataPoint[]`.
   - No `response.ok` check and no shape validation.
   - A non-array response makes `series.map` throw outside the `try/catch`, breaking the documented "failure is logged, not propagated".
   - A bad `valor` gives `NaN`, and the compounded index writes `NaN` rows.
   - Fix: a small type guard plus the status check. _Not yet in the README._
3. **Dashboard LCP of 4.22s.**
   - Likely inflated by measuring in `next dev`; re-measure with `pnpm --filter web build && pnpm --filter web start`.
   - In production, the page still waits for the slowest of six API calls before sending HTML.
   - Fix: per-section `Suspense` with async section components (each awaits its own data), `cache()` for shared responses, per-section error handling.
4. **Inline styles can't hold media queries**, so the mobile layout is probably weak. Not verified.
5. **The event bus is in-process.** A crash between the refresh and the listener loses that day's snapshot with no retry. It would move to the queue with the BullMQ item.
6. **No `response.ok` handling or retries on Yahoo calls** (already in the README).

## Not verified

- I didn't run the app: "no loading indicators" and the mobile-layout concern come from reading the code.
- CORS config was not found in `apps/api/src/main.ts`; unknown where it's set.
- The rationale for the event and for JS-side allocation is partly from the specs and partly inferred.

## Incidental: `pnpm dev` crash

`Cannot find module '.../ms-vscode.js-debug/bootloader.js ...bootloader.js'` is not a project bug. VS Code's debugger Auto Attach added its bootloader to `NODE_OPTIONS` twice (one per window), and Node treated the two paths as one file name. Fix: `unset NODE_OPTIONS`, or disable "Debug: Toggle Auto Attach".
