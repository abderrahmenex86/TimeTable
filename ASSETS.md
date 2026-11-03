# Third-party assets

## Virgil (handwriting face)

- **File:** `src/assets/fonts/virgil.woff2`
- **Licence file:** `public/licenses/virgil-OFL.md`, served at
  `/licenses/virgil-OFL.md` and linked from Settings — OFL-1.1 requires the
  notice to travel with the font, and for a web app that means shipping it in
  the build.
- **Source:** [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw) →
  `dist/prod/fonts/Virgil/Virgil-Regular.woff2`. Upstream:
  [excalidraw/virgil](https://github.com/excalidraw/virgil).
- **Author:** Ellinor Rapp.
- **Licence:** SIL Open Font License 1.1, with "Virgil" as a Reserved Font
  Name. Free for personal and commercial use, including redistribution bundled
  with software. The restrictions are: the font may not be sold on its own, a
  *modified* version may not use the reserved name, and the licence text must
  travel with the font — which is why `Virgil-LICENSE.md` sits beside it.
- **Used by:** Excalidraw for canvas text. Excalidraw's own interface uses
  Assistant, not Virgil — this project follows the same split, keeping Virgil
  for display/labels and Inter for numerals and dense text.

### Swapping it out

Point `@font-face` in `src/styles/fonts.css` at another file, then change the
single `--font-hand` value in `src/index.css`. Nothing else references the
font family. Remember to remove `Virgil-LICENSE.md` if the font goes.

Closest freely licensed substitute: [Caveat](https://fonts.google.com/specimen/Caveat)
(SIL OFL) — install with `npm i @fontsource-variable/caveat` and import it
alongside Inter.

## Inter

- **Source:** `@fontsource-variable/inter` (SIL OFL)
- Loaded through the package's stylesheet in `src/index.css`.
