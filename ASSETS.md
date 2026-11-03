# Third-party assets

## Virgil (handwriting face)

- **File:** `src/assets/fonts/virgil.woff2`
- **Source:** [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw) →
  `dist/prod/fonts/Virgil/Virgil-Regular.woff2`
- **Used by:** Excalidraw for canvas text. Excalidraw's own interface uses
  Assistant, not Virgil — this project follows the same split, keeping Virgil
  for display/labels and Inter for numerals and dense text.
- **Licensing:** Excalidraw's *code* is MIT. The font file is a separate asset
  and may carry its own terms. **Verify before deploying this publicly.**

### Swapping it out

Point `@font-face` in `src/styles/fonts.css` at another file, then change the
single `--font-hand` value in `src/index.css`. Nothing else references the
font family.

Closest freely licensed substitute: [Caveat](https://fonts.google.com/specimen/Caveat)
(SIL OFL) — install with `npm i @fontsource-variable/caveat` and import it
alongside Inter.

## Inter

- **Source:** `@fontsource-variable/inter` (SIL OFL)
- Loaded through the package's stylesheet in `src/index.css`.
