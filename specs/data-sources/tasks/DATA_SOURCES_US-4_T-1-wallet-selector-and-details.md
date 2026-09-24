# DATA_SOURCES_US-4_T-1: Wallet type selector and detail fields

**Story:** [../stories/US-4-import-model-wallet.md](../stories/US-4-import-model-wallet.md)
**Status:** Done
**GitHub Issue:** #321 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_US-1_T-2

Add `apps/web/components/data-sources/WalletTypeSelector.tsx` and the wallet details fields, both rendered in the wallet panel's header/details slot.

- **Selector**: a segmented control over `DIVIDENDS`, `OVERALL_RECOMMENDED`, `SMALL_CAPS`, each option carrying a 6px status dot — `--emerald` when that type has a version in the summary, `--red` when it doesn't — with an `aria-label` of "Imported" or "Not imported" so the dot isn't colour-only. The active option uses `aria-pressed`.
- **Version note** below it: "Current version: {effectiveDate} · {n} positions", or "No version imported yet. The AI Advisor cannot reference this wallet until one is."
- **Details**: Research house (text, defaults to the last value used in this session) and Effective date (date, defaults to today), both required, built on the existing `TextField`.
- Switching type swaps the note and the details, and — because each type keeps its own pending file (`wallet:{type}`) — must not discard a file attached under another type.

**Test:** `apps/web/components/data-sources/WalletTypeSelector.test.tsx` (Vitest + RTL):
1. Three options render; given a summary with only `DIVIDENDS` imported, its dot has `aria-label="Imported"` and the other two "Not imported".
2. Selecting `SMALL_CAPS` sets `aria-pressed="true"` on it and calls the change handler with `SMALL_CAPS`.
3. With a version present, the note shows its date and position count; without one, it shows the "cannot reference this wallet" sentence.
4. The effective date input defaults to today; the research house input starts empty and keeps a typed value when the type changes.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
