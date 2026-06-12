# HOLLOW — status

_Last updated: 2026-06-12 (session 5)._

## Session 5 — "stuck in ground" (real cause found) + water-audio question

User reported "stuck in the ground is back" with a zoomed screenshot
(player between the two door-pillars at col ~80-107, legs reading as
sunk below the floor line). Reproduced it exactly in-browser.

- **Pixel-verified there is ZERO collision penetration** — sampled the
  canvas luminance straight down the player's centre column: the bright
  catch-light peak sits exactly at the feet (`p.y+p.h`), nothing below.
  This is a *readability illusion*, not physics. Probes/fuzz already
  said collision was clean; session 4 was right about that and wrong
  about the cause of the look.
- **The session-4 catch-light fix was itself the culprit.** It drew a
  14px gradient that *lightened the ground going downward* from the
  surface line — so the brightest band was directly under the feet,
  fading down. The eye reads that lit pocket as space the legs are sunk
  into. Replaced (`render.js tiles()`) with a crisp highlight lip
  (1.5px, brighter) + a short AO groove that *darkens* the ground just
  beneath it, so the top reads as a hard edge the figure stands ON.
- **Bumped the figure rim** (`render.js humanoid()`) 0.20→0.32 alpha so
  the whole silhouette — especially the lower legs at the contact point
  — reads as a solid object terminating on the floor, not merging into
  the dark ground.
- **Verified** in-browser at the reported spot + start + water-edge +
  plate: figure now clearly stands on the floor everywhere. `node
  dev/headless.js` ALL PASS, `node dev/fuzz.js` 8 seeds clean.

**Recorded water audio — rule changed + pipeline built.** User asked for
recorded water "like most games" and chose **external files + local
server** (the real rule change; `file://` blocks `fetch`). Implemented:
- `AUDIO_SAMPLES` manifest + `_loadSamples` (fetch+decode) in `audio.js`;
  `_playSample`, `_ensureWaterBed`, `setWaterLevel` helpers. `splash()`
  uses the recorded clip if present, else `_synthSplash()` (old synth).
- game.js `updatePlay` fades an ambient water bed by `waterProximity`.
- `assets/audio/` + README manifest: drop in `water_splash.wav` and a
  seamless `water_loop.wav`. **Missing/404/file:// all fall back to synth**
  (verified over http: boots clean, 404→synth, no JS errors). CLAUDE.md
  hard rule + header updated to record the deviation; ARCHITECTURE.md too.
- User dropped in `water_splash.mp3` + `water_loop.mp3` (mp3 decodes fine);
  verified over http they load/decode and the bed fades by proximity.
- **Two post-listen tweaks:** (1) splash retriggered on every surface bob —
  `inWater` is center-in-tile so a swimmer flickers it on/off. Replaced the
  inline trigger with `maybeSplash(ent, wasInWater, dt)` (game.js) which
  gates on `dryTime > 0.4` (must be clear of water for a beat first). Now
  sustained surface swim / idle float = 0 splashes, real plunge = 1
  (browser-verified). (2) splash too loud → playback gain 0.85–1.10 → 0.42–0.54.
- **Still open:** the user's splash clip is 4.5s (long for a one-shot) — may
  want trimming to ~0.5–1s if overlaps sound muddy. Recorded ambient is
  water-only; rain/wind/etc. still synth.

## Session 4 — playtest round 3 (ground readability + audio)

User reported (with a zoomed screenshot) still looking "stuck in the
ground," plus the ambient still sounding like radio static and water
still sounding like knocking on wood. Investigated and fixed:

- **"Stuck in the ground" was a readability problem, not collision.**
  Probed the player at many spots (`dev/probe-sink.js`, since removed) —
  feet-vs-ground penetration is **0px everywhere**; fuzz still clean.
  The cause: the ground fill is near-black (`#06080c`) with only a faint
  3px top edge, so the figure's dark legs merged into it and the surface
  plane was ambiguous (a background beam at hip height could read as the
  floor). Fix in `render.js tiles()`: exposed solid-tile tops now draw a
  crisp 1.5px catch-light line + a 14px gradient falloff into the ground,
  so the floor reads unmistakably and the player clearly stands *on* it.
