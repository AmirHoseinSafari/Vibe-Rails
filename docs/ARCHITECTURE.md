# Architecture

Vibe Rails has three layers. The lower the layer, the less it depends on the AI behaving.

```
skills/        what the AI is told        (prompts; can be ignored by a model)
src/           what the tool decides      (deterministic; same input, same result)
hooks + git    what cannot be skipped     (run outside the AI's control)
```

## The tool (`bin/vibe-rails`, `src/`)

Plain JavaScript (ES modules), Node 20+, no dependencies, no build step.

| File | Role |
|---|---|
| `bin/vibe-rails` | Shell launcher. Checks Node exists, sets `VIBE_RAILS_BIN`, runs `src/cli.js`. On the Bash tool's PATH when the plugin is enabled. |
| `src/cli.js` | Argument parsing and dispatch. Re-installs the git hooks on every run inside a project. |
| `src/commands.js` | One function per command. `next()` is the single source of truth for "what now". |
| `src/hook.js` | Claude Code hooks: `session-start` (one status line) and `pre-tool-use` (refusals). |
| `src/lib/project.js` | State files, interview topics, the only writer of state (`saveState`). |
| `src/lib/render.js` | Generates `PROJECT.md` and `SCOPE.md` from state. |
| `src/lib/tests.js` | Runs the stack's test command, parses the report, and implements `gate()`. |
| `src/lib/git.js` | Git helper, hook installation, remembering the tool's path for the git hooks. |
| `src/lib/github.js` | GitHub device-flow sign-in, repository creation, and git credential storage. |

## A user's project

```
my-app/
  .vibe-rails/
    config.json   name, stack, commands, test report format (written once by init)
    state.json    phase, interview answers, scope items
    tmp/          test reports (git-ignored)
  PROJECT.md      generated: the interview answers and build plan
  SCOPE.md        generated: the promises and their status
  CLAUDE.md       short standing rules for the AI (from the template)
  ...the app
```

### Phases

`interview` → `build`. `vibe-rails approve` is the only transition. It requires every interview topic answered, an approved mock-up, and at least one scope item.

### Mock-up

`mockup/index.html`, one self-contained file written by the AI during the interview phase (the only path the edit hook allows before approval). `vibe-rails mockup approve` stores a hash of the `mockup/` folder in state; `approve` compares it, so a mock-up changed after the user's yes must be shown again.

### Scope items

```json
{ "id": "S3", "type": "feature | bug", "text": "plain-language promise",
  "status": "planned | red | done | dropped",
  "red": { "at": "2026-11-11", "mode": "failed | already-works" },
  "testPrint": "fc90d923b2ce2083",
  "confirmed": "2026-11-12" }
```

- `testPrint` is a fingerprint of the item's tests, recorded when it is saved (`testFingerprints()` in `src/lib/tests.js`). A test's text is the line carrying the tag plus the more-indented lines below it. `save` refuses if a `done` item's fingerprint changed and the item is not in `--for`. Limits: it does not see changes to shared helpers or setup files.
- `confirmed` is set by `vibe-rails confirm` when the user tried it. `red` refuses to start a new item while `MAX_UNTRIED` (5) done items are unconfirmed. `red` takes up to three ids, so related promises can be proven and saved together; each still needs its own failing test. `save` and `next` tell the AI to keep building until that point or until nothing is planned, so the user is asked to try things in batches, not after every promise. Re-saving an item with a changed test clears it.

`planned` → (`vibe-rails red`, the tagged test fails) → `red` → (`vibe-rails save --for`, the gate passes) → `done`.

A test belongs to an item when its full name contains the id in square brackets: `[S3] ...`. This is the whole linking mechanism; there is no mapping file to drift.

### The gate (`gate()` in `src/lib/tests.js`)

Passes only if:

1. the test command succeeds and no test failed, and
2. every `red` or `done` item has at least one test tagged with its id, and that test is not skipped.

`planned` items do not block; they are listed as "not built yet" in every result.

`vibe-rails save` also requires `--for <ids>` (each must be `red` or `done`) or `--tweak`, and records it as a `Scope:` trailer in the commit message, so the git history shows which promise each change served.

### Undo

- `vibe-rails undo` discards unsaved app files (`git reset --hard`) after storing them at `refs/vibe-rails/undo-backup`. State is kept; `red` items return to `planned` because their tests are gone.
- `vibe-rails undo --last-save` reverts the last commit that has a `Scope:` trailer, returns its items to `planned`, runs the gate, and commits `Undo: ...` with `Scope: undo`. It refuses if the gate would fail afterwards.

### Preview

