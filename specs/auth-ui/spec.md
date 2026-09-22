# Auth UI

**Status:** Approved
**Depends on:** [project-setup](../project-setup/spec.md), [auth](../auth/spec.md), [dashboard-ui](../dashboard-ui/spec.md)

## Problem

The existing `/login` and `/register` pages (built under dashboard-ui US-1) work, but they are unstyled, separate forms. They don't match the product's visual design, validate nothing before submitting, give no password guidance, and treat most failures as one generic error. This spec replaces them with a single, designed Sign in / Create account screen.

## Goals

- **One screen with two modes, Sign in and Create account**, served at both existing URLs: `/login` opens in Sign in mode and `/register` in Create account mode. Switching modes happens on the client with no remount. It updates the URL in place (see Behavior Notes → Mode switching), keeps the typed email and password, and clears touched/error state so errors don't carry over.
- **Two-column layout.** A brand panel on the left (`1.05fr`) and a form panel on the right (`1fr`), full viewport height (details in Behavior Notes → Layout).
- **Fields.** Email and Password in both modes; Name in Create account only, required.
- **Password visibility toggle** in both modes, and an advisory **password strength meter** in Create account mode.
- **Client-side validation on submit**, with inline per-field errors and focus moved to the first invalid field. After the first submit, an errored field re-validates as the user corrects it.
- **Submit loading state.** A spinner plus "Signing in" / "Creating account"; repeat clicks while in flight send nothing.
- **Explicit handling for each server and network failure** (401, 409, 400, 429, network/5xx), never clearing the user's input.
- **The accessibility requirements** in Behavior Notes → Accessibility.
- **The backend changes this screen relies on:** `name` required at registration and per-IP throttling on login/register. These are specified in [auth](../auth/spec.md) → API Contract → "Amended by auth-ui".

## Non-Goals

- **Dark theme and the theme toggle.** Deferred, and dashboard-ui's Non-Goal stands. The design's dark palette is recorded under Open Questions for a future theming spec. The toggle is left out of the form panel's top row.
- **Forgot password.** Password reset is an [auth](../auth/spec.md) Non-Goal, so the design's "Forgot password?" link is **omitted** rather than shipped as a dead link.
- **Terms of Service / Privacy consent checkbox.** No Terms or Privacy pages exist, so the consent control and its submission gate are dropped.
- **Server-side minimum password length.** A deliberate decision: the 8-character minimum is enforced on the client only, and the API keeps accepting any password.
- **Per-account lockout, progressive delays, or challenges.** Throttling is per-IP only (see auth).
- **Email verification, SSO/social sign-in, MFA, and post-signup onboarding.** None of these exist in this app.
- **Changing the dashboard.** The shared tokens in `globals.css` are only extended (one new amber token), never restyled.

## Data Model

None. This spec uses the existing `User.name String?` column (see [auth](../auth/spec.md)). The column stays nullable; only **new** registrations must send a name.

## API Contract

This module exposes no endpoints. It consumes:

| Method | Path | Body sent | Used for |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | Sign in mode |
| POST | `/auth/register` | `{ email, password, name }` | Create account mode |
| GET | `/auth/me` | — | The existing `redirectIfAuthenticated` guard on both routes |

Changes it depends on (owned by auth, see its "Amended by auth-ui" note):

| Endpoint | Change |
|---|---|
| `POST /auth/register` | `name` is required and trimmed; missing or whitespace-only → `400` |
| `POST /auth/login`, `POST /auth/register` | Per-IP throttle (`@nestjs/throttler`) → `429`. Limit and window come from `AUTH_THROTTLE_LIMIT` (default `5`) and `AUTH_THROTTLE_TTL_MS` (default `60000`) |

All calls go through the existing `apiFetch` (`apps/web/lib/api-client.ts`), which already sends `credentials: "include"` and throws `ApiError(status, body)` on non-2xx.

## Behavior Notes

### Structure

