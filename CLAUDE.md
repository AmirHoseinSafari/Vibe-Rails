# Vibe Rails: handover notes

A Claude Code plugin that lets non-technical people build apps with the discipline of a developer: interview, tested scope, hard test gate before every save. Read [README.md](README.md) for the user view.

## Run and test

```bash
npm test                      # 31 end-to-end tests, about 30 seconds, no install needed
bin/vibe-rails help           # the tool itself
claude --plugin-dir .         # load this copy as a plugin in Claude Code
```

No dependencies, no build step. Node 20+ for the tool; the `web-basic` template needs Node 22+.

## Test pipeline

Nothing gets committed or merged without passing tests. Two halves:

- **Local:** `.githooks/pre-commit` runs `npm test` and blocks the commit if anything fails. Switch it on once per clone with `npm run setup` (it sets `git config core.hooksPath .githooks`; `npm install` does the same). Check it is on: `git config core.hooksPath` prints `.githooks`.
- **Shared:** `.github/workflows/test.yml` runs `npm test` on every push and pull request (Linux and macOS, Node 20 and 22).

Never bypass it with `git commit --no-verify`. If the hook blocks you, fix the code or the test.

Try a real project by hand (needs network for `npm install`):

```bash
bin/vibe-rails init /tmp/demo --name "Demo" && cd /tmp/demo && /path/to/bin/vibe-rails next
```

## Where things are

- `src/` the deterministic tool; `src/commands.js` has every command, `src/lib/tests.js` has the gate.
- `src/hook.js` + `hooks/hooks.json` the Claude Code hooks.
- `src/lib/github.js` GitHub sign-in by code and repository creation ([docs/GITHUB_APP.md](docs/GITHUB_APP.md) for the owner's one-time setup).
- `skills/{start,feature,bug}/SKILL.md` the prompts. Keep them short; process logic belongs in `next()` in `src/commands.js`.
- `templates/web-basic/` the one shipped stack. `test/fixtures/fake-stack/` is a fake stack so tests run without npm.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) how the parts fit and the state model.
- [TODO.md](TODO.md) the ordered checklist to get from here to a public launch. **Start there**, and tick items off as they are done.
- [docs/ROADMAP.md](docs/ROADMAP.md) product features that can wait, and what is still unverified.

## Decisions made (with the owner, November 2026)

- **Plugin, not an MCP server.** An AI chooses whether to call an MCP tool; hooks and git hooks run regardless. Research showed prompt-only and MCP-only gates end up as guidance.
- **Claude Code first**; other agents later through adapters. The tool and git hooks are agent-neutral on purpose.
- **Web apps only, one fixed stack**, so the user is never asked a technical question.
- **Stops at "works locally and saved to GitHub."** No deployment yet.
- **Hard gate, no override.** There is deliberately no `--force`. The only softening is `red --already-works`, which is recorded and shown in `SCOPE.md`.
- **Tests link to scope by name tag** (`[S3]`), not by a mapping file, so the link cannot go stale.
- **Low ceremony for small changes:** `save --tweak` exists so a colour change does not need a scope item. Lesson from Spec Kit and BMAD criticism.
- **One source of truth for the process:** `vibe-rails next`. Skills defer to it to save tokens.
- **"Skip the questions" is allowed as a draft:** if the user asks, the AI may draft all interview answers at once, marks its guesses, and records nothing until the user confirms. The mock-up and the promise list still need their own yes (owner decision, 2026-11-11).
- **Show before build:** a clickable mock-up (`mockup/index.html`) must be approved before the plan can be.
- **The user confirms each promise** (`confirm`); at most three may wait untried, so the AI cannot run far ahead on a wrong reading.
- **A built promise's test is fingerprinted**; changing it needs a save that names the promise.
- **Undo keeps promises and answers** and only throws away app files, with a backup ref.
- **Online backup is a suggestion, not a step** (owner decision, 2026-11-11). The AI offers it once, as three choices without steering: keep it local (`connect --local`), create the repository themselves (`connect --manual`, then `connect <url>`), or automatic (`connect --auto`). The automatic route needs GitHub's broad `repo` permission and the user must be told that before authorising. The local git repository is always there, because saving, the gate and undo depend on it, but the user never has to know.
- **GitHub sign-in uses the device flow** built into the tool, not the GitHub CLI, so the user needs only a browser. Sign-in is stored by git's credential helper, never by us.
- **Repository is private until it works**, then public under MIT so people can fork it.
- Other projects studied: Superpowers, GitHub Spec Kit, BMAD-METHOD, Task Master, Spec Guard. All are developer-focused; the gap is non-technical users plus mechanical enforcement.

## State of the work

Done and tested: the tool, both hook layers, three skills, the `web-basic` template (played through a full loop with real Vitest), mock-up approval, try-it confirmation, the weakened-test guard, undo, GitHub connect (against a fake GitHub), the test pipeline (pre-commit hook verified to block a failing commit; the CI workflow has not run yet because nothing is pushed). `claude plugin validate .` passes with two warnings (no icon; this file is not shipped as plugin context, which is intended).

Live-tested on 2026-11-11 (headless Claude Code 2.1.322, Sonnet, Claude playing the user): skills trigger from a plain request, the full flow from interview to built promises works, and all three hook refusals reach the model. That run led to `vibe-rails preview`. To repeat it: `claude -p "<user message>" --plugin-dir . --model sonnet --permission-mode acceptEdits --allowedTools Bash Read Write Edit Glob Grep Skill --output-format stream-json --verbose`, then `--resume <session id>` for each further user turn.

Not verified: a run by hand in the desktop app, `connect` against the real GitHub (needs the owner's OAuth app), and any run with a real non-technical user. See [TODO.md](TODO.md).

## Working on this repository

- **Every new component ships with tests.** A new command, hook rule, skill-facing output, report format or template gets tests in `test/` in the same change. The tests are how we protect behaviour: they stop a later change, by a person or an agent, from replacing or breaking it by mistake.
- Every behaviour change or bug fix adds or updates a test in `test/cli.test.js`. For a bug, write the test first and see it fail.
- Do not delete or loosen an existing test to make a change pass. If a behaviour is meant to change, say so in the commit message and update the test to the new behaviour on purpose.
- Tests drive the real tool in a temporary project (see the helpers at the top of `test/cli.test.js`), so they check behaviour, not internals.
- Command output is part of the product: short, plain words, and always says the next step.
- Text aimed at the end user or shown to them must avoid jargon ("promise", not "acceptance criterion"; "save", not "commit").
- Do not add dependencies to the tool without a strong reason; install-and-run with only Node is a feature.