- **Water "wooden crate" sound.** Two causes: (1) `splash()` used low
  tonal sine "bloops" (220–420 Hz) that ring like a wood block/marimba,
  and (2) `land()`'s 320 Hz thud could fire on the pool floor. Rebuilt
  `splash()` — bright airy highpass spray (3800→900) + lowpassed ploosh
  body + **noise-based** rising bubble plips (new `_plip`, no tonal
  pitch). Suppressed `land()` when `p.inWater` (`player.js`). Lowered the
  splash entry threshold (`vy>40`→`vy>12` in `game.js`) so walking in
  still splashes instead of landing silently then thudding.
- **Ambient "radio static."** The rain layer was bright broadband
  highpass noise (2500 Hz) — a flat carrier = static. Reworked
  `_buildAmbient`: rain is now a darker bandpass wash (~1100 Hz, Q0.6)
  with a slow tremolo so it surges/ebbs; wind dropped to a low hollow
  moan (260 Hz, Q2.2) with its own slow amplitude swell. Radios don't
  breathe; wind/rain does.

**Verification:** `node dev/headless.js` → ALL PASS; `node dev/fuzz.js`
→ 8 seeds clean; browser probe (brightened crops at the reported spot)
shows a clear floor line under the feet, zero console errors. Audio
graph builds clean but **nobody has heard the new splash/ambient yet** —
needs the user's ears.

## Session 3 — T3 systems + most of T4 rendering, all green

## Session 3 — T3 systems + most of T4 rendering, all green

Session 2 (fable) built the entire T3 interactive layer **and** pulled
most of T4's entity rendering forward, but ran out of tokens mid-debug
with the headless suite red, so none of it was documented or committed.
Session 3 (this one) got the suite fully green and verified it.

**Built across sessions 2–3 (uncommitted until now):**
- **T3 wiring** in `game.js`: levers→doors, plates→doors/latched,
  searchlight sweep + detection→death, helm connect/disconnect routing
  input to husks (camera on husk centroid), counterweight lifts,
  creature (the Listener) charge + death, checkpoints, death→checkpoint
  reset of chapter state, save to localStorage + continue-from-title.
