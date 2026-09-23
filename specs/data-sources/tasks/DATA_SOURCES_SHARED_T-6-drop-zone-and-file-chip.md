# DATA_SOURCES_SHARED_T-6: `DropZone` and `FileChip` primitives

**Shared by:** US-2, US-3, US-4, US-5
**Status:** Not Started
**GitHub Issue:** #313 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add two presentational components under `apps/web/components/ui/`, styled per the prototype at `resources/UI/Data Sources.html` using existing tokens.

**`DropZone.tsx`** — props `{ accept: '.csv' | '.pdf'; label: string; hint: ReactNode; onFile: (file: File) => void; onReject: (message: string) => void }`.
- Dashed `--border` border on `--bg-card-alt`; while a file is dragged over, `--blue` border with a light blue tint.
- Clicking anywhere opens a hidden `<input type="file">` filtered to `accept`.
- **Keyboard-operable**: it is a real focusable control whose accessible name includes the accepted format ("Drop an assets CSV here, or click to browse — CSV only"), and Enter or Space opens the browser.
- A file whose extension doesn't match `accept` calls `onReject('{name} is not a CSV file.')` (or "…a PDF file.") and **never** calls `onFile` — both for drops and for browser selection.

**`FileChip.tsx`** — props `{ name: string; meta: string; kind: 'csv' | 'pdf'; onReplace: () => void; onRemove: () => void }`. Format tile, ellipsis-truncated name, meta line, and Replace / × actions with accessible names.

**Test:** `apps/web/components/ui/DropZone.test.tsx` and `FileChip.test.tsx` (Vitest + RTL):
1. The drop zone is reachable by keyboard and its accessible name mentions CSV.
2. Dropping a `.csv` calls `onFile` with that file and does not call `onReject`.
3. Dropping a `.pdf` on a `.csv` zone calls `onReject` with "report.pdf is not a CSV file." and never calls `onFile`.
4. A drag-over then drag-leave toggles the active styling (assert a `data-` attribute or class, not a colour).
5. `FileChip` renders the name and meta, and its Replace and × buttons call their handlers.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
