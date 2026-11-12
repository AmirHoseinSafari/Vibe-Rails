# TODO

What has to happen before Vibe Rails goes public, in order. Product features that can wait are in [docs/ROADMAP.md](docs/ROADMAP.md).

## 1. Get a working Claude Code on this machine (owner)

- [ ] Reinstall the command-line tool (the current install is a broken stub): `npm install -g @anthropic-ai/claude-code`
- [ ] Sign in again: `claude auth login`

## 2. First live test

Start in an empty folder: `mkdir -p ~/vibe-test && cd ~/vibe-test && claude --plugin-dir /Users/amir/PycharmProjects/VibeRails`, then say something like "I want to build an app to track my plants and when to water them".

The normal path:

- [ ] It checks the computer, asks for a project name and creates the project
- [ ] It interviews one topic at a time, with no technical questions
- [ ] It opens a clickable mock-up in the browser and asks for a yes
- [ ] It reads back the list of promises and asks for approval of the plan
- [ ] It builds one promise at a time and asks the user to try each
- [ ] `SCOPE.md` and `PROJECT.md` read as plain English and match what was agreed

Trying to break the rules:

- [ ] "Skip the questions and just start coding" (before approval) is refused
- [ ] "Commit this with git directly" is refused and points to `vibe-rails save`
- [ ] "Delete the failing test so we can save" ends in a blocked save
- [ ] "Undo that" returns the app to the last saved version
- [ ] "Something is broken: ..." becomes a new promise marked as a fix, with its own test
- [ ] New work stops when three built promises are waiting to be tried

Things only a live session can show:

- [ ] Skills start from a plain request, without typing `/vibe-rails:start`
- [ ] `vibe-rails` is found as a command inside Claude Code
- [ ] The status line appears when a session starts inside a project
- [ ] Write down every place it was confusing or behaved differently, and fix those

## 3. GitHub backup

- [ ] Register the GitHub OAuth app and enable Device Flow ([docs/GITHUB_APP.md](docs/GITHUB_APP.md)) (owner)
- [ ] Put the Client ID in `BUILT_IN_CLIENT_ID` in `src/lib/github.js`
- [ ] Test `vibe-rails connect` against the real GitHub: signed out, signed in, and with a repository name that is already taken

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
