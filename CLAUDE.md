# HOLLOW — project instructions for Claude

This is **HOLLOW**, an INSIDE-style atmospheric puzzle-platformer (vanilla JS +
canvas, no build step, must run from `file://`). Built across multiple sessions.

## Session protocol (do this every session)

1. Read `dev/STATUS.md` (current state, known issues) and `dev/TASKS.md`
   (ordered task list with acceptance criteria).
2. Pick the next unchecked task(s) in order. Don't skip ahead — later tasks
   assume earlier ones are done and tested.
3. **Test what you build.** Open `index.html` in a browser (or
   `python3 -m http.server`) and verify acceptance criteria before checking a
   task off. Untested code is not done.
4. Before ending: update `dev/STATUS.md` (what changed, what's broken, what
   surprised you) and check off completed tasks in `dev/TASKS.md`.

## Hard rules

- Plain `<script>` files, no ES modules, no fetch/XHR, no external assets —
  the game must work opened directly from the filesystem. All audio is
  synthesized in `js/audio.js`, all art is procedural canvas drawing.
- Load order in `index.html` matters: util → audio → player → entities →
  render → levels1 → levels2 → game.
- `dev/DESIGN.md` is the design bible (mechanics rules, all 8 chapter designs,
  physics capabilities for level design). Follow it; if you must deviate,
  record the deviation in DESIGN.md itself.
- `dev/ARCHITECTURE.md` documents every existing API and data format. Keep it
  current when you add or change interfaces.
- Tone: no tutorials-as-text beyond faint minimal hints, no UI chrome, no
  score. Atmosphere over everything. When in doubt, ask "would INSIDE do this?"
