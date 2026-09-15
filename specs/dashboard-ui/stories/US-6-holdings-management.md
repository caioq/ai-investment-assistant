# US-6: Add holdings by hand or by CSV

**Status:** Ready
**Traces to:** spec Goal "Holdings management page: manual add form + CSV upload" / spec AC "Holdings page CSV upload shows per-row success/error feedback matching the backend's `{ created, updated, errors[] }` response" (in `../spec.md`)

As an investor with a broker export, I want to upload it in one go and still be able to type in a single position by hand, so that getting my portfolio into the app isn't thirty separate forms.

## Tasks

- [ ] [T-1: manual add-holding form](../tasks/DASHBOARD_UI_US-6_T-1-add-holding-form.md)
- [ ] [T-2: holdings CSV upload with per-row feedback](../tasks/DASHBOARD_UI_US-6_T-2-csv-upload.md)
- [ ] [T-3: `/holdings` page](../tasks/DASHBOARD_UI_US-6_T-3-holdings-page.md)

## Notes

**A partial import is the normal outcome, not a failure.** A real broker export produces a non-empty `errors[]` alongside a healthy `created` count. The AC asks for per-row feedback because the alternative — one number saying "12 imported" — hides the three rows that silently didn't, which the user only discovers when the dashboard total is wrong. Render created, updated, and every error entry as three separate facts.

**No client-side CSV parsing.** The backend resolves columns by header name (`Ticker`, `Quantidade`, `Preco Médio`) and ignores the other twenty; a frontend pre-check would be a second parser that drifts from it. The file input's `accept` is as far as this goes.

**Upper-case the ticker before sending.** `petr4` typed in lower case would otherwise create a second `Asset` for a ticker that already exists.

**Refresh via `router.refresh()`, not a local array patch.** The dashboard holds its own server-rendered copy of the holdings; hand-patching local state leaves the two views disagreeing.
