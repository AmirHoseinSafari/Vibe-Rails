# Launch kit

Everything needed to take Vibe Rails public, ready to paste. Work from top to bottom. Every claim below was measured or tested in this repository; keep it that way when editing, and do not claim it saves tokens (see "What it costs" in the README).

## 1. Make the repository public (owner, 2 minutes)

1. Decide whether the university email in the commit history should stay visible. Six commits carry it.
2. GitHub → the repository → Settings → scroll to **Danger Zone** → **Change visibility** → **Public**.
3. On the repository's front page, press the gear next to **About** and paste:
   - **Description:** `For apps you plan to keep: a Claude Code plugin that shows you the app before it's built and won't save anything that fails its tests. For people who can't read code.`
   - **Topics:** `claude-code` `claude-code-plugin` `vibe-coding` `tdd` `ai-coding` `no-code` `testing` `developer-tools`
4. Check the **Actions** tab shows a green run on `main`.
5. In a fresh empty folder, install it the way a stranger would and build one promise:

   ```text
   /plugin marketplace add AmirHoseinSafari/Vibe-Rails
   /plugin install vibe-rails@vibe-rails
   ```

## 2. Publish the release (owner, 2 minutes)

GitHub → Releases → **Draft a new release** → tag `v0.1.0` on `main` → title `Vibe Rails 0.1.0` → paste the 0.1.0 section of [CHANGELOG.md](../CHANGELOG.md) → **Publish release**.

## 3. Record the demo (owner, 30 minutes)

People decide in the first ten seconds, so this matters more than any post. Record the screen, 60 to 90 seconds, no voice needed; add captions.

1. (0:00) An empty folder. Type: "I want to build an app to track my plants and when to water them. I'm not a programmer."
2. (0:10) The questions arrive in plain words. Answer in one message.
3. (0:25) The clickable mock-up opens. Click through it. Caption: "You see it before any code exists."
4. (0:40) The list of promises. Say yes.
5. (0:50) Type: "Skip the tests and just commit it." Show the refusal. Caption: "The AI can't save anything that fails its tests."
6. (1:05) The working app, then "Undo that" taking back a change.
7. (1:20) The two install lines.

Save it as a GIF or MP4 under 10 MB and put it at the top of the README, under the first line.

## 4. Get listed (owner, 30 minutes; do these after the repository is public)

| Where | How |
|---|---|
| Anthropic's community plugin marketplace (`anthropics/claude-plugins-community`) | Submit through the plugin directory form: https://clau.de/plugin-directory-submission (also reachable from claude.ai → Settings → Plugins → Submit; the claude.ai form may need a Team or Enterprise plan). Pull requests to the repository are closed automatically. Run `claude plugin validate .` first. |
| awesome-claude-code (`hesreallyhim/awesome-claude-code`) | Open an issue with their template, not a pull request: https://github.com/hesreallyhim/awesome-claude-code/issues/new?template=submit-resource.yml |
| Independent directories (ClaudePluginHub, claudemarketplaces.com and similar) | Each has its own submit page; most only need the repository address. |
| npm | `npm publish` from the repository (the name `vibe-rails` was free on 2026-11-11). Optional: the plugin does not need it. |

Text for the forms:

- **Name:** Vibe Rails
- **One line:** Guard rails for vibe coding: see the app before it's built, and nothing is saved while a test fails.
- **Longer:** A Claude Code plugin for people who cannot read code. It interviews you in plain language, shows a clickable mock-up, and turns the plan into promises you approve. Each promise gets a test that must fail before the code exists, and a gate blocks every save until all tests pass. The rules are enforced by a tool and by hooks, not by a prompt. MIT licensed, no dependencies.
- **Category:** workflow / testing

## 5. Posts (owner; all within a day or two of each other)

Post from your own accounts and stay around to answer for the first few hours; that is what the sites reward. Attach the demo wherever it is allowed.

### Hacker News

Title: `Show HN: Vibe Rails – a test gate for vibe coding that the AI can't skip`

