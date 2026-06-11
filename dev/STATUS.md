# HOLLOW — status

_Last updated: 2026-06-11 (session 2)._

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
