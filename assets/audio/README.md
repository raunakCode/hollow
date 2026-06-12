# HOLLOW — recorded audio assets

These are real audio files loaded at runtime by `js/audio.js` (the manifest is
`AUDIO_SAMPLES` at the top of that file). **Because they're fetched +
decoded, the game must be served over http** (`python3 -m http.server`) — a
bare `file://` double-click blocks `fetch`, and the audio silently falls back
to the procedural synth.

Any file listed below that is **missing or fails to load falls back to the
synthesized version**, so the game always runs even with this folder empty.

## Expected files

| File                | Used by            | What it should be                                              |
|---------------------|--------------------|---------------------------------------------------------------|
| `water_splash.mp3`  | `AudioSys.splash()`| Short (~0.4–0.8s) one-shot of a body breaking the water surface. Played with a small random pitch/gain wobble per hit, so a single clean take is fine. |
| `water_loop.mp3`    | water ambient bed  | **Seamlessly looping** water ambience (lapping/flowing pool), a few seconds long. Faded in by proximity to water, full volume when submerged. Must loop without a click — trim on zero-crossings. |

The filename in `AUDIO_SAMPLES` must match the file you drop in. To use a
different format, just change the extension there — see below.

## Notes / constraints

- Format is decided by file contents, not extension — **mp3 / ogg / wav all
  decode** via WebAudio. mp3 is fine for the one-shot splash. For `water_loop`,
  mp3 encoder padding can add a tiny click at the loop seam; if you hear one,
  re-export as **ogg or wav** (and update the extension in `AUDIO_SAMPLES`).
- Keep them small and mono — the game isn't positional-stereo.
- Licensing: only drop in clips you have the right to ship (CC0 / freesound CC0
  is ideal). Don't commit anything with attribution strings you can't honor.
- To add more recorded sounds later (rain, wind, footsteps…), add an entry to
  `AUDIO_SAMPLES` and either call `_playSample('name', gain, rate)` for a
  one-shot or follow the `waterLoop`/`_ensureWaterBed` pattern for a loop.