- **T4 rendering (pulled forward)** in `render.js`: lever, light cone
  (brightens on detection), helm (cable + glow), lift (ropes + slabs),
  creature (body + eye that opens/closes), checkpoint lamp, exit glow,
  plus a faint **player rim-light** so the figure separates from
  same-value backgrounds (round-2 feedback #2).
- **Audio (round-2 feedback #1, #3)**: real water `splash()` (down-
  sweeping bandpass burst + lowpassed bubbly tail + blips) replacing the
  thud; ambient wind bandpass Q raised so the bed reads as gusts not
  broadband hiss; test-map mood wind/rain already lowered (0.016/0.006).

**Session 3 fixes that turned the suite green (12 fails → 0):**
- **Counterweight lift was unscriptable, not buggy.** The lift mechanic
  itself was correct (platform B fully rises, husk-carry + weight sums
  verified). The blocker was boarding a 2-tile-wide platform risen 2
  tiles — brutal for a blind script (and fiddly by hand). Widened pit B
  to 3 tiles (freed col 130, ledge now starts at 131) and gave the lift
  **independent A/B platform widths** (`aw`/`bw`, was a single `w`) so
  platform B is a 96px landing while A stays 64px over the narrow pit.
  Note: you can't *mantle* onto a lift platform — mantle only triggers
  on tile walls (`player.js` line ~241) — so boarding B is a real jump;
  mantling from B up to the tile ledge (col 131) is reliable.
- **The Listener charge test never ran before** (suite always died at
  the lift). It charges only in `alert` state when the player is
  near+noisy; the old test sprinted the player *past* it to the exit
  before its eye-cycle reached alert, so it never fired and the chapter
  just completed. Test now keeps the player jittering in range until the
  charge lands. **Watch for T12:** a fast runner *can* currently sprint
  the whole Listener corridor within one eye-shut window (the creature
  body isn't lethal on contact, only its charge is) — the real chapter
  needs corridor geometry long enough that no single window clears it.
- **Floating box bobbed forever.** Buoyancy was a constant up-accel that
  overshot and limit-cycled (vy swinging to ±85). Replaced with a damped
  spring toward the surface using a new `waterSurfaceY(level, x)` helper
  (`player.js`); the box now settles riding ~8px proud and is calm to
  stand on.

**Verification:** `node dev/headless.js` → 65/65 ALL PASS (deterministic
across runs); `node dev/fuzz.js` → 8 seeds clean (no stuck/embed);
`node dev/browser-test.js` → boots from file://, audio running, 122 fps
uncapped, zero console errors; lift area screenshotted and reads cleanly.

**Still needs the user (T3/T4 hand sign-off):** play the test map and
confirm each mechanic *feels* right and reads on a real display — lever,
searchlight tension, helm/husk control, the lift puzzle, the Listener
freeze-when-eye-opens, and the audio balance (splash/ambient especially,
nobody has *heard* the new splash). Machine-verified ≠ feel-verified.

## Where things stand

**T1 done and verified. T2 mechanics done and verified; T2 stays
unchecked pending a human feel/audio pass** (see "Needs the user").
The game boots from `file://`, title → play flow works, and the TEST
GROUNDS map exercises run / jump / mantle / one-way platforms / a
4-tile gap / swim / floating-box riding / grab-pull / push / plate →
door / box-assisted 4-tile climb / crouch / R-respawn with zero console
errors (30 harness assertions + browser smoke test, all green).

### T2 engine changes (session 2, after T1)

- **Push & grab/pull implemented** in `game.js updateBoxInteraction`
  (push 70 px/s on contact + direction; grab with X/E follows player
  vx clamped ±90; player run speed capped at 90 while grabbing). No
  jitter measured over a full plate push.
- **Mantle climb cap** (`player.js`): raw jump apex could reach a
  4-tile ledge, violating the DESIGN rule that 4-tile walls need a box.
  Now `p.jumpFromY` records the last footing height and mantle rejects
  climbs > 102px (3.2 tiles). Verified: 3-tile mantles, pit escape, and
  box-assisted 4-tile climbs all work; bare 4-tile attempts all fail.
- **Rider-eject fix** (`player.js moveEntity`): the X pass now skips
  solids whose top is within 4px of the entity's feet. Before this, a
  floating box bobbing up under you clipped into your body and the X
  resolver threw you off sideways (found by the harness, reproducibly).
- Test map widened to 72 cols with a T2 gauntlet on the right: box in
  pool (floats, rideable), box A (50) → plate (52-53) → door (55) →
  box B (57) → 4-tile wall/plateau (60-69).

Written this session:
- `js/game.js` — Game state machine, fades, camera, chapter loading,
  player + entity-system wiring, main loop (see ARCHITECTURE.md §game.js).
- `js/levels1.js` — temporary TEST GROUNDS map (60×24): grass, 3-tile
  mantle wall + one-way platform above it, 4-tile gap (escapable pit),
  3-deep water pool, second one-way platform. Replaced by Ch.1 in T6.
- `js/levels2.js` — stub for chapters 5–8.
- `dev/headless.js` — node smoke test: loads the real scripts with
  stubbed DOM/audio and walks the whole test map with scripted input
  (17 assertions). Run `node dev/headless.js` after engine changes.
- `dev/browser-test.js` — headless-Chromium test of index.html with
  trusted keyboard input (audio context comes up `running`), takes
  screenshots to /tmp. Needs playwright-core in /tmp/hollow-pw (setup
  one-liner in the file header).

## Verified (suspected first-run bugs that turned out fine)

- Mantle: 3-tile climbs work reliably from both scripted and "blind"
  input; pit escape via mantle works. 4-tile walls remain impossible
  (jump apex ≈ 3.4 tiles).
- Water: enter/sink/swim-up/jump-out-onto-bank all work. The jump-out
  window is narrow-ish (~12 px band near the surface) but passable with
  jump tapping — judge the *feel* by hand in T2.
- One-way platforms catch falling entities and carry correctly; no
  drop-through input exists (by design so far).
- Camera clamps correctly at level edges; look-ahead is damped.

### User playtest feedback round 1 (2026-06-11) — addressed

- "Legs spasm very fast": run stride was 11.8 cycles/s (runPhase factor
  0.055). Now 0.009 ≈ 1.9 strides/s, push state animates too, and
  footstep SFX fire on actual foot-plants (half stride) instead of a
  separate timer.
- "I'm pushing a box I can't see": box/door/plate silhouette rendering
  pulled forward from T4 (Render.box/door/plate). Rule going forward:
  **never ship an invisible collider**, even in test maps.

### "Sometimes stuck in the ground" report (2026-06-11) — investigated

User reported intermittently getting stuck, couldn't reproduce after the
round-1 fixes. Investigation: built `dev/fuzz.js` (random-input fuzzer,
8 seeds × 25k frames ≈ 56 min of play) checking every frame for player-
in-tiles, player-deep-in-box, and box-in-tiles — **zero failures**.
Most likely explanation: before round 1, the closed door and boxes were
invisible colliders — running against them looks exactly like being
stuck. Fixed proactively while auditing: mantle target now checks
solids (boxes/doors/lift platforms), not just tiles, so mantling onto
an occupied ledge is blocked instead of embedding the player in a box
(unreachable in this map, real risk in chapter maps). If the user
reports it again now that everything renders, get the exact spot —
known remaining soft spots: box gliding into a player pinned against a
wall can cause a sideways snap-out jolt (boxes don't collide with the
player by design).

### User playtest feedback round 2 (2026-06-11) — addressed (needs ear/eye sign-off)

All three were implemented in session 2 (splash synth, ambient Q, mood
wind/rain, player rim-light + lighter tree layers). They still need the
user to confirm by ear/eye — especially the new splash, which no one has
heard yet. Original notes:

1. **Ambient white-noise bed too loud.** The wind/rain noise layers in
   `audio.js _buildAmbient` / the test map's mood (`wind 0.05, rain
   0.04`) read as loud hiss. Lower the noise gains (mood values and/or
   the filter curves) so the bed sits well under everything; user
   should barely notice it until it's gone.
2. **Player silhouette gets lost against background trees.** Player
   color `#0b0d11` is nearly identical to the nearest parallax layer
   (`rgba(5,8,12,1)`) and tiles. Separate them: lighten/desaturate the
   near bg layers slightly, and/or give the player a faint rim-light or
   marginally lighter fill so the figure always reads. Verify with
   zoomed screenshots against the tree layer specifically (player at
   x≈300-600 in the test map).
3. **Splash sounds like a thud, not water.** `AudioSys.splash()` is
   `_thud(0.5, 0.35, 1400)` — a filtered noise burst that reads as a
   hit. Build a real splash: e.g. noise through a bandpass/highpass
   sweeping downward with a softer attack and a longer bubbly decay
   (try layering a short bright burst + lowpassed tail, or modulate
   filter freq 2000→400 over ~0.6s). Judge by ear via the user.

These are quality fixes (T2 feel/audio sign-off territory), so T2 stays
open until the user confirms all three plus general audio balance.

## Needs the user (T2 sign-off)

Mechanics are machine-verified; these acceptance criteria need a human
with the game open (`open index.html` or `python3 -m http.server`):

1. **Feel**: do run/jump/mantle feel weighty and INSIDE-slow? Constants
   left as scaffolded (run 215, jump -640, g 1900) — tune to taste.
2. **Audio**: footsteps / land / splash / boxDrag / door groan audible
   and balanced? (Events fire and the AudioContext runs; nobody has
   *heard* it.)
3. **60 fps vsync smoothness** on a real display (headless ran uncapped
   ~122 fps with correct dt-scaled physics).

## Things to watch / not yet tested

- Lift rider carry, searchlight occlusion vs a 30 px box, creature
  charge oscillation: still untested (no such entities in the map yet —
  T3/T6+ territory).
- Grab currently also works while standing on the grabbed box's floor
  level only; grabbing from atop another box is untested.
- Door render is top-anchored (slab shrinks upward as it opens) — fine
  physically, may look odd until T4 draws it properly.
- Headless gotcha: Chrome/Brave `--headless --screenshot
  --virtual-time-budget` does NOT drive requestAnimationFrame — it
  renders exactly one frame. Burned ~30 min on this; use
  dev/browser-test.js (playwright) instead.

## Decisions made (don't relitigate without reason)

- Vanilla JS, file://-safe, no modules, no assets — everything procedural.
- 8 chapters per DESIGN.md; echo/time-recording mechanic was considered and
  **cut** (husk-mirroring covers the cerebral niche with less engine risk).
- Death resets whole chapter state; checkpoints only after latched progress.
- Husks are invisible to searchlights (core puzzle asymmetry).
- Weights are uniform: player = husk = box = 1 (lift puzzles count bodies).
- Dev tooling lives in `dev/` and is never referenced by index.html; its
  npm dependency (playwright-core) lives outside the repo in /tmp.
- Title can't be skipped until the boot fade has half-cleared
  (`Game.fade < 0.5`) — prevents a held key from blowing past it.

## Open questions for the user

- None blocking. (Always ask before committing or pushing.)
