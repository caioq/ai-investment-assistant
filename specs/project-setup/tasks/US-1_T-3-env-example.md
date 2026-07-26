# US-1_T-3: .env.example documenting all env vars

**Story:** [../stories/US-1-monorepo-workspace-scaffold.md](../stories/US-1-monorepo-workspace-scaffold.md)
**Status:** Not Started
**GitHub Issue:** #3 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add `.env.example` at repo root documenting every environment variable later specs will need, per spec Goals: `DATABASE_URL`, `JWT_SECRET`, `BRAPI_TOKEN`, `ANTHROPIC_API_KEY`, `FRONTEND_URL` — one `KEY=` line each, with a short comment above each explaining what consumes it (even though most aren't consumed by any code yet).

**Test:** No code exercises this file, so verify by direct inspection: `.env.example` exists at repo root and contains exactly the keys `DATABASE_URL`, `JWT_SECRET`, `BRAPI_TOKEN`, `ANTHROPIC_API_KEY`, `FRONTEND_URL` (grep each key name against the file). Confirm red first (file doesn't exist), then green after creating it.

**Done when:** `.env.example` exists at repo root and contains all five keys listed above.
