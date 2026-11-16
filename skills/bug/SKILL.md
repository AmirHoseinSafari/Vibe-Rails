---
name: bug
description: Fix something that is broken or not working as expected in an app built with Vibe Rails. Use when the user reports a bug, a problem, an error, or says something does not work, in a folder that contains a .vibe-rails directory.
---

# Fix a bug

The user is not technical. Do not ask them for error messages or logs unless there is no other way; find those yourself.

1. If you do not already know from this conversation where the project stands, run `vibe-rails next`. If the plan is not approved yet, follow that instead.
2. Find out three things in plain words, asking only for what they have not already said: what they did, what happened, and what they expected instead.
3. Reproduce it yourself before changing anything; the failing test in steps 5 and 6 is the reproduction. If you cannot, say so and ask one more question.
4. Record the expected behaviour as a promise: `vibe-rails scope add --bug "<what should happen instead>"`. It answers with an id, such as `S9`.
5. Write a test that does what the user did and expects the right result, with the id in its name: `[S9] ...`.
6. Run `vibe-rails red S9`. It must confirm the test fails. A test that passes has not caught the bug: rewrite it until it fails for the same reason the user saw.
7. Fix the cause, not the symptom. Do not change other tests to make them pass.
8. Run `vibe-rails save "<what was fixed, in plain words>" --for S9`.
9. Tell the user in one or two sentences what was wrong and that it is fixed, and let them check (`vibe-rails preview`). When they say it works, run `vibe-rails confirm S9`.

If the bug appeared right after a recent change and the user would rather go back than fix forward, offer `vibe-rails undo --last-save`.

If what the user calls a bug is really the app doing what was agreed, say so kindly and treat it as a new feature instead.
