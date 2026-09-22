# AUTH_UI_SHARED_T-2: `TextField` / `PasswordField` UI primitives

**Shared by:** US-1, US-2
**Status:** Done
**GitHub Issue:** #274 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add `apps/web/components/ui/TextField.tsx` and `apps/web/components/ui/PasswordField.tsx`, presentational components with no `'use client'` of their own, like the existing `Button`/`Card`/`Badge`.

- **`TextField`**
  - Renders a `<label htmlFor>` (11.5px/700, `--text-secondary`) above an `<input>` styled per spec → Behavior Notes → Layout: 13.5px, `11px 13px` padding, 10px radius, `--bg-card-alt` background, `--blue` border plus a 3px ring on focus, `--red` border on error.
  - When `error` is set, renders the error text below and links it through `aria-describedby`.
  - Props: `id`, `label`, `error?`, and every native input prop forwarded.
- **`PasswordField`**
  - A `TextField` with `padding-right: 62px` and a trailing `<button type="button">`.
  - The button's visible text is "Show"/"Hide". Its accessible name is exactly "Show password"/"Hide password", with `aria-pressed` reflecting visibility.
  - Toggling switches the input's `type` between `password` and `text`. Default is hidden.
  - The label stays exactly "Password", so `getByLabel('Password', { exact: true })` finds only the input.

**Test:** `apps/web/components/ui/TextField.test.tsx` and `PasswordField.test.tsx` (Vitest + RTL):
1. `getByLabelText('Email')` returns the input.
2. With `error="Email is required."`, the input's `aria-describedby` points at an element with that text, and `aria-invalid="true"` is set.
3. `PasswordField` starts as `type="password"` with a button named "Show password" and `aria-pressed="false"`.
4. Clicking that button makes the input `type="text"`, and the button becomes "Hide password" with `aria-pressed="true"`.
5. `getByLabelText('Password', { exact: true })` returns only the input, not the toggle.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
