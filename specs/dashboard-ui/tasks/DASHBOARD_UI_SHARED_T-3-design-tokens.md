# DASHBOARD_UI_SHARED_T-3: design tokens from the mockup

**Shared by:** US-1, US-2, US-3, US-4, US-5, US-6, US-7
**Status:** Not Started
**GitHub Issue:** #205 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Port the mockup's design tokens into `apps/web/app/globals.css` as CSS custom properties on `:root`, so every component references `var(--bg-card)` rather than hard-coding hexes. Values come from the light palette in [`resources/UI/portfolio-dashboard.html`](../../../resources/UI/portfolio-dashboard.html) (`rootStyle`, around line 600):

`--bg-app: #F3F5F9`, `--bg-card: #FFFFFF`, `--bg-card-alt: #F7F9FC`, `--border: #E6E9F1`, `--text-primary: #0B1E3D`, `--text-secondary: #5B6478`, `--text-tertiary: #96A0B6`, `--navy: #0B1E3D`, `--navy-2: #15305C`, `--blue: #2F6FED`, `--emerald: #0EA579`, `--emerald-light: #0EA579`, `--red: #D65C4F`, plus `--shadow` and `--shadow-lg`.

Load `Inter` (400–800) via `next/font/google` in `apps/web/app/layout.tsx` and expose it as the body font — `next/font` self-hosts it, so no render-blocking request to `fonts.googleapis.com` and no layout shift. The mockup also loads `Fraunces`; include it only if a component actually uses it, don't ship an unused face.

The mockup ships a **second, dark palette and a theme toggle**. Define only the light palette here — theming isn't in this spec's Goals. Structure the tokens so a `@media (prefers-color-scheme: dark)` block could later override the same names without touching a single component.

**Test:** `apps/web/app/globals.test.ts` (Vitest, reads `globals.css` from disk): asserts every token name the components rely on is declared on `:root` with a non-empty value, and that the file declares no `#FFFFFF`-style hex outside a custom-property declaration. A snapshot of the whole stylesheet would break on every unrelated Tailwind edit; asserting the contract — "these names exist" — is what other tasks actually depend on.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
