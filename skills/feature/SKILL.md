---
name: feature
description: Add something new to an app built with Vibe Rails. Use when the user asks for a new feature, a change in behaviour, or an addition, in a folder that contains a .vibe-rails directory.
---

# Add a feature

The user is not technical. Ask only about what they want to see and do, never about code.

1. If you do not already know from this conversation where the project stands, run `vibe-rails next`. If the plan is not approved yet, follow that instead.
2. Make sure you understand the request. If it is clear, go ahead: the user tries the result afterwards, and that is their check. Ask first only when a real choice changes what gets built; then ask everything in one message, with examples and the answer you would suggest.
3. Split it into promises: short plain sentences about something a person can see or do. Add each one: `vibe-rails scope add "<promise>"`. The tool answers with its id, such as `S7`.
4. For each promise (those that belong together can be done in one go, at most three: `vibe-rails red S7 S8`, one save `--for S7,S8`). Be sparing with steps: chain related commands in one call and do not run the tests yourself.
   - Write a test that checks it the way a person would use it, with the id in the test's name: `[S7] ...`.
   - Run `vibe-rails red S7`. It must confirm the test fails. If it says the test already passes, make the test stricter; use `--already-works "<why>"` only if the app truly did this before.
   - Write the code until the test passes.
   - Run `vibe-rails save "<what changed, in plain words>" --for S7`.
5. If the save is blocked, read the short reason, fix the cause, and save again. Do not weaken or delete tests to get through.
6. When the save says it is time for the user to try things, tell them in one or two sentences what now works, run `vibe-rails preview`, open the address it prints for them, and tell them what to click. When they say it works, run `vibe-rails confirm S7`. If it is not what they meant, treat that as a bug.
7. If things went wrong and the user wants the old version back, `vibe-rails undo` returns to the last save. Ask first.

If the request conflicts with an existing promise, tell the user which one, and agree whether to reword it (`vibe-rails scope edit`) or remove it (`vibe-rails scope drop <id> "<reason>"`) before building.