`vibe-rails preview` starts the stack's `dev` command detached, with output to `.vibe-rails/tmp/preview.log`, waits up to 30 seconds for a `http://localhost:<port>` address to appear in it, records `{pid, url}` in `.vibe-rails/tmp/preview.json` and returns. A second call reports the running address; `preview stop` kills the process group. This exists because a dev server never exits: run directly by the AI it blocks the session, and Vite's `--open` sends the user to their system browser instead of the Claude app's own.

### GitHub connection

Online backup is optional. `vibe-rails connect` with no arguments only lists the choices for the AI to offer: `--local` (recorded as `state.backup = 'local'`, which silences the reminder), `--manual` (prints the steps for the user to create a repository, then `connect <url>`), and `--auto` (offered only when a client id is configured). The choices text states the `repo` permission the automatic route needs, and the sign-in instructions repeat it before the user authorises.

`vibe-rails connect --auto` is re-run until done; each call advances one step: use a stored sign-in if it can create the repository, else poll a pending device code (kept in `.git/vibe-rails-github.json`, never committed), else start a new device flow and print what to tell the user. The token goes to `git credential approve`, so git's configured helper stores it. `VIBE_RAILS_GITHUB_WEB`, `VIBE_RAILS_GITHUB_API` and `VIBE_RAILS_GITHUB_CLIENT_ID` override the endpoints and app id; the tests use them to talk to a local fake. Setting `VIBE_RAILS_GITHUB_CLIENT_ID` to an empty value switches the built-in app off (see [GITHUB_APP.md](GITHUB_APP.md)).

The app's sign-ins expire after eight hours. GitHub hands out a renewal token with each one; `storeToken` keeps it in the same credential helper under a made-up host (`<github host>.vibe-rails.invalid`, which git never contacts) as `<expiry time>:<renewal token>`. Every upload goes through `upload()` in `src/commands.js`, which calls `renewSignIn()` first: within five minutes of expiry it swaps both tokens for new ones (a renewal token works once). If GitHub refuses, the save stays local, the output says the sign-in has run out, and `connect --auto` on a connected project signs in again without creating a second repository. An app that does not expire sign-ins sends no renewal token and none of this runs.

## Enforcement

| Mechanism | Where | What it stops |
|---|---|---|
| git `pre-commit` / `pre-push` | `.git/hooks/` in the user's project, written by `installHooks` | Any commit or push that fails the gate, whoever runs it |
| Claude Code `PreToolUse` on `Write/Edit` | `hooks/hooks.json` → `src/hook.js` `checkEdit` | Edits before approval (except `mockup/`); edits to `.vibe-rails/`, `.git/`, `SCOPE.md`, `PROJECT.md` |
| Claude Code `PreToolUse` on `Bash` | `checkBash` | Direct `git commit`/`git push` (which could carry `--no-verify`), hook tampering, shell writes into `.vibe-rails/` |
| Claude Code `SessionStart` | `src/hook.js` | Nothing; it prints one status line and refreshes the hooks |

The git hooks find the tool through `.git/vibe-rails-cli` (rewritten on each run, because the plugin folder moves on update), falling back to `vibe-rails` on PATH. If neither exists, the hook blocks.

`vibe-rails save` runs the gate in-process and then commits with `--no-verify`, so the tests run once per save instead of twice.

Known gaps: the Bash check is pattern-based and can be evaded by an obscure enough command; a human can delete git hooks by hand. Both are accepted for now (see the roadmap).

## Stacks (project templates)

`templates/<name>/stack.json` plus `templates/<name>/files/`. The tool is stack-agnostic: it only needs the commands and how to read the test report.

```json
{
  "name": "web-basic",
  "nodeMajor": 22,
  "commands": { "install": "...", "test": "...", "dev": "..." },
  "report": { "format": "jest-json", "file": ".vibe-rails/tmp/report.json" },
  "testMatch": "\\.test\\.[jt]sx?$"
}
```

Report formats:

- `jest-json`: per-test results (Jest and Vitest both write it). Preferred, because it lets the gate check each scope item's own tests.
- `exit-code`: only pass/fail overall; tags are found by scanning files that match `testMatch`. Weaker: it cannot tell which test failed.

In `files/`, `{{name}}` and `{{slug}}` are replaced, and a file called `gitignore` becomes `.gitignore`.

## Token efficiency

- Outside a Vibe Rails project the plugin adds nothing to the context except three skill descriptions.
- Skills are short and defer to `vibe-rails next`, which prints only the current step.
- Command output is capped: at most 10 failing tests, one line each.
- State lives in files, so nothing depends on the AI remembering earlier conversation.
