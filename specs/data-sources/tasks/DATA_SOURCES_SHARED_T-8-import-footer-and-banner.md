# DATA_SOURCES_SHARED_T-8: `ImportFooter` gate and `Banner`

**Shared by:** US-2, US-3, US-4, US-5
**Status:** Not Started
**GitHub Issue:** #315 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_SHARED_T-2

Add two components under `apps/web/components/data-sources/`.

**`ImportFooter.tsx`** — owns the import gate from spec → Import gate. Props cover the file's validation result, whether skipping is **available** for this source, the skip state and its setter, whether the detail fields are complete, the button label, and the import/cancel handlers.

- Left: the "Skip {n} rows with errors" checkbox, rendered **only** when there are row errors, no required column is missing, **and** skipping is available. It is checked by default. Below it, the first unmet gate rule as an inline hint.
- Right: Cancel, then the primary button whose label counts the rows that will actually be written ("Import 8 assets"), or "Add to AI context" for the report, becoming "Importing"/"Processing" with a spinner while in flight.
- Disabled when any gate rule is unmet; repeat clicks while importing fire nothing.
- Hints, verbatim: "Add the missing columns and re-upload." / "Fix errors or skip those rows to continue." / "Fix the errors and re-upload — a wallet file is imported all at once." / "Add the research house and effective date." / "Add title, publisher and publication date."
- Under `prefers-reduced-motion: reduce` the spinner doesn't rotate (reuse `Button`'s existing `navy` + `loading` behaviour rather than a second spinner).

**`Banner.tsx`** — `{ kind: 'success' | 'error'; message: string; onDismiss: () => void }`, emerald or red tint, ✓ or ! icon, dismiss button with an accessible name, `role="status"` for success and `role="alert"` for error.

**Test:** `apps/web/components/data-sources/ImportFooter.test.tsx` and `Banner.test.tsx` (Vitest + RTL):
1. 10 rows / 2 errors with skipping available: the checkbox is present and checked, and the button reads "Import 8 assets" and is enabled.
2. Unchecking it disables the button and shows "Fix errors or skip those rows to continue."
3. With skipping **unavailable** (wallets) and one row error: no checkbox is rendered, the button is disabled, and the hint is the wallet one.
4. A missing required column shows "Add the missing columns and re-upload." and disables the button, even with skip checked.
5. Incomplete detail fields show the matching hint and disable the button.
6. While `importing`, the button is `aria-busy`, and clicking it again doesn't call `onImport` a second time.
7. `Banner` renders its message, uses `role="alert"` when `kind="error"`, and calls `onDismiss`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
