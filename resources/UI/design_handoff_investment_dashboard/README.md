# Handoff: Investment Portfolio Dashboard

## Overview
A high-fidelity dashboard concept for a retail investment platform. Users see a portfolio summary, drill-down asset allocation, a benchmark performance chart, a sortable holdings table, and an AI-generated portfolio review ("institutional analyst" tone, not a chatbot). Includes a light/dark theme toggle.

## About the Design Files
The file in this bundle (`Investment Dashboard.dc.html`) is a **design reference built in HTML** — a working prototype showing intended look, data, and interaction behavior. It is not production code to copy directly. The task is to **recreate this design in the target codebase's existing environment** (React, Vue, native, etc.) using its established component library, state management, and data-fetching patterns — or, if no environment exists yet, choose the most appropriate framework and implement it there.

## Fidelity
**High-fidelity.** Colors, typography, spacing, chart geometry, and interactions in the HTML file are final-intent and should be recreated pixel-close. Copy/labels are illustrative (mock data) and should be replaced with real portfolio data from the backend.

## Screens / Views
Single screen: **Dashboard** (home). Left sidebar nav references four other sections (Portfolio, Performance, AI Advisor, Settings) that are out of scope for this pass — clicking them today shows a "coming soon" toast; they should become real routes later.

### Layout
- CSS Grid, 2 columns: `80px` (sidebar) `1fr` (main content). Full viewport height.
- Sidebar: vertical icon rail, centered items, logo mark at top, theme toggle + avatar pinned to bottom.
- Main content: vertical stack with `28px` gap, `32px 40px` padding, max content area scrolls independently.
- Order top→bottom: page header → hero summary card → 2-column row (allocation card `420px` fixed + performance card `1fr`) → holdings table (full width).

### Components

**Sidebar (80px wide)**
- Logo: 36×36 rounded-square (10px radius), navy→blue gradient, white "P" monogram, Fraunces serif.
- Nav items: 34×34 icon square (9px radius) + 9.5px label below, single-letter glyph. Active state: blue background (`--blue`), white glyph, bold dark label. Inactive: neutral background, tertiary-gray glyph/label.
- Nav list: Dashboard, Portfolio, Performance, AI Advisor, Settings.
- Theme toggle: 38×22 pill switch, thumb slides left/right, track turns emerald when dark mode is on.
- Avatar: 34×34 circle, emerald fill, white initials.

**Page header**
- Eyebrow "DASHBOARD" (12px, 600, uppercase, tertiary color) + Fraunces 26px greeting headline.
- Right-aligned "Markets open" pill with pulsing emerald dot.

**Hero summary card**
- Navy gradient background (`--navy` → `--navy-2`, 155deg), 20px radius, decorative radial-gradient blur circle top-right (clipped to its own layer, not the whole card, so nothing else clips).
- Large stat: "Total portfolio value" label (13px uppercase, 55% white) + 46px Fraunces value.
- Day change pill: arrow + $ delta + % delta, pill background green/red at 25% opacity depending on sign.
- Prominent CTA button, top-right: "Generate AI Portfolio Review" — emerald gradient, pulsing white dot, rounded 13px, lifts on hover.
- 4-column metric strip below (1px gaps simulate hairline dividers via background color): Total return, Total invested, Cash available, Holdings count. Each cell: 11.5px uppercase label, 19px bold value, small caption below.

**Asset Allocation card (420px)**
- Segmented control (3 buttons: Category / Subcategory / Asset) — active button is white/card-colored with subtle shadow.
- Active filter chip (shown only when a segment was clicked to drill down) with an "×" to clear.
- Donut: 230×230px built from CSS `conic-gradient` (not SVG), computed per current grouping. Center hole (inset 26px) shows either the hovered segment's % or the total invested value.
- Legend rows below: color swatch, label, %, and $ value. Hover highlights the row and updates the donut center; click drills down (Category → Subcategory, Subcategory → filters holdings table, Asset → filters table to that ticker).

**Portfolio Performance card (flexible width)**
- Header: title + legend (Portfolio line = blue, S&P 500 = dashed gray) with live return % per line.
- Time range segmented control: 1M / 3M / 6M / 1Y / 3Y / 5Y / All.
- SVG line chart, viewBox `0 0 640 220`: gridlines at 20/40/60/80%, benchmark as dashed gray line, portfolio as solid blue line with a soft blue gradient fill beneath it. X-axis labels below.

**Holdings table (full width)**
- Header row: title + row count + search input (with icon) + category `<select>` filter.
- Sticky table header, scrollable body (max-height 520px).
- Columns: Logo/Ticker (colored monogram avatar + ticker), Company, Category (colored pill), Price, Avg Price, Market Value, Gain/Loss ($ + %, green/red), Weight (%), Performance (12-point SVG sparkline, green/red by trend).
- Column headers are clickable to sort (ticker, name, category, price, avg price, gain/loss %, market value); active column shows an arrow indicator; click again to reverse direction.
- 32 mock holdings across 8 sectors (Technology, Financials, Healthcare, Consumer Discretionary, Energy, Utilities, Communication Services, Industrials).

