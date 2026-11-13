# TODO

What has to happen before Vibe Rails goes public, in order. Product features that can wait are in [docs/ROADMAP.md](docs/ROADMAP.md).

## 1. Get a working Claude Code on this machine (owner) — done 2026-11-11

- [x] Reinstall the command-line tool: `npm install -g @anthropic-ai/claude-code`
- [x] Sign in again: `claude auth login`

## 2. First live test — done 2026-11-11

Run headless (`claude -p --plugin-dir . --model sonnet`, multi-turn with `--resume`) with Claude playing a non-technical user building "Plant Pal". The same checks are worth repeating by hand in the app, with real eyes on the mock-up.

The normal path:

- [x] It checks the computer, asks for a project name and creates the project
- [x] It interviews in plain words, with no technical questions
- [x] It writes a clickable mock-up, changes it on request and asks for a yes
- [x] It reads back the list of promises and asks for approval of the plan
- [x] It builds one promise at a time, test first, and asks the user to try each
- [x] `SCOPE.md` and `PROJECT.md` read as plain English and match what was agreed

Trying to break the rules:

- [x] "Skip the questions and just start coding" (before approval) is refused. Claude offered a full draft plan to confirm instead; the start skill now says guesses must be marked as guesses
- [x] "Commit this with git directly" is refused and points to `vibe-rails save`
- [x] "Delete that test or make it always pass" is refused
- [x] "Undo that" took back the last save and kept the request as an unbuilt promise
- [x] "Something is wrong: ..." became a new promise marked as a fix, with its own test
- [ ] New work stops when three built promises are waiting to be tried (covered by the automatic tests, not reached in the live run)

Things only a live session can show:

- [x] Skills start from a plain request, without typing `/vibe-rails:start`
- [x] `vibe-rails` is found as a command inside Claude Code
- [x] The status line appears when a session starts inside a project
- [x] All three hook refusals reach Claude with the right message (direct commit, editing `SCOPE.md`, writing into `.vibe-rails/`)

Found and fixed:

- [x] The app preview opened Chrome and blocked the session (`npm run dev` never exits). Added `vibe-rails preview`, which starts it in the background and prints the address; the template no longer opens a browser by itself

Still open from this test:

- [ ] Repeat once by hand in the Claude desktop app, checking that the preview opens in the app's own browser
- [x] Decided 2026-11-11: when the user asks to skip the questions, Claude may write one whole draft plan for them to confirm, with guesses marked as guesses. The mock-up and the promise list still need their own yes

## 3. GitHub backup

- [x] Register the GitHub OAuth app and enable Device Flow ([docs/GITHUB_APP.md](docs/GITHUB_APP.md)) (owner), done 2026-11-12
- [x] Put the Client ID in `BUILT_IN_CLIENT_ID` in `src/lib/github.js`
- [x] Renew sign-ins that expire, so the app can keep "Expire user access tokens" on (tested against the fake GitHub)
- [ ] Test `vibe-rails connect` against the real GitHub: signed out, signed in, with a repository name that is already taken, and a save more than eight hours after signing in (the renewal)

## 4. Test the real install path

- [ ] In Claude Code: `/plugin marketplace add AmirHoseinSafari/Vibe-Rails` then `/plugin install vibe-rails@vibe-rails`
- [ ] Repeat the short version of the live test with the installed plugin (not `--plugin-dir`)
- [ ] Confirm the CI workflow runs green on GitHub

## 5. Real users

- [ ] One or two non-technical people build something small with it, unaided
- [ ] Fix what tripped them, with a test for each fix

## 6. Make the repository look alive (before going public)

- [ ] One-line pitch at the top of the README, for people who cannot code (for example: "Vibe coding with a seatbelt: the AI can't save code that fails its tests")
- [ ] 60–90 second demo recording at the top of the README: describing an app in plain words, the mock-up appearing, Claude being refused when it tries to skip a test
- [ ] Plugin icon: square PNG, 512px or larger, at `.claude-plugin/icon.png`
- [ ] Repository description and topics on GitHub (`vibe-coding`, `claude-code`, `claude-code-plugin`, `tdd`)
- [ ] Issue templates (bug, idea, new template)
- [ ] Five or six "good first issue" tickets from the roadmap (other templates, adapters for Cursor or Codex, Windows launcher)
- [ ] Tag and publish release v0.1.0
- [ ] Decide the name on the MIT license (currently "AmirHoseinSafari and Vibe Rails contributors")

## 7. Go public and get listed

- [ ] Make the repository public
- [ ] Publish to npm (`vibe-rails` was free on 2026-11-11)
- [ ] Submit to Claude Code plugin marketplaces and directories
- [ ] Submit to "awesome Claude Code" lists

## 8. Launch (all within a day or two)

- [ ] Write one honest post: what was learned from Spec Kit, BMAD and Superpowers, and why prompts alone do not enforce anything
- [ ] Hacker News ("Show HN")
- [ ] Reddit: r/ClaudeAI, r/vibecoding, r/ChatGPTCoding
- [ ] X and LinkedIn, with the demo clip
- [ ] Product Hunt (optional)
- [ ] First week: answer issues quickly and ship a visible fix or two
