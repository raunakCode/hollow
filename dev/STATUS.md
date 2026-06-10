# HOLLOW — status

_Last updated: 2026-06-10 (session 1)._

## Where things stand

Engine scaffold written, **nothing run in a browser yet** (zero testing).
Game is not yet launchable: `js/levels1.js`, `js/levels2.js`, `js/game.js`
do not exist, so index.html will 404 those scripts and do nothing. T1 makes
it runnable.

Written this session:
- `index.html` — canvas shell, script load order.
- `js/util.js` — constants, math, mulberry32 RNG, Input, canvas fitting.
- `js/audio.js` — full procedural audio (ambient bed + ~16 one-shots + heartbeat).
- `js/player.js` — physics core + humanoid controller (run/jump/swim/crouch/mantle).
- `js/entities.js` — spawning + update systems for all entity types.
- `js/render.js` — backgrounds, tiles/water/grass, humanoid drawing, post fx.
- `CLAUDE.md`, `dev/DESIGN.md`, `dev/ARCHITECTURE.md`, `dev/TASKS.md`, this file.

## Things to watch when bring-up starts (suspected first-run bugs)

- **Mantle tuning**: the ledge-detection window in `updateHumanoid` is a
  guess; expect to tweak the chestTy / ledgeTopY bounds until 3-tile climbs
  feel reliable but 4-tile climbs are impossible.
- **Lift rider carry**: riders are moved directly by `h.y ±= dOff`
  (`updateLifts`); verify no tunneling/jitter when riding, and that a
  platform rising under an entity doesn't trap it in the floor.
- **Push lag**: pushing relies on player `hitX` returning the box ref then
  game.js giving the box velocity — one frame of lag by design; check it
  doesn't stutter at 60 fps.
- **Water jump-out** condition (surface detection in `updateHumanoid`) is
  untested; also box buoyancy constants (`-2400` accel, damp 4.5) are guesses.
- **Searchlight occlusion raycast** samples every 14 px — fine for tiles,
  but verify a 30 px box reliably blocks the beam.
- **Creature charge** uses `c.targetX` set in `startCharge` (closure at
  bottom of `updateCreatures`); confirm the overshoot/return logic doesn't
  oscillate.
- AudioSys.init **must** be called from a key handler (autoplay policy).

## Decisions made (don't relitigate without reason)

- Vanilla JS, file://-safe, no modules, no assets — everything procedural.
- 8 chapters per DESIGN.md; echo/time-recording mechanic was considered and
  **cut** (husk-mirroring covers the cerebral niche with less engine risk).
- Death resets whole chapter state; checkpoints only after latched progress.
- Husks are invisible to searchlights (core puzzle asymmetry).
- Weights are uniform: player = husk = box = 1 (lift puzzles count bodies).

## Open questions for the user

- None blocking. Optional: ok to `git init` the folder next session?
