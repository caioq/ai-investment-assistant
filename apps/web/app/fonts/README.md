# `apps/web/app/fonts/`

Self-hosted webfonts, loaded with `next/font/local` from `app/layout.tsx`
(Inter, app-wide) and `app/(auth)/layout.tsx` (Fraunces, scoped to the auth
route group).

## Why these are committed rather than fetched

`next/font/google` downloads the font **at build time**. When
`fonts.gstatic.com` is slow or refuses a request, `next build` fails with
`next/font/google queries have exactly one entry` and a wall of
`module-not-found` traces — a confusing error that has nothing to do with
the change being built. It broke CI on several PRs that touched no frontend
code at all (e.g. a shell-script fix and an API-only migration), each time
costing a re-run and an investigation.

Committing the files removes the network from the build entirely. The
trade-off is 83 KB in the repo and a manual step to update them.

## What these files are

| File | Family | Axis range | Subset |
| --- | --- | --- | --- |
| `Inter-latin-variable.woff2` | Inter | `wght 400..800` | latin |
| `Fraunces-latin-variable.woff2` | Fraunces | `wght 500..600` | latin |

Both are the **variable** `latin`-subset files Google itself serves, so one
file covers every weight the app uses, and the rendered result is identical
to what `next/font/google` produced. Only `latin` is included, matching the
`subsets: ["latin"]` the previous loaders declared — add another subset here
if the UI ever needs one.

Both families are licensed under the SIL Open Font License 1.1:
[Inter](https://fonts.google.com/specimen/Inter/license),
[Fraunces](https://fonts.google.com/specimen/Fraunces/license).

## Updating them

Fetch the `latin` block's `woff2` URL from the CSS API with a browser
`User-Agent` (without one, Google serves legacy `ttf`), then download it:

```sh
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
curl -s -H "User-Agent: $UA" 'https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap'
# copy the src url from the @font-face block whose unicode-range contains U+0000-00FF
curl -sL -o Inter-latin-variable.woff2 '<that url>'
```

If a `weight` range here ever changes, update the matching `localFont({ weight })`
call in the layout too — `next/font/local` does not infer it from the file.
