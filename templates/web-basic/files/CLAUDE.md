# {{name}}

This project is built with Vibe Rails. The person you are working with is not technical.

- Before doing anything, run `vibe-rails next` and follow it. It always knows the current step. Most commands then print the step that follows.
- Be sparing with steps: chain related commands in one call, and do not run the tests yourself (`vibe-rails red` and `vibe-rails save` run them).
- Talk in plain words. Never ask about code, libraries or technical choices; make those yourself.
- Never guess what the user wants. Ask, and have them confirm the whole plan before building.
- Every new request or bug becomes a scope item first (`vibe-rails scope add`), with a test named `[S<number>] ...`.
- Test what a person sees and does (click, type, read), not internal code.
- Save only with `vibe-rails save`. Direct `git commit` and `git push` are blocked.
- Do not stop for the user after every save. When `vibe-rails save` or `vibe-rails next` says so, let them try everything that is waiting in one message; record their yes with `vibe-rails confirm <ids>`.
- Do not change the test of a built promise unless the user agreed it should work differently.
- To go back to the last saved version: `vibe-rails undo` (ask the user first).
- `PROJECT.md` and `SCOPE.md` are generated; read them, do not edit them.
- Keep replies short. Do not paste test output or code to the user unless they ask.

Stack: React + TypeScript + Vite, tests with Vitest and Testing Library next to the code (`src/**/*.test.tsx`).

How the code is organised, so it stays easy to change as the app grows (the save gate enforces the first three):

- No file over 200 lines. Write small files from the start; when one grows, split it.
- `src/data/` is the only place that reads or writes saved data (`storage.ts` has `load` and `save`). When the shape of saved data changes, keep old data readable.
- `src/features/<area>/` holds one area of the app (for example `plants`, `settings`): its components, logic and tests. Other code uses an area only through its `index.ts`.
- `src/App.tsx` only lays out the screens and puts the areas together. `src/ui/` holds small shared pieces.
- Keep logic (working things out) in plain functions, separate from components (showing things), so it can be tested and reused.
Data lives in the browser (localStorage). Preview for the user: `vibe-rails preview` (runs in the background and prints the address). Do not run `npm run dev` yourself; it never finishes.