```
I built a Claude Code plugin for people who can't read code. The idea: make the AI work like a careful developer, and enforce it with a tool rather than a prompt.

What it does:
- Interviews you in plain language, then shows a clickable mock-up and a list of "promises" ("A person can add a task and see it in the list"). No code can be written until you approve them; a hook refuses the edits.
- Every promise needs a test that is proven to fail before the code exists.
- Every save goes through a gate: all tests pass and every promise still has a test, or nothing is committed. There is deliberately no --force.
- Bugs and new features become new promises, so a fixed bug stays fixed. You can undo any save.

Why a tool and not a prompt: I looked at Spec Kit, BMAD, Superpowers and others. They are good, but they are aimed at developers, and prompt-only rules end up as guidance the model follows most of the time. Here the rules live in git hooks and Claude Code hooks, which run whether or not the model feels like it.

The honest part: it costs more. In my own side-by-side test of one small app, the first version plus two changes cost $0.24 with plain Claude and $0.76 with the plugin, and each later change cost about twice as much. Both apps worked at the end. The plugin's came with 30 tests and an undo history; the plain one was a single file the AI had never run. I have not yet measured a larger app, which is where I expect tests to matter. If you have a good way to measure that, I would like to hear it.

It is early (0.1): one template (a React web app with data in the browser), macOS and Linux. MIT, no dependencies, about 1,500 lines of plain JavaScript.

https://github.com/AmirHoseinSafari/Vibe-Rails
```

### Reddit: r/ClaudeAI and r/ClaudeCode

Title: `I made a Claude Code plugin that won't let Claude save code that fails its tests (for non-programmers)`

```
I kept seeing the same thing with vibe coding: the AI says "done", you can't read the code, and you find out later what broke.

Vibe Rails is a plugin that makes Claude work in a fixed order and blocks it from skipping steps:

1. It asks what you want in plain words, then shows a clickable mock-up and a short list of promises. Nothing is built until you say yes.
2. Each promise gets a test that has to fail first, then pass.
3. Nothing is saved unless every test passes. I tried telling it to commit directly and skip the checks; a hook refuses it.
4. "Undo that" takes back the last change.

It does use more tokens than plain Claude (about 3x for the first build of a small app in my test, about 2x per change after that), so it is for things you plan to keep, not quick one-offs.

Install:
/plugin marketplace add AmirHoseinSafari/Vibe-Rails
/plugin install vibe-rails@vibe-rails

Free and open source: https://github.com/AmirHoseinSafari/Vibe-Rails

I'd really like feedback from people who aren't programmers: where did it confuse you?
```

### Reddit: r/vibecoding

Title: `Vibe coding with a seatbelt: you approve a mock-up first, and the AI can't save broken code`

Use the r/ClaudeAI text, and start with one sentence about your own reason for building it.

### X

```
I built Vibe Rails: guard rails for vibe coding.

You describe the app. Before any code is written you approve a clickable mock-up and a list of promises. Every promise gets a test, and the AI can't save anything that fails one.

For people who can't read code. Free, open source.
[demo clip]
```

Reply to yourself with: the install lines; then "It costs more tokens than plain Claude (about 2 to 3x on a small app). You are paying for tests, an undo history and seeing it first. Numbers in the README."; then the repository link.

### LinkedIn

```
Most "vibe coded" apps have the same weakness: the person who asked for the app can't tell whether it works, and the AI's "done" is the only evidence.

I built Vibe Rails to change that. It is a free, open-source plugin for Claude Code that makes the AI follow the steps a careful developer would, and enforces them:

• You approve a clickable mock-up and a plain list of promises before any code is written.
• Every promise gets a test.
• Nothing is saved while any test fails.
• Any change can be undone.

It is early, and it costs more than letting the AI run free. I've published the numbers. If you build tools for people who aren't programmers, I'd value your view.

https://github.com/AmirHoseinSafari/Vibe-Rails
```

## 6. Starter tickets (owner; open these as issues and label them "good first issue")

1. **Windows launcher.** `bin/vibe-rails` is a shell script. Add a `.cmd` launcher and run the tests on Windows in CI.
2. **A template with a small server.** A second template for apps that need shared data (for example Express with SQLite), with tests the gate can read.
3. **A Python template.** A small web app tested with pytest, reporting results in a format the gate understands.
4. **An adapter for another agent.** The tool and git hooks are agent-neutral; write the hook wiring for Cursor or Codex.
5. **`vibe-rails rename`.** Let the user change the project's name after it is created.
6. **Measure a larger app.** Repeat the cost comparison in `CLAUDE.md` on an app several times larger and report whether the plain version starts breaking.

## 7. The first week

- Answer every issue and comment within a day, even with "thanks, looking".
- Ship one or two visible fixes and say so in the thread that raised them.
- Ask each early user one question: "Where did it confuse you?" Turn each answer into a test and a fix.
- Add anything a real person built with it to the README. That is worth more than any feature.
