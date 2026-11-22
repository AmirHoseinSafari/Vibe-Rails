# Vibe Rails

**For apps you plan to keep and grow: see it before it's built, the AI can't save anything that fails its tests, and the code stays organised as the app gets bigger.**

Vibe Rails is a plugin for [Claude Code](https://claude.com/claude-code) for people who cannot read code. You describe the app in plain words. Before any code is written you approve a clickable mock-up and a short list of promises ("A person can add a task and see it in the list"). Every promise gets a test, nothing is saved unless all of them pass, and the code is kept in small, separate pieces so new features don't break old ones. If a change goes wrong, you can go back.

The steps are enforced by a small tool, not by asking the AI nicely, so they happen the same way every time.

## Install

You need the [Claude desktop app or Claude Code](https://claude.com/claude-code), [Node.js](https://nodejs.org) (version 22 or newer) and Git. In Claude Code, run:

```text
/plugin marketplace add AmirHoseinSafari/Vibe-Rails
/plugin install vibe-rails@vibe-rails
```

Then open Claude Code in an empty folder and say what you want, for example:

> I want to build an app to track my plants and when to water them.

## Is it for you?

**Yes, if** you are building something you will keep, rely on or hand to other people, and you cannot check the code yourself. You get three things plain "vibe coding" does not give you:

- **You see it first.** A clickable mock-up and a plain list of promises, approved by you, before any code exists.
- **"It works" is checked.** Every promise has a test, and the tool refuses to save while any test fails.
- **Built to grow.** The code is kept in small, separate pieces from the first line, so the app can keep getting new features. (More below.)
- **Nothing is lost.** Every step is a save you can undo, with a readable record of what was agreed.

**No, if** you want a quick one-off. Plain Claude will build that faster and cheaper.

### What it costs

It uses more tokens, and we would rather say so. In our own side-by-side test (one small app, built once each way, same model), the first version plus two changes cost $0.24 without the plugin and $0.77 with it; ten further changes cost $0.49 without and $1.04 with. Both apps worked at the end. The plugin's version came with 28 tests, 18 undoable saves and 16 small, organised files; the plain one was a single file with no tests, and the AI never ran it. We have not yet measured a larger app, where tests and structure should matter more.

## Built to grow

Vibe coding usually breaks down as an app grows. The AI piles everything into a few huge files, and after a while every change risks breaking something that used to work. Vibe Rails keeps the code organised from the first line, and the save gate enforces it, so it does not depend on the AI remembering:

- **Small files.** No file of code may pass 200 lines. The AI is warned before a file gets there, so it splits it in time.
- **One area per folder.** Each part of the app (your plants, your settings) lives in its own folder and is used by the rest only through its front door, so one part can change without breaking another.
- **Saved data in one place.** Only one folder reads or writes your saved data, so the way data is kept can change later (for example, moving to a server) without rewriting the app.
- **Tests make reorganising safe.** Because every promise has a test, the AI can split and move code and prove nothing changed.

In our test (one plant tracker, the same ten feature requests each time), the app ended as 16 small files, the largest 94 lines, with saved data handled in one file. Without these rules the same app was a single 463-line file with Vibe Rails 0.1, and a single 289-line file without the plugin. The cost was the same as before. We have not yet measured a much larger app, so this is a well-organised base to grow on, not a guarantee.

> Status: early version (0.2). Builds browser-based web apps. macOS and Linux.

## What it does

1. **Creates the project** as a git repository with the test gate installed.
2. **Interviews you in plain language** about what the app is for, who uses it, what they do, what it looks like and what is left out. No technical questions, a few at a time. The AI may not write any code until you approve the plan.
3. **Shows you a clickable mock-up** of every screen, and changes it until you say it is right.
4. **Turns the plan into promises**, short sentences like "A person can add a task and see it in the list". They live in `SCOPE.md`, which you can read at any time.
5. **Builds a few promises at a time.** For each one the AI writes a test, the tool confirms the test fails before the code exists (so the test really checks something), then the AI writes the code.
6. **Gates every save.** Before anything is committed or pushed, all tests must pass, every promise must still have a test, and the code must stay organised (small files, separate areas, saved data in one place). If not, nothing is saved.
7. **Asks you to try it.** You try what was built, a few promises at a time, and say whether it is what you meant. The AI cannot run far ahead: new work stops while five built promises are waiting for you.
8. **Treats bugs and new features the same way.** Each becomes a new promise with its own test, so a fixed bug stays fixed.
9. **Lets you go back.** "Undo" returns the app to the last saved version, or takes back the last save.
10. **Offers an online backup, as your choice.** You can keep everything on your own computer, create a GitHub repository yourself and hand over its address, or let Vibe Rails create a private one in your own account after you type a short code in your browser. The automatic way needs GitHub's "full control of private repositories" permission, and you are told so before you agree.

## Later changes

You can also start with `/vibe-rails:start`. Once the first version exists, in the project folder:

- "I'd like to add ..." starts the feature flow (`/vibe-rails:feature`).
- "... is not working" starts the bug flow (`/vibe-rails:bug`).

## How it stays on the rails

| Rule | Enforced by |
|---|---|
| No code before the plan is approved | A Claude Code hook refuses file edits (except the mock-up) until `vibe-rails approve` |
| The plan includes a mock-up you approved | `vibe-rails approve` fails without one, or if it changed after your yes |
| A built promise's test is not quietly weakened | `vibe-rails save` fails if that test changed and the save is not about that promise |
| You try what was built | `vibe-rails red` refuses new work while five built promises are untried |
| Every promise has a test | `vibe-rails save` and the git hooks fail if a promise has no passing test tagged with its id |
| A test must fail before the code exists | `vibe-rails red <id>` runs the tests and refuses a test that already passes |
| Nothing is saved with failing tests | git `pre-commit` and `pre-push` hooks run the gate; direct `git commit`/`git push` by the AI is refused |
| No file of code grows past the limit | `vibe-rails save` and the git hooks fail on a file over the stack's line limit (200 for the web template), and warn at 80% |
| Saved data is handled in one place | The gate fails if code outside `src/data/` reads or writes saved data |
| Each area of the app stays separate | The gate fails if one folder in `src/features/` reaches inside another instead of using its index file |
| The scope is not edited behind your back | State files change only through the tool; `SCOPE.md` and `PROJECT.md` are generated |

The AI's instructions are three short skills. The process itself lives in the tool: each command prints the step that follows in a few lines. Nothing is loaded outside Vibe Rails projects, and command output is short by design.

## Limits of this version

- One project template: a React web app that keeps its data in the browser. No accounts, shared data, payments or app-store apps yet.
- It stops at "works on your computer and is saved to GitHub". It does not put the app online.
- The automatic GitHub backup is new and has had little real-world use. The other two choices (keep it local, or create the repository yourself) do not depend on it.
- The Claude Code hooks are a strong fence, not a vault: a determined person can remove git hooks by hand. The goal is to stop an AI from drifting, not to stop a human who wants out.
- Windows is untested (the launcher is a shell script; it should work in WSL).

## For developers

```bash
git clone https://github.com/AmirHoseinSafari/Vibe-Rails.git
cd Vibe-Rails
npm test
```

No dependencies and no build step. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add a project template or a command, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the parts fit together. To try your copy as a plugin: `claude --plugin-dir /path/to/Vibe-Rails`.

## License

[MIT](LICENSE)
