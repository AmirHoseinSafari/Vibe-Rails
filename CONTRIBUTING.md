# Contributing

Ideas, forks and pull requests are welcome. The aim is narrow: help non-technical people build software safely. Changes that make the process heavier for them need a good reason.

## Setup

```bash
git clone https://github.com/AmirHoseinSafari/Vibe-Rails.git
cd Vibe-Rails
npm run setup   # turns on the pre-commit hook that runs the tests
npm test
```

There is nothing to install. Commits are blocked while tests fail, and the same tests run on every push and pull request. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first; it is short.

## Ground rules

- Every new component (command, hook rule, template, report format) comes with tests in the same change, so nobody replaces its behaviour by mistake later. Do not delete or loosen a test to get a change through.
- Every behaviour change comes with a test in `test/cli.test.js`. The tests drive the real tool in a temporary project, using the fake stack in `test/fixtures/fake-stack/`.
- No new runtime dependencies in the tool.
- Rules that matter are enforced in `src/`, not only written in a skill. A prompt is a request; the tool is a guarantee.
- Keep output short and in plain words. Every message that blocks something says what to do next.
- Keep skills short. If you are adding steps to a skill, consider whether `vibe-rails next` should print them instead.

## Adding a project template (stack)

1. Create `templates/<name>/stack.json` and `templates/<name>/files/` (see the Stacks section of the architecture doc).
2. Prefer a test runner that can write Jest-style JSON, so the gate can check each scope item's own tests.
3. Include a `CLAUDE.md` in `files/` with the stack's conventions and a passing smoke test.
4. Try it: `bin/vibe-rails init /tmp/try --template <name>` and play through one scope item.

## Adding a command

Export a function from `src/commands.js` (dashes in the command name become underscores), add it to the help text in `src/cli.js`, and test it.

## Pull requests

Describe what a user will notice. Check [docs/ROADMAP.md](docs/ROADMAP.md) for things that are wanted.
