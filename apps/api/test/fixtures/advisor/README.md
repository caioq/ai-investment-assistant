# PDF fixtures

`stub-report.pdf` and `blank-report.pdf` are the fixtures `advisor.service.spec.ts`
reads for `ADVISOR_US-1_T-1` (PDF text extraction). Both are generated stubs,
**not** real research house output — the real reports are a paid subscription
product and this repository is public, so no genuine report PDF is ever
committed here. Regenerate either with `reportlab` (Python) if they're ever
lost:

```python
from reportlab.pdfgen import canvas

c = canvas.Canvas("stub-report.pdf", pagesize=(612, 792))
c.setFont("Helvetica", 12)
c.drawString(72, 720, "This is a stub PDF fixture for advisor tests.")
c.save()

c = canvas.Canvas("blank-report.pdf", pagesize=(612, 792))
c.showPage()  # a page with no text content at all
c.save()
```

## The trailing padding is required, not cruft

Both files end with a long PDF comment (`%000...0`) appended after their own
`%%EOF` marker. Trailing bytes after `%%EOF` are always ignored by PDF
readers — re-verified here against `pypdf` — so this changes nothing about
either file's content. It exists to work around a bug in `pdf-parse`'s
bundled (2016-era) PDF.js: on this Node version, PDF.js throws `bad XRef
entry` while fetching an otherwise perfectly valid indirect object when the
**total file size** is small (empirically, under ~4KB — confirmed by
padding alone turning a failing parse into a successful one, with no other
byte changed). Both `reportlab`'s default output and a hand-written minimal
PDF hit this before padding; every multi-KB real-world PDF tried did not.
Don't shrink these files back down without re-checking that `pdf-parse` can
still read them.

## What each fixture is for

- **`stub-report.pdf`** — a normal one-page PDF with one line of real text.
  Extraction must return a string containing that sentence.
- **`blank-report.pdf`** — a one-page PDF with no text content at all.
  `pdf-parse` parses it without throwing and returns a whitespace-only
  string (its per-page separator with nothing in between) — this is the
  fixture for the "parsed but produced only whitespace" failure case,
  distinct from a corrupt/non-PDF buffer.
