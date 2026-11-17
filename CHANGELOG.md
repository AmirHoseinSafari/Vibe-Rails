# Changes

## 0.1.0 (first public version)

Vibe Rails is a Claude Code plugin for people who cannot read code. It makes the AI work the way a careful developer would, and enforces that with a tool instead of a prompt.

What is in it:

- A plain-language interview, a clickable mock-up and a list of promises, each approved by you before any code is written.
- A test for every promise, proven to fail before the code exists.
- A gate before every save: nothing is saved while any test fails or a promise has no test.
- You try what was built a few promises at a time; new work stops while five are waiting.
- Bugs and new features become promises with their own tests.
- Undo for unsaved work and for the last save.
- An optional online backup on GitHub, with three choices: keep it local, create the repository yourself, or automatic.
- One project template: a React web app that keeps its data in the browser.

Known limits: macOS and Linux only; web apps without accounts or shared data; it does not put the app online; the automatic GitHub backup has had little real-world use.

What it costs: in our own test of one small app it used about three times the tokens of plain Claude for the first version and about twice as much for each later change. See the README.
