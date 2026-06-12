# HOLLOW — project instructions for Claude

This is **HOLLOW**, an INSIDE-style atmospheric puzzle-platformer (vanilla JS +
canvas, no build step). Built across multiple sessions. It runs from `file://`,
but **recorded audio requires serving over http** (`python3 -m http.server`) —
see Hard rules. Without a server it still runs; audio falls back to synth.

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

- Plain `<script>` files, no ES modules, no build step. **All art is
  procedural canvas drawing** (no image assets — that rule stands).
- Audio: synthesized in `js/audio.js` is the baseline and the always-working
  fallback. **Recorded audio samples are now allowed** (deviation from the
  original no-assets rule, session 5, at the user's request): they live in
  `assets/audio/`, are listed in `AUDIO_SAMPLES` in `js/audio.js`, and load via
  `fetch` + `decodeAudioData`. That means **the game must be served over http**
  (`python3 -m http.server`) for recorded audio to play; on `file://` fetch is
  blocked and each sample silently falls back to its synth version. Any missing
  sample also falls back, so the game never hard-depends on an asset.
- Load order in `index.html` matters: util → audio → player → entities →
  render → levels1 → levels2 → game.
- `dev/DESIGN.md` is the design bible (mechanics rules, all 8 chapter designs,
  physics capabilities for level design). Follow it; if you must deviate,
  record the deviation in DESIGN.md itself.
- `dev/ARCHITECTURE.md` documents every existing API and data format. Keep it
  current when you add or change interfaces.
- Tone: no tutorials-as-text beyond faint minimal hints, no UI chrome, no
  score. Atmosphere over everything. When in doubt, ask "would INSIDE do this?"