**AI Portfolio Review panel**
- Full-height slide-in panel from the right, 560px wide (max 92vw), backdrop blur + dim overlay, closes on backdrop click or × button.
- Header: navy gradient matching hero, "AI PORTFOLIO ADVISOR" eyebrow, "Portfolio Review" title, generation timestamp + data-source line.
- ~1.1s simulated "analyzing" loading state (spinner + copy) before the report renders — represents an async AI call in production.
- Report body: attribution banner ("cross-references your portfolio against the Meridian Research Q3 Sector Outlook…"), then three sections:
  - **Strengths** — checkmark bullets, emerald accent.
  - **Risks** — "!" bullets, red accent.
  - **Recommendations** — cards with title, priority badge (High/Medium/Low, color-coded), confidence % with progress bar, and expected impact label.

## Interactions & Behavior
- **Theme toggle**: swaps a full CSS custom-property palette (light/dark) on a root wrapper; every element reads `var(--*)` tokens, so no per-component logic needed elsewhere.
- **Allocation drill-down**: Category click → switches to Subcategory view scoped to that category (breadcrumb chip appears) → Subcategory click filters the holdings table by subcategory. Asset-mode click filters the table to that single ticker (sets the search box).
- **Table**: search filters by ticker/company substring; category `<select>` filters by sector; both combine with any allocation-driven filter. Sorting is per-column, toggles ascending/descending.
- **AI CTA**: opens the panel immediately in a loading state, then swaps to the populated report after ~1.1s (stand-in for a real async model call).
- **Nav items** other than Dashboard: click shows a 2.2s auto-dismissing toast ("X is coming soon") instead of navigating.
- Micro-interactions: CTA button lift on hover, pulsing "market open" dot, animated panel slide-in, smooth `transition` on donut gradient / chart paths / sort changes.

## State Management
Suggested state shape (see the DC's `state` object for the reference implementation):
- `theme`: 'light' | 'dark'
- `allocationMode`: 'category' | 'subcategory' | 'asset', plus `allocationFilterCategory` / `allocationFilterSub` / `allocationFilterAsset` for drill-down, `hoveredKey` for legend hover
- `performanceRange`: one of 1M/3M/6M/1Y/3Y/5Y/All
- `searchQuery`, `categoryFilter` (table filters)
- `sortColumn`, `sortDir` (table sort)
- `aiPanelOpen`, `aiGenerating`, `aiReportReady` (AI panel lifecycle)
- `activeNav`, `navToast` (nav + toast)

Data requirements for production:
- Holdings list (ticker, name, category, subcategory, quantity, avg price, current price, daily % change) — from a portfolio/positions service and a live quote feed.
- Cash balance — from account service.
- Historical portfolio value + benchmark series per time range — from a performance/analytics service.
- AI review content — from an LLM call grounded in the user's portfolio plus a research-house report (the design explicitly calls out this data source in the UI copy for credibility).

## Design Tokens

**Light theme**
- `--bg-app: #F3F5F9` `--bg-card: #FFFFFF` `--bg-card-alt: #F7F9FC` `--border: #E6E9F1`
- `--text-primary: #0B1E3D` `--text-secondary: #5B6478` `--text-tertiary: #96A0B6`
- `--navy: #0B1E3D` `--navy-2: #15305C` `--blue: #2F6FED` `--emerald: #0EA579` `--red: #D65C4F`
- Shadow (card): `0 1px 2px rgba(16,24,40,0.04), 0 2px 8px rgba(16,24,40,0.04)`
- Shadow (hero/panel): `0 24px 60px rgba(11,30,61,0.28)`

**Dark theme**
- `--bg-app: #0A1628` `--bg-card: #101F38` `--bg-card-alt: #0D1930` `--border: #22314F`
- `--text-primary: #EEF2F8` `--text-secondary: #9AA6BE` `--text-tertiary: #67728C`
- `--navy: #0D1930` `--navy-2: #16294A` `--blue: #4C87F5` `--emerald: #22C08D` `--red: #F0796C`
- Shadow (card): `0 1px 2px rgba(0,0,0,0.3)`
- Shadow (hero/panel): `0 20px 50px rgba(0,0,0,0.45)`

**Typography**
- Display/headline font: `Fraunces` (serif, weights 500/600) — used for the portfolio value, page greeting, panel title.
- UI font: `Inter` (weights 400–800) — everything else.
- Minimum body size: 12px (table cells); headline sizes range 15–46px.

**Spacing / radius**
- Card radius: 18–20px. Pills/badges: 6–13px. Buttons: 13px.
- Card padding: 24px (charts/table header), 32px (hero).
- Grid gaps: 24–28px between major sections.

**Category color mapping** (used for donut segments, table category pills, avatar backgrounds)
- Technology `#2F6FED` · Financials `#1B2A4A` · Healthcare `#10B981` · Consumer Discretionary `#D9A441` · Energy `#C2703D` · Utilities `#0EA5A4` · Communication Services `#6366A6` · Industrials `#8891A5`

## Assets
No external image/icon assets — all visuals are CSS (gradients, conic-gradient donut) or inline SVG (line chart, sparklines). Fonts loaded from Google Fonts (Inter, Fraunces).

## Files
- `Investment Dashboard.dc.html` — the full design reference (markup + component logic combined in one file, as authored in this design tool). Read it top to bottom: layout/markup first, then the data + interaction logic below it.
