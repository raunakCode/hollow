# HOLLOW — status

_Last updated: 2026-06-12 (session 8)._

## Session 8 — T2/T3/T4 signed off; T6 (Ch.1 THE FOREST) built

User confirmed the test-map feel/audio pass ("tested, works fine"), so the
long-standing human sign-off on **T2, T3, T4** is in — all three checked off.
Then built **Chapter 1**.

- **Crouch now shrinks the collision box (new engine feature).** The collider
  was a fixed 42px tall — crouch only changed speed, so "squeeze under a gap"
  (a core Ch.1 beat) was impossible. Added `STAND_H=42`/`CROUCH_H=25` and a
  feet-anchored resize in `updateHumanoid` (`player.js`): while you hold ↓ on
  the ground the box shrinks to 25px (fits a 1-tile/32px gap); you also **can't
  stand up under a ceiling** (a headroom test vs tiles AND solids forces you to
  stay crouched until you clear the log/fence). Mantle/water paths are
  unaffected (they're airborne/in-water, where crouch is always false). Render
  was already feet+state-anchored, so the figure draws correctly with no change.
- **Hint captions render now** (the last open T4 item). `Render.hint` draws a
  faint serif key-glyph; `game.js` fades each hint's alpha in/out by player
  proximity to its radius. Used for ↑ / ↓ / X in Ch.1.
- **Pull-box bug fix (user-reported).** Pulling a box (grab + walk away) tore
  loose: the grab set `b.vx = clamp(p.vx, ±90)` but `updateBoxes` then damped it
  toward 0 with ground friction (rate 18) the same frame, so the box only
  traveled ~66 while the player walked 90 — `sep` grew past 14 and released.
  Added a per-frame `b.dragged` flag (set by the grab, cleared in `updateBoxes`)
  that skips the friction damp so a dragged box keeps the player's pace. Push is
  unaffected (it re-applies vx each frame on contact). New `dev/ch1.js` pull test
  (grab + sustained right pull, asserts no tear + the box travels).
- **Ch.1 — THE FOREST** in `js/levels1.js` (165×24, no lethal hazards, pure
  traversal teaching): start + grass → step-up stones (jump) → 3-tile rock wall
  (mantle) → fallen hollow log, 3 thick with a 1-tile gap (crouch-under) → box
  stuck in mud, push it to the 4-tile cliff and climb box+jump+mantle →
  checkpoint on the plateau → gentle descent → long quiet walk (facility glow
  on the horizon) → crouch under the fence → exit. One checkpoint only (the
  chapter is death-free, so it's purely the save/continue anchor) — dropped an
  earlier redundant second checkpoint that just bracketed the quiet walk.
- **TEST GROUNDS relocated to `dev/testmap.js`** (dev-only). The three
  harnesses (headless/fuzz/t5) load it *after* levels2 and *before* game.js so
  it replaces `LEVELS` with the all-mechanics sheet (they're coupled to its
  geometry); the real game's `LEVELS[0]` is now Ch.1. `dev/browser-test.js`
  drives the real game (Ch.1) and now whitelists the expected file:// audio
  fetch fallbacks instead of failing on them.
- **Verified:** `node dev/headless.js` ALL PASS, `node dev/t5.js` ALL PASS,
  `node dev/fuzz.js` FUZZ CLEAN, **`node dev/ch1.js` ALL PASS** (16 checks:
  stone-hop+rock-mantle run, crouch shrink/restore, crouch under the log,
  forced-crouch-no-headroom, box push, bare 4-tile cliff fails, box-assisted
  climb succeeds, crouch under the fence, exit → chapter ends), and
  `node dev/browser-test.js` BROWSER SMOKE PASS (Ch.1 boots clean from
  file://, 124fps, 0 unexpected console errors).
- **Still needs the user (Ch.1 hand sign-off):** play THE FOREST start to
  finish — does the teaching read without text (terrain telegraphs jump /
  mantle / crouch), is the box→cliff "stop and think" beat satisfying, does the
  log/fence crouch feel right and not fiddly, and does the quiet-walk pacing +
  rain/glow land? Machine-verified ≠ feel-verified.

## Session 7 — T5 engine extras (all implemented + verified)

Built every item in T5 and a focused harness for them; also fixed a real
non-determinism bug in the test suite along the way.

- **`light.offWhen`** (signal or list of signals): while any listed signal
  is active the cone powers down — no detection, dimmed in render
  (`render.js` lightCone alpha 0.012 when `disabled`). `updateLights`
  evaluates signals and sets `Lt.disabled`; detection decays while off.
- **Breath timer** (`game.js updatePlay`): `BREATH_MAX=9`, `BREATH_WARN=4`.
  Drains while head underwater (`headInWater`), refills 4×/s at the surface
  with a `gasp()` when crossing back above the warn line. Hitting 0 → drown
  death. View closes to a shrinking porthole (`drawPlay` darkness mask) as
  air runs low — no HUD bar. Breath danger also feeds the heartbeat.
- **Scripted chase trigger** (new `trigger` entity in `entities.js` +
  `updateTriggers`): an AABB zone with `action` (`'charge'`/`'wake'`),
  `target` (creature index), one-shot by default. Refactored the inner
  charge starter to module-scope `creatureStartCharge(c, px)` so triggers
  and the alert state share it. For ch. 7D's finale.
- **Pause menu** (Esc): freezes play, cursor over resume / restart
  (→`resetChapterState`) / mute. **M** is a global mute key in play.
  `Input` gained `menuUp/menuDown/menuConfirm/escPressed` (navigation kept
  disjoint from confirm so a single key can't both move and select).
- **Title menu**: continue / new game when a save exists, else "press any
  key". Gated until the boot fade half-clears.

- **Determinism fix (the surprise).** Adding a light shifted the "deterministic"
  fuzz suite and occasionally surfaced a latent box/door embed — because
  `spawnEntities` actually used **unseeded `Math.random()`** for light phase
  and creature timers, so the suite was never truly deterministic. Changed
  `spawnEntities(defs, seed)` to seed a `makeRng` from the chapter seed, gave
  each creature its own seeded `rng`, and routed all spawn/runtime randomness
  through it. After the fix: headless 65/65, fuzz clean **and** identical
  across repeated runs.
- **Latent embed, documented not chased.** The rare box/door embed (~col 55,
  player pinned against a wall as a box glides in) is **pre-existing** (the
  known soft spot noted in the round-1 "stuck" investigation below) and is
  out of T5 scope. Reproduced only via deliberate RNG perturbation; baseline
  is clean. Leaving it flagged here rather than claiming a fix.
- **Verified:** `node dev/headless.js` ALL PASS, `node dev/t5.js` ALL PASS
  (offWhen string+list, trigger charge+one-shot, breath drain/refill/drown/
  respawn, Esc pause freeze/cursor/mute, M-key mute, title continue/new),
  `node dev/fuzz.js` FUZZ CLEAN. Visuals checked in-browser over a local
  http server (`dev/t5-visual.js`): zero console errors (file:// only shows
  the expected recorded-audio fetch fallbacks).

## Session 6 — "under the ground near doors" (the ACTUAL cause, finally)

User reported it again with a screenshot: standing next to a door-pillar
(box-like shape to the right) the figure reads as sunk to the ankle.
Reproduced exactly next to door 0 (col 55, box B beside it) and door 1
(col 83) — the user's crop matches door 0 pixel-for-pixel.

- **Sessions 4–5 were right that collision is clean and wrong that it was
  purely an illusion.** Pixel-probed again: feet endpoint = `p.y+p.h` =
  ground top, zero penetration. BUT the legs are stroked with
  `lineCap='round'`, so the rounded *toe* extends half a line-width
  (~3.5px for the rim pass, lineWidth 4.5+2.6) **below** the foot
  endpoint — i.e. ~3.5px under the bright ground lip. That overshoot is
  the sink. It's universal, but only *reads* as sunk next to a tall dark
  door/box that gives the eye a vertical reference and a crisp floor lip.
- **Fix** (`render.js humanoid()`): clamp both drawn foot endpoints up by
  the rim cap radius (`footCap = (4.5+2.6)/2`) so the rounded toe rests ON
  the floor line instead of poking through it. Purely visual; physics
  untouched. Verified with brightened 3× zoom crops at door 0/1: feet now
  sit on the same contact line as the adjacent box.
- **Verified:** `node dev/headless.js` ALL PASS, `node dev/fuzz.js` 8
  seeds clean.

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