- `apps/web/app/(auth)/login/page.tsx` and `register/page.tsx` both stay server components. Each calls `redirectIfAuthenticated()` and renders one client component, `<AuthScreen startMode="signin" | "signup" />`, which replaces `LoginForm` and `RegisterForm`.
- `apps/web/app/(auth)/layout.tsx` becomes the full-viewport two-column grid. It drops the current `maxWidth: 400px` wrapper.
- **New shared field primitives** in `apps/web/components/ui/`: `TextField` (label, input, error, `aria-describedby` wiring) and `PasswordField` (a `TextField` plus the Show/Hide toggle). None exist today, and future forms should reuse these.
- **Pure logic goes in `packages/shared`**, per the CLAUDE.md rule:
  - `scorePassword(password): { score: 0 | 1 | 2 | 3 | 4, label }`
  - `isValidEmail(email): boolean`, using the pattern `local@domain.tld`: `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- **The submit button is navy.** It uses the existing `Button` (`components/ui/Button.tsx`), including its `loading` prop, with a new `navy` variant (a `--navy` → `--navy-2` gradient). The existing emerald `primary` variant stays the dashboard's.
- **Fraunces** (500/600) is loaded with `next/font/google` **in the `(auth)` layout only**, for the brand headline, the wordmark and the form title. This supersedes CONVENTIONS.md's "Fraunces … deliberately not loaded" for this route group only. Everything else stays Inter.
- **Tokens.** The existing light tokens in `apps/web/app/globals.css` already match the design's light palette. Add one token, `--amber: #B8862F` (the "Fair" strength colour), and extend the contract test `apps/web/app/globals.test.ts` to cover it.

### Layout

- **Brand panel.** A navy gradient (`--navy` → `--navy-2`, 155deg) with two decorative radial blurs, blue top-right and emerald bottom-left, clipped to the panel. It stacks three blocks with space between:
  1. Top: the logo mark (36×36, 10px radius, translucent white) and the product name in Fraunces 18px.
  2. Middle: a Fraunces 34px headline, a 14.5px paragraph, and three value points, each with a 20px emerald-tinted check circle and 13.5px text.
  3. Bottom: a wrapping row of three trust signals at 11.5px. The first has a pulsing emerald dot.
- **Form panel.** A centred column, `max-width: 410px`, padding `48px 40px`, scrolling if it overflows. Top to bottom:
  1. The mode segmented control.
  2. The form title (Fraunces 27px).
  3. The subtitle (13.5px).
  4. The fields, with a 14px gap.
  5. The submit button.
  6. The mode-switch line.
- **Below 900px viewport width** the brand panel is hidden, and the logo mark and product name show above the form so the page stays usable on a phone.
- **Component details** follow the design handoff:
  - Segmented control: container `--bg-card-alt`, 10px radius. The active button is `--bg-card` with a subtle shadow.
  - Inputs: 13.5px, padding `11px 13px`, 10px radius, `--bg-card-alt` background. Labels are 11.5px/700 in `--text-secondary`.
  - Focus: `--blue` border plus a 3px ring, `rgba(47,111,237,0.14)`.
  - Error: `--red` border plus an 11.5px message.
  - Submit: 13px×20px padding, 11px radius; lifts 1px on hover.

### Content per mode

`PRODUCT_NAME = "AI Investment Assistant"`, defined as a single constant (see Open Questions). The copy is rewritten from the design so that every claim is true of this app.

| | Sign in | Create account |
|---|---|---|
| Form title | Welcome back | Create your account |
| Form subtitle | Sign in to review your portfolio and latest analysis. | A few details and your dashboard is ready. |
| Brand headline | Your whole portfolio, in one clear view. | Start with clarity, not spreadsheets. |
| Brand paragraph | Track allocation and performance, and get portfolio reviews grounded in your research house's analysis. | Upload your B3 holdings as a CSV and get allocation insight and a research-backed review in minutes. |
| Value point 1 | Allocation by sector, stock, investment style, and risk | Import your holdings from a simple CSV file |
| Value point 2 | Performance measured against Ibovespa and CDI | Compare against your research house's model portfolios |
| Value point 3 | AI portfolio reviews: strengths, risks, and recommendations | No brokerage credentials needed, ever |

The trust row is the same in both modes: "Securely hashed passwords" (with the pulsing dot), "No brokerage access", "Private to your account".

| | Sign in | Create account |
|---|---|---|
| Submit label (idle → loading) | Sign in → Signing in | Create account → Creating account |
| Switch line | Don't have an account? **Create one** | Already have an account? **Sign in** |
| Password placeholder | Enter your password | At least 8 characters |

Placeholders for the other fields: Email `you@example.com`; Name (Create account only) `Ana Souza`.

### Mode switching

- Both the segmented control and the bold link in the switch line switch modes.
- A switch keeps email and password, keeps the name value in state even while it's hidden, resets the touched/error state, and updates the URL to the other route (`/login` ↔ `/register`) **without remounting**. Use `window.history.replaceState`, which the Next.js App Router supports natively and which doesn't trigger a navigation. Don't use `router.replace`: it navigates to the other `page.tsx`, which mounts a fresh `AuthScreen` and loses the typed values.
- Focus moves to the new mode's form title. The title is an `h1` with `tabIndex={-1}`, so screen readers announce the change.

