---
name: feature
description: Add something new to an app built with Vibe Rails. Use when the user asks for a new feature, a change in behaviour, or an addition, in a folder that contains a .vibe-rails directory.
---

# Add a feature

The user is not technical. Ask only about what they want to see and do, never about code.

1. Run `vibe-rails next`. If the plan is not approved yet, follow that instead.
2. Make sure you understand the request. If anything is unclear, ask, with examples to choose from. Say back what you will build in one or two sentences and get a yes.
3. Split it into promises: short plain sentences about something a person can see or do. Add each one: `vibe-rails scope add "<promise>"`. The tool answers with its id, such as `S7`.
4. For each promise, in order:
   - Write a test that checks it the way a person would use it, with the id in the test's name: `[S7] ...`.
   - Run `vibe-rails red S7`. It must confirm the test fails. If it says the test already passes, make the test stricter; use `--already-works "<why>"` only if the app truly did this before.
   - Write the code until the test passes.
   - Run `vibe-rails save "<what changed, in plain words>" --for S7`.
5. If the save is blocked, read the short reason, fix the cause, and save again. Do not weaken or delete tests to get through.
6. Tell the user in one or two sentences what now works, start the preview (`npm run dev`) and tell them what to click. When they say it works, run `vibe-rails confirm S7`. If it is not what they meant, treat that as a bug.
7. If things went wrong and the user wants the old version back, `vibe-rails undo` returns to the last save. Ask first.

If the request conflicts with an existing promise, tell the user which one, and agree whether to reword it (`vibe-rails scope edit`) or remove it (`vibe-rails scope drop <id> "<reason>"`) before building.
