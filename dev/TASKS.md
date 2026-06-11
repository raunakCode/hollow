# HOLLOW — task list

Work strictly in order. A task is done only when its acceptance criteria
have been verified in a real browser. Each task is sized to fit comfortably
in part of one session; doing several per session is expected and fine.

## Milestone 1 — it runs

- [x] **T1. Core loop & bring-up.** Write `js/game.js`: requestAnimationFrame
  loop (dt clamped ≤ 1/30), state machine (`title → play → dead → play`,
  chapter fade transitions), chapter loading (`LEVELS[i]` → level + world via
  `spawnEntities`), camera (smooth follow + facing look-ahead, clamped),
  player wiring (Input → ctl → `updateHumanoid`), R-to-respawn. Write a
  temporary `js/levels1.js` with one small test map (ground, a 3-tile wall,
  a 4-tile gap, water pool, grass, one-way platform) and a stub
  `js/levels2.js` (`/* chapters 5-8 */`). Render: sky → parallax → tiles →
  water → player → post fx. AudioSys.init on first keypress at title.
  ✓ Game opens from file://, character runs/jumps/mantles/swims/crouches,
  camera follows, no console errors, 60 fps.

- [ ] **T2. Feel pass + box interaction.** Tune jump/run/mantle until they
  feel weighty (INSIDE-slow, deliberate). Implement push (player hitX → box
  ref) and grab/pull (hold X/E), box-on-plate stacking, floating box you can
  stand on. Add a box + plate + door to the test map.
  ✓ Push and pull both work without jitter, you can climb a pushed box up a
  4-tile wall, box floats and carries you, footsteps/land/splash all audible.

## Milestone 2 — all systems live

- [ ] **T3. Interactive systems wiring.** In game.js: levers (act near →
  toggle), doors/plates/lifts updates in correct order, helm
  connect/disconnect with input routed to all husks + camera on husk
  centroid, light detection → death, creature → death, hidden = crouch in
  grass, death fade + chapter-state reset to checkpoint, checkpoint save to
  localStorage + continue from title. Extend test map to cover each.
  ✓ Each mechanic demonstrably works in the test map; dying resets boxes but
  respawns you at the checkpoint; reload resumes from save.

- [ ] **T4. Entity rendering + dark mode.** Render methods for: boxes
  (silhouette crates), doors (sliding slabs + groan), levers, plates (sink
  visually), light cones (soft gradient, brighten on detection) + fixtures,
  helms (hanging cable + faint glow), lifts (platforms + rope lines),
  creature (hulking shape, glowing eye that opens/closes), checkpoints
  (faint lamp), exits (doorway of light), hint text (faded serif, fades in
  by proximity). Darkness mask wired (player glow, creature eyes, helms).
  ✓ Test map readable at a glance; dark room playable by player glow alone.

- [ ] **T5. Engine extras.** `light.offWhen` signal-disable; breath timer
  (~9 s, screen darkens, drown death); scripted chase trigger zone; heartbeat
  danger wiring (`AudioSys.update`); pause menu (Esc: resume/restart/mute);
  title screen with HOLLOW wordmark + "press any key" + continue-from-save.
  ✓ All verified in test map / title flow.

## Milestone 3 — the game (one chapter ≈ one task)

Each chapter task: build the map + entities per `dev/DESIGN.md`, hand-verify
every puzzle is solvable *and* not bypassable, place checkpoints per the
death-reset rule, set palette/mood/bg, playtest start-to-finish twice.

- [ ] **T6. Ch. 1 — THE FOREST** (tutorial; replaces test map).
- [ ] **T7. Ch. 2 — THE FENCE** (searchlights).
- [ ] **T8. Ch. 3 — THE YARD** (boxes/plates/lift intro).
- [ ] **T9. Ch. 4 — THE DRAINS** (water/breath).
- [ ] **T10. Ch. 5 — THE HUSKS** (helm intro, desync puzzles).
- [ ] **T11. Ch. 6 — THE MACHINES** (husks × lights × lifts × timed plates).
- [ ] **T12. Ch. 7 — THE DEEP** (darkness + Listener + chase finale).
- [ ] **T13. Ch. 8 — THE CORE + ending** (gauntlet, unison-walk ending
  cinematic, white fade, credits, return to title).

## Milestone 4 — ship it

- [ ] **T14. Full-game polish pass.** Play start → finish. Fix difficulty
  spikes, dead-feeling stretches, softlocks, audio imbalance; chapter title
  cards on transition; tune chapter moods; final checkpoint audit (death
  near every checkpoint, confirm nothing strands).
  ✓ A complete, fair, atmospheric ~2 h run with zero console errors.

---
**Session log** (append one line per session: date — tasks touched — result)
- 2026-06-10 — engine scaffold (util/audio/player/entities/render) + docs — untested.
- 2026-06-11 — T1 done: game.js + test map + node/browser smoke tests (dev/headless.js, dev/browser-test.js) — all green, 0 console errors.
- 2026-06-11 — T2 mechanics: push/grab-pull, mantle climb cap (4-tile walls now box-only), rider-eject fix, T2 gauntlet in test map — 30 assertions green; T2 left unchecked pending human feel/audio pass (see STATUS).
- 2026-06-11 — T3 systems (levers/doors/lights/helm-husks/lifts/Listener/save) + most of T4 entity rendering + round-2 audio/visual fixes (sessions 2–3). Session 3 fixed the lift geometry (independent aw/bw widths, widened pit B), the Listener charge test, and box buoyancy (spring-to-surface) — headless 65/65, fuzz 8-seed clean, browser clean. T3/T4 left unchecked pending human feel/audio sign-off (see STATUS).