### Validation

These rules run on submit and send nothing if any fail.

| Rule | Condition | Message |
|---|---|---|
| Email | empty | "Email is required." |
| Email | fails `isValidEmail` | "Enter a valid email address." |
| Password, Sign in | empty | "Password is required." |
| Password, Create account | empty | "Password is required." |
| Password, Create account | fewer than 8 characters | "Use at least 8 characters." |
| Name, Create account | empty after trimming | "Name is required." |

- Errors appear only after the first submit attempt. After that, the errored fields re-validate on change.
- On failure, focus goes to the first field with an error, in DOM order.

### Password strength meter (Create account only)

- **Scoring** (`scorePassword`): add 1 for each of the following, then cap at 4:
  - length ≥ 8
  - length ≥ 12
  - mixed upper and lower case
  - a digit
  - a symbol (`/[^A-Za-z0-9]/`)
- **Labels and colours:**

  | Score | Label | Colour |
  |---|---|---|
  | 0 | Too weak | `--red` |
  | 1 | Weak | `--red` |
  | 2 | Fair | `--amber` |
  | 3 | Good | `--blue` |
  | 4 | Strong | `--emerald` |

- **Rendering.** Four segments, 4px tall with 4px gaps. The filled segments equal the score and share one colour; unfilled segments use `--border`.
- **Caption.** The hint text on the left, the label on the right. The hint reads "Use 8+ characters" while the field is empty and "Mix upper, lower, numbers, and a symbol" once typing starts.
- **Advisory only.** The meter never blocks submission; only the 8-character rule does.

### Server and network errors

The form **never clears input on failure**. The loading state always ends.

| Response | Where it shows | Message |
|---|---|---|
| 401 (Sign in) | form-level alert | "Email or password is incorrect." Generic, so it doesn't reveal which was wrong |
| 409 (Create account) | on the Email field | "This email is already registered." plus a "Sign in instead" action that switches to Sign in with the email kept |
| 400 (Create account) | form-level alert | "Check your details and try again." Client validation should make this unreachable; it's a fallback |
| 429 (either mode) | form-level alert | "Too many attempts. Please wait a minute and try again." |
| Network error, 5xx, anything else | form-level alert | "Couldn't reach the server. Please try again." |

### Success

In both modes, `router.push("/")` then `router.refresh()`. The `/` route is the dashboard; no onboarding or verification step exists.

### Accessibility

