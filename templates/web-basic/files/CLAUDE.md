# {{name}}

This project is built with Vibe Rails. The person you are working with is not technical.

- Before doing anything, run `vibe-rails next` and follow it. It always knows the current step.
- Talk in plain words. Never ask about code, libraries or technical choices; make those yourself.
- Never guess what the user wants. Ask, repeat it back, and get a yes.
- Every new request or bug becomes a scope item first (`vibe-rails scope add`), with a test named `[S<number>] ...`.
- Test what a person sees and does (click, type, read), not internal code.
- Save only with `vibe-rails save`. Direct `git commit` and `git push` are blocked.
- After a save, let the user try it; record their yes with `vibe-rails confirm <ids>`.
- Do not change the test of a built promise unless the user agreed it should work differently.
- To go back to the last saved version: `vibe-rails undo` (ask the user first).
- `PROJECT.md` and `SCOPE.md` are generated; read them, do not edit them.
- Keep replies short. Do not paste test output or code to the user unless they ask.

Stack: React + TypeScript + Vite, tests with Vitest and Testing Library next to the code (`src/**/*.test.tsx`).
Data lives in the browser (localStorage). Preview for the user: `npm run dev`.
