# Changes

## 0.2.0: built to grow

Vibe-coded apps usually stop scaling: everything piles into a few huge files, and each change risks breaking something else. Vibe Rails now keeps the code organised from the first line, and the save gate enforces it.

- **Small files.** No source file may pass 200 lines. The gate warns at 160, so the AI splits files before a save is blocked.
- **Saved data in one place.** Only `src/data/` may read or write saved data, so how data is kept can change later without touching the rest of the app.
- **Separate areas.** Each area of the app (for example plants, settings) has its own folder in `src/features/`, and the rest of the app uses it only through its front door, so one area can change without breaking another.
- **Shown from the start.** The starter app has the folders and a small, tested storage helper, and the plan read back to you says how the app is split.
- **Fixed in one go.** Test failures and structure problems are reported together.
- The interview now asks roughly how much data the app will hold.

Measured on the same plant-tracker test as 0.1: the cost was the same ($1.81 for the first version and ten changes), and the app ended as 16 files with the largest at 94 lines, where 0.1 produced one 463-line file.

Projects created with 0.1 keep working and are not checked against the new rules.

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
