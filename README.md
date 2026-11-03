# Timetable

A week timetable that knows what time you actually have free. Classes and other
fixed commitments sit on the grid; tasks carry a deadline *and* an effort
estimate, so the app can tell you where they fit instead of asking you to guess.

Local-first: everything lives in IndexedDB in your browser. No account, no
server.

## Status

Early — the design system and app shell are in place, the scheduling domain is
next. See [Roadmap](#roadmap).

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm test           # domain unit tests
```

## How it fits together

```
src/
  domain/      pure TypeScript — no React, no Zustand, no browser APIs
  store/       Zustand slices + IndexedDB persistence
  components/  week grid, task panel, shadcn primitives in components/ui
  routes/      page-level composition
  styles/      paper textures, hand-drawn geometry, font faces
```

Three rules keep the thing maintainable:

1. **`domain/` imports nothing from React or the store.** It is pure functions
   over plain data, which is why it can be tested in milliseconds.
2. **Rules are stored, occurrences are computed.** A recurring class is a rule;
   the block you see in week 7 is derived from it and never persisted.
3. **Task progress is derived.** `remaining = estimate − Σ scheduled blocks`.
   There is no stored "percent complete" to drift out of sync.

## Design notes

The interface imitates paper on purpose: a dot grid, hand-drawn borders, and
pastel fills paired with darker "pen" tones. Two constraints keep it usable:

- **Virgil carries voice, Inter carries speed.** Handwriting sets titles,
  labels, and block text. Numerals, metadata, and anything you scan in a list
  use Inter with tabular figures — a proportional handwriting face makes a
  column of times jitter.
- **Pastel fill never carries meaning alone.** Every subject is a
  `fill`/`pen` pair; the pen tone passes 4.5:1 against its own fill and drives
  the accent bar and text.

## Roadmap

- [x] Design system: paper surface, sketch geometry, pastel palette, fonts
- [ ] Domain layer: recurrence expansion, interval math, free-time search
- [ ] Persistence: IndexedDB store with seeded demo term
- [ ] Desktop week grid with recurring entries
- [ ] Free-time overlay
- [ ] Task panel with deadlines, priority, and scheduled effort
- [ ] Drag tasks onto the grid, with conflict rejection
- [ ] Mobile day agenda and tap-to-schedule
- [ ] Polish: now-line, undo, print stylesheet

## Stack

Vite · React 19 · TypeScript · React Router · Tailwind v4 · shadcn/ui ·
Zustand · idb-keyval · dnd-kit · Vitest
