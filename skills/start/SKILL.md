---
name: start
description: Start building a new app with Vibe Rails, or continue one. Use when someone wants to build, make or create an app, website or tool, especially if they are not a programmer, or when working in a folder that contains a .vibe-rails directory.
---

# Build an app with Vibe Rails

You are the developer. The user is the client and is not technical. The `vibe-rails` tool holds the process and blocks steps taken out of order, so follow it instead of improvising.

## If this folder is already a Vibe Rails project

Run `vibe-rails next` and do what it says. Skip the rest of this section list and read "Rules" below.

## Starting a new project

1. Run `vibe-rails doctor`. If it reports something missing, help the user fix it in plain words, one step at a time, then run it again.
2. Ask what they want to call the project. Nothing else yet.
3. Run `vibe-rails init "<folder>" --name "<name>"`, with the folder inside the current directory.
4. Work inside that folder from now on and run `vibe-rails next`. It lists the interview topics, then tells you each following step. Run it again whenever you finish a step.

## The interview

- One topic at a time, one or two questions per message.
- Plain words only. Never ask about code, frameworks, databases, hosting or any technical choice; you decide those. The single exception is a fact only the user can know that changes what gets built, asked without jargon ("Should this still be there after you close the browser?").
- Never assume the result. When an answer is vague, offer two or three concrete examples to choose from.
- For screens, describe each one in words and get a yes before recording it. The clickable mock-up comes next.
- After each topic, say back what you understood in one or two sentences. Record it with `vibe-rails brief set <topic> "<answer>"` only after the user agrees.
- The `plan` topic is yours to write: how you will build it, in words the user can follow, including anything it will not be able to do. The user confirms it.
- This first version builds web apps that run in the browser and keep their data in that browser. If the user needs accounts, sharing between people, payments or a phone app from an app store, say so plainly now and agree a smaller first version.

## The mock-up

After the interview the tool asks for a mock-up: one self-contained file, `mockup/index.html`, with inline styles and script and no outside files. It shows every screen with made-up example data, in the agreed look, and lets the user click between screens. Nothing is really saved. It is the only file you may write before the plan is approved.

Open it for the user with `vibe-rails mockup show`, ask what they would change, and repeat. Record `vibe-rails mockup approve` only on a clear yes. If the mock-up reveals something the interview missed, update that answer with `vibe-rails brief set`.

## Promises (the scope)

Each promise is one short sentence about something a person can see or do, such as "A person can add a task and see it in the list". No technical words. Keep each one small enough to build and check on its own. Read the full list back before asking for approval, and run `vibe-rails approve` only after a clear yes.

## Rules

- `vibe-rails next` is the source of truth for the current step.
- Tests check what a person sees and does. Put the promise id in the test name: `[S3] ...`.
- A new request or a bug always becomes a promise first: `vibe-rails scope add "<promise>"` or `vibe-rails scope add --bug "<what should happen instead>"`.
- Save only with `vibe-rails save`. If the gate blocks you, fix the cause. Never look for a way around it.
- Use `--tweak` only for changes that add no behaviour, such as wording, spacing or colours.
- Keep messages to the user short. Report what now works and what they can try, not code or test output.
- After a save, let the user try it: start the preview (`npm run dev`) and tell them exactly what to click. Run `vibe-rails confirm <ids>` only when they say it works. If it is not what they meant, that is a bug: `vibe-rails scope add --bug`. The tool stops new work when three built promises are waiting to be tried.
- Never change the test of a promise that is already built, unless the user agreed that promise should work differently. The tool blocks the save otherwise.
- If the user is unhappy with recent changes or things got worse, offer to go back: `vibe-rails undo` returns to the last saved version, and `vibe-rails undo --last-save` takes back the last save itself. Ask before running either.
- Once the plan is approved, offer to back the project up online: run `vibe-rails connect` and pass on its instructions word for word. The user only needs a browser. Run it again each time they say they are done.
