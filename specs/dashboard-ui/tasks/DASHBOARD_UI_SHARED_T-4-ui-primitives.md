# DASHBOARD_UI_SHARED_T-4: `Button`, `Card`, `Badge` primitives

**Shared by:** US-1, US-2, US-3, US-4, US-5, US-6, US-7
**Status:** Not Started
**GitHub Issue:** #206 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-3

Add the three shared UI primitives the spec's structure names, one file per component under `apps/web/components/ui/` (`CONVENTIONS.md` → "Component conventions"), styled from the `SHARED_T-3` tokens:

- `Button.tsx` — `variant: 'primary' | 'secondary' | 'ghost'`, `disabled`, and a `loading` state that sets `disabled` **and** `aria-busy`. Forwards `...rest` to the underlying `<button>` so callers can pass `type="submit"`/`onClick` without a bespoke prop each time.
- `Card.tsx` — the white rounded surface used by every dashboard section (`--bg-card`, `1px solid --border`, `18px` radius, `--shadow`), with an optional `title` header slot.
- `Badge.tsx` — the pill used for the daily-change and gain/loss indicators, `tone: 'positive' | 'negative' | 'neutral'` mapping to `--emerald`/`--red`/`--text-tertiary`.

All three are presentational and take no `'use client'` directive of their own — `Button`'s interactivity comes from props supplied by whichever client component renders it, so marking it client-side here would pull every page that shows a card into the client bundle.

**Test:** `apps/web/components/ui/Button.test.tsx`, `Card.test.tsx`, `Badge.test.tsx` (Vitest + RTL, colocated): `Button` renders its children, fires `onClick` when enabled, does **not** fire when `disabled`, and sets `aria-busy` with `disabled` when `loading`; `Card` renders its `title` and children; `Badge` applies the positive tone for `tone="positive"` and the negative tone for `tone="negative"`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