- **Labels.** Every input has an associated `<label>`; a placeholder is never the only label. The Password field's accessible name is exactly "Password".
- **Errors.** Each field error is linked with `aria-describedby`. Form-level errors render in a `role="alert"` region; field errors are also announced through one `aria-live="polite"` region.
- **Visibility toggle.** A real `<button type="button">` whose accessible name flips between "Show password" and "Hide password", with `aria-pressed`. Its visible text is "Show" / "Hide".
- **Strength meter.** The segments are `aria-hidden`. The visible label ("Fair" etc.) carries the status as text, so the meter doesn't rely on colour alone.
- **Keyboard.** The segmented control is two buttons with `aria-pressed`, reachable and operable by keyboard.
- **Focus rings.** They stay visible; the outline is only replaced by the 3px ring described in Layout, never removed.
- **Contrast.** Text meets 4.5:1. The trust-signal text on navy uses at least 60% white (raised from the design's 50%) to pass at 11.5px.
- **Reduced motion.** Under `prefers-reduced-motion: reduce`:
  - The pulsing dot is static.
  - The button doesn't lift on hover.
  - The spinner doesn't rotate; it shows a static indicator next to the "…ing" label.

### Security

- Credentials go only in the POST body, never in a URL.
- Session handling is unchanged: an httpOnly `access_token` cookie set by the API.
- The password is held only in component state. It is never written to storage and never put in the URL on a mode switch.
- Inputs use the correct `autoComplete` values so browser password managers work:
  - Email: `email`
  - Name: `name`
  - Password, Sign in: `current-password`
  - Password, Create account: `new-password`

### Superseded work and test impact

- **Superseded.** This spec supersedes dashboard-ui's "Auth pages: login, register" Goal and its US-1 tasks T-1 to T-3. Those files stay Done as history.
  - Replaced: `LoginForm.tsx` and `RegisterForm.tsx`, with their tests.
  - Kept: `LogoutButton.tsx`.
- **Existing Playwright specs** sign in with the button name "Log in" and a non-exact `getByLabel('Password')`, which would also match the new "Show password" toggle. Update them to `getByRole('button', { name: 'Sign in', exact: true })` and `getByLabel('Password', { exact: true })`:
  - `apps/web/e2e/auth.spec.ts`
  - `apps/web/e2e/dashboard-visual.spec.ts` (lines 22–25)
- **CONVENTIONS.md → "Auth forms"** needs updating when this is implemented, to describe the `AuthScreen` error mapping.
- **Throttling in tests.** The API and web e2e environments (the test `.env` and `.github/workflows/ci.yml`) set `AUTH_THROTTLE_LIMIT` high, so e2e suites that register many users from one IP don't hit 429.

## Acceptance Criteria

### Modes and routing

- [ ] `/login` renders Sign in mode ("Welcome back"), and `/register` renders Create account mode ("Create your account") with the Name field and strength meter.
- [ ] Clicking "Create account" in the segmented control, or "Create one" in the switch line, switches mode:
  - The URL becomes `/register`.
  - The typed email and password are still in their fields.
  - No validation error from the previous mode is visible.
  - Focus is on the form title.
  - The reverse switch works the same way.
- [ ] An authenticated visit to `/login` or `/register` redirects to `/`.

### Validation

- [ ] Submitting an empty Sign in form shows "Email is required." and "Password is required.", sends no request, and puts focus on Email.
- [ ] Typing an email after that error clears the email error without another submit.
- [ ] An email of `ana@` shows "Enter a valid email address." on submit.
- [ ] No error is visible before the first submit attempt.
- [ ] Create account with a 7-character password shows "Use at least 8 characters." and sends no request.
- [ ] Create account with a name of `"   "` shows "Name is required."

### Password field and strength meter

- [ ] `scorePassword` has unit tests in `packages/shared`:

  | Input | Score | Label |
  |---|---|---|
  | `""` | 0 | Too weak |
  | `"abcdefgh"` | 1 | Weak |
  | `"abcdefgh1"` | 2 | Fair |
  | `"Abcdefgh1"` | 3 | Good |
  | `"Abcdefgh1!xy"` | 4 | Strong |

- [ ] The meter shows "Use 8+ characters" when the password is empty and the matching label once typing starts. A score-1 password of 8+ characters still submits.
- [ ] Clicking the password toggle switches the input between `type="password"` and `type="text"`, and its accessible name between "Show password" and "Hide password", with `aria-pressed` updating to match.

### Submitting and errors

- [ ] During submit, the button reads "Signing in" / "Creating account" with a spinner, and a second click sends no second request.
- [ ] Each response shows the right outcome, and the entered values stay in the fields every time:

  | Mocked or real response | Visible result |
  |---|---|
  | 401 on login | "Email or password is incorrect." |
  | 409 on register | "This email is already registered." on Email; "Sign in instead" switches to Sign in with the email kept |
  | 429 | "Too many attempts. Please wait a minute and try again." |
  | Network failure | "Couldn't reach the server. Please try again." |

- [ ] Signing in with the fixture user lands on `/`.
- [ ] Creating an account with a new email and a name lands on `/`, and `GET /auth/me` returns that name.

### Accessibility

- [ ] Under emulated `prefers-reduced-motion: reduce`:
  - the spinner has no rotation animation
  - the pulsing dot has no animation
  - the submit button has no hover transform

### Layout

- [ ] At 390px viewport width, the brand panel is hidden, the logo and name show above the form, and there is no horizontal scroll.

### Tests

- [ ] Playwright has new visual baselines for `/login` and `/register`.
- [ ] `apps/web/e2e/auth.spec.ts` and `dashboard-visual.spec.ts` pass with the updated selectors.

## Open Questions

- **Product name.** `AI Investment Assistant` is a placeholder taken from the README. The design used "Portland". The final name goes in the single `PRODUCT_NAME` constant.
- **Design prototype.** The design references `Auth.dc.html`, which isn't in the repo. Add it to `resources/UI/` if implementers should work from it rather than from this spec alone.
- **Dark theme.** Should it become its own spec? The design's dark palette to carry over:
  - Backgrounds: `--bg-app #0A1628`, `--bg-card #101F38`, `--bg-card-alt #0D1930`
  - `--border #22314F`
  - Text: `--text-primary #EEF2F8`, `--text-secondary #9AA6BE`, `--text-tertiary #67728C`
  - `--navy #0D1930`, `--navy-2 #16294A`
  - Accents: `--blue #4C87F5`, `--emerald #22C08D`, `--red #F0796C`, amber `#D9A441`
