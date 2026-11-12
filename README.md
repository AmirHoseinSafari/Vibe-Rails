# Vibe Rails

Guard rails for vibe coding. Vibe Rails lets someone with no programming knowledge build an app with an AI the way a careful developer would: agree what to build first, write a test for every promise, and never save work that fails its tests.

It is a plugin for [Claude Code](https://claude.com/claude-code). The steps are enforced by a small tool, not by asking the AI nicely, so they happen the same way every time.

> Status: early version (0.1). Builds browser-based web apps. macOS and Linux.

## What it does

1. **Creates the project** as a git repository with the test gate installed.
2. **Interviews you in plain language** about what the app is for, who uses it, what they do, what it looks like and what is left out. No technical questions. The AI may not write any code until you approve the plan.
3. **Shows you a clickable mock-up** of every screen, and changes it until you say it is right.
4. **Turns the plan into promises**, short sentences like "A person can add a task and see it in the list". They live in `SCOPE.md`, which you can read at any time.
5. **Builds one promise at a time.** The AI writes a test, the tool confirms the test fails before the code exists (so the test really checks something), then the AI writes the code.
6. **Gates every save.** Before anything is committed or pushed, all tests must pass and every promise must still have a test. If not, nothing is saved.
7. **Asks you to try it.** After a promise is built you try it and say whether it is what you meant. The AI cannot run far ahead: new work stops while three built promises are waiting for you.
8. **Treats bugs and new features the same way.** Each becomes a new promise with its own test, so a fixed bug stays fixed.
9. **Lets you go back.** "Undo" returns the app to the last saved version, or takes back the last save.
10. **Backs the project up to your GitHub**, in a private repository. You type a short code in your browser; no terminal needed.

## Install

You need the [Claude desktop app or Claude Code](https://claude.com/claude-code), [Node.js](https://nodejs.org) (LTS) and Git.

In Claude Code, run:

```text
/plugin marketplace add AmirHoseinSafari/Vibe-Rails
/plugin install vibe-rails@vibe-rails
```

## Use

Open Claude Code in an empty folder and say what you want, for example:

> I want to build an app to track my plants and when to water them.

Or run `/vibe-rails:start`. Claude will check your computer, create the project and start asking questions.

Later, in the project folder:

- "I'd like to add ..." starts the feature flow (`/vibe-rails:feature`).
- "... is not working" starts the bug flow (`/vibe-rails:bug`).

## How it stays on the rails

| Rule | Enforced by |
|---|---|
| No code before the plan is approved | A Claude Code hook refuses file edits (except the mock-up) until `vibe-rails approve` |
| The plan includes a mock-up you approved | `vibe-rails approve` fails without one, or if it changed after your yes |
| A built promise's test is not quietly weakened | `vibe-rails save` fails if that test changed and the save is not about that promise |
| You try what was built | `vibe-rails red` refuses new work while three built promises are untried |
| Every promise has a test | `vibe-rails save` and the git hooks fail if a promise has no passing test tagged with its id |
| A test must fail before the code exists | `vibe-rails red <id>` runs the tests and refuses a test that already passes |
| Nothing is saved with failing tests | git `pre-commit` and `pre-push` hooks run the gate; direct `git commit`/`git push` by the AI is refused |
| The scope is not edited behind your back | State files change only through the tool; `SCOPE.md` and `PROJECT.md` are generated |

The AI's instructions are three short skills. The process itself lives in one command, `vibe-rails next`, which prints the current step in a few lines. This keeps token use low: nothing is loaded outside Vibe Rails projects, and command output is short by design.

## Limits of this version

- One project template: a React web app that keeps its data in the browser. No accounts, shared data, payments or app-store apps yet.
- It stops at "works on your computer and is saved to GitHub". It does not put the app online.
- GitHub sign-in by code needs a one-time setup by the project owner ([docs/GITHUB_APP.md](docs/GITHUB_APP.md)). Until then, connecting to GitHub is a manual step.
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
