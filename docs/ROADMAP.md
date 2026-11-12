# Roadmap

## Needs the owner (do these first)

- [ ] **Register the GitHub OAuth app** and put its Client ID in `src/lib/github.js` ([GITHUB_APP.md](GITHUB_APP.md)). Until then `vibe-rails connect` only gives manual steps. The sign-in flow is tested against a fake GitHub, never against the real one.
- [x] **One live session** (done 2026-11-11, headless; results in [TODO.md](../TODO.md)). Still worth one run by hand in the desktop app.
- [ ] Run a full project with a real non-technical user and note where the interview, mock-up or build loop confuses them.

## Next

- [ ] Release polish: plugin icon (512px+ square PNG at `.claude-plugin/icon.png`), demo recording, issue templates, version tag, npm publish (`vibe-rails` was free on 2026-11-11), marketplace submission.
- [ ] Re-approval when interview answers change after building has started.
- [ ] Windows support (replace the shell launcher or add a `.cmd` one).
- [ ] A second stack with a real backend and database, for apps that need accounts or shared data.
- [ ] Putting the app online (deployment) as an optional final step.
- [ ] Adapters for other coding agents (Cursor, Codex, Gemini CLI). The tool and git hooks are already agent-neutral; only `skills/` and `hooks/hooks.json` are Claude Code specific.
- [ ] `vibe-rails undo --restore` to bring back what an undo threw away (the backup ref already exists).

## Ideas

- Extend the test fingerprint to shared helpers and setup files.
- Tamper evidence for `.vibe-rails/state.json` (the Bash check is pattern-based).
- A quality check for tests, so `[S3] works` with an empty body does not count.
- A plain-language "what changed since last time" summary for the user from the `Scope:` commit trailers.
