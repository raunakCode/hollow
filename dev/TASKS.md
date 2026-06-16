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

- [x] **T2. Feel pass + box interaction.** Tune jump/run/mantle until they
  feel weighty (INSIDE-slow, deliberate). Implement push (player hitX → box
  ref) and grab/pull (hold X/E), box-on-plate stacking, floating box you can
  stand on. Add a box + plate + door to the test map.
  ✓ Push and pull both work without jitter, you can climb a pushed box up a
  4-tile wall, box floats and carries you, footsteps/land/splash all audible.

## Milestone 2 — all systems live

- [x] **T3. Interactive systems wiring.** In game.js: levers (act near →
  toggle), doors/plates/lifts updates in correct order, helm
  connect/disconnect with input routed to all husks + camera on husk
  centroid, light detection → death, creature → death, hidden = crouch in
  grass, death fade + chapter-state reset to checkpoint, checkpoint save to
  localStorage + continue from title. Extend test map to cover each.
  ✓ Each mechanic demonstrably works in the test map; dying resets boxes but
  respawns you at the checkpoint; reload resumes from save.

- [x] **T4. Entity rendering + dark mode.** Render methods for: boxes
  (silhouette crates), doors (sliding slabs + groan), levers, plates (sink
  visually), light cones (soft gradient, brighten on detection) + fixtures,
  helms (hanging cable + faint glow), lifts (platforms + rope lines),
  creature (hulking shape, glowing eye that opens/closes), checkpoints
  (faint lamp), exits (doorway of light), hint text (faded serif, fades in
  by proximity). Darkness mask wired (player glow, creature eyes, helms).
  ✓ Test map readable at a glance; dark room playable by player glow alone.

- [x] **T5. Engine extras.** `light.offWhen` signal-disable; breath timer
  (~9 s, screen darkens, drown death); scripted chase trigger zone; heartbeat
  danger wiring (`AudioSys.update`); pause menu (Esc: resume/restart/mute);
  title screen with HOLLOW wordmark + "press any key" + continue-from-save.
  ✓ All verified in test map / title flow. (Done session 7; dev/t5.js +
  dev/t5-visual.js cover them. Also fixed spawn non-determinism — see STATUS.)

## Milestone 3 — the game (one chapter ≈ one task)

Each chapter task: build the map + entities per `dev/DESIGN.md`, hand-verify
every puzzle is solvable *and* not bypassable, place checkpoints per the
death-reset rule, set palette/mood/bg, playtest start-to-finish twice.

- [x] **T6. Ch. 1 — THE FOREST** (tutorial; replaces test map). Built + verified
  session 8. Teaches jump (step stones) → mantle (3-tile rock) → crouch-under
  (fallen log) → box-push + 4-tile cliff climb → checkpoint → quiet walk →
  crouch under the fence → exit. Added crouch collision-shrink (the engine had
  none) so squeeze-under-gaps works. Test map moved to dev/testmap.js; new
  dev/ch1.js walks the whole chapter. See STATUS.
- [x] **T7. Ch. 2 — THE FENCE** (searchlights). Built + machine-verified
  session 9 (awaiting user feel sign-off). Three sweeping lights in the rain:
  yard dash/crouch-in-grass → checkpoint → time the mantle past Light 2 →
  Light 3 box-as-rolling-shield to pull the gate lever from a standing shadow →
  checkpoint → exit into the facility. Light cones now raycast occluders so the
  box casts a real, visible shadow (render fix). New dev/ch2.js walks it. See
  STATUS.
- [x] **T8. Ch. 3 — THE YARD** (boxes/plates/lift intro). Built + machine-verified
  session 10 (awaiting user feel sign-off). Interior, no hazards. Room A: two-plate
  `all` latched gate solved with the box as the second weight. Room B: counterweight
  lift — box sinks platform A to raise+hold B, hop up + mantle a 4-tile plateau
  (box can't reach the face, so the lift is required). Room C: lift again to a ledge
  plate that latches the exit gate, then a stairwell down. New `dev/ch3.js` walks it
  all (plus bypass/no-cheese guards). Geometry fixes: a 1-tile air gap beside each
  raised platform makes it mountable; the harness climb now holds jump for full
  height (variable-jump gotcha). See STATUS.
  **Reworked session 12** (Rooms B/C were the same puzzle): added the lift BRAKE
  (`lift.lock`) and rebuilt the lift half as two distinct puzzles — Room B = the
  basic counterweight lift, Room C = THE CRANE (crate cranks B up, a ceiling
  girder makes the clamp un-mountable, brake B at a mid height to climb it).
  Found the brake can't be made necessary by a player's own body (empty-holds +
  pogo) — it needs a crate. Map is now 95×24. See dev/CH3_REWORK.md + STATUS.
- [x] **T9. Ch. 4 — THE DRAINS** (water/breath). Built + machine-verified
  session 13 (awaiting user feel sign-off). First water chapter; teaches swim,
  jump-out, and the breath timer/porthole/drown (breath engine was T5). Four
  rooms (150×24, seed 104): A open pool (swim + jump-out, no drowning); B flooded
  corridor under a roof with four air-pocket chimneys — the exit grate is shut so
  you detour to a sunken latch lever (pulled underwater), a breath-managed plan;
  C float the box as a raft to reach a high pipe (unreachable from water); D a
  cistern with a sunken lever under a guard-grate lid that latches the exit gate.
  New `dev/ch4.js` walks it all (+ no-bypass/breath-budget guards). Softened B's
  fork and D's side-tunnel vs the DESIGN sketch (deviations recorded in DESIGN).
  Updated `dev/ch3.js` exit assertion (Ch.3 → Ch.4 now). See STATUS.
- [x] **T10. Ch. 5 — THE HUSKS** (helm intro, desync puzzles). Built + machine-
  verified session 14 (awaiting user feel sign-off). First helm chapter; teaches
  connect/disconnect + desync. Player walks a one-way walkway over sealed husk
  pits (seen through '-' windows, unreachable); a husk pressing a plate below
  opens the player's gate above. A: drive the lone husk onto its plate. B: two
  husks / two plates (`all`) — desync by jumping the lead husk onto a 2-tile step
  while the trailing one stays on the floor. C: three husks, a 3-tile gap — only
  the lead husk has runway to clear it on a timed jump; the others fall in safely.
  Added a small engine feature so a helm controls only its husk **group** (else a
  later room's helm would move + re-frame finished rooms' husks); default null =
  all (backward compatible). New `dev/ch5.js` walks it all (+ group isolation,
  no-bypass, naive-fail guards). Updated `dev/ch4.js` exit assertion (Ch.4 → Ch.5
  now). See STATUS.
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
- 2026-06-12 — T5 done: light.offWhen, breath/drown + porthole, scripted chase trigger, pause menu, title continue/new-game, M-mute. Fixed spawnEntities non-determinism (seeded RNG + per-creature rng). New dev/t5.js + dev/t5-visual.js. headless ALL PASS, t5 ALL PASS, fuzz CLEAN, browser clean over http.
- 2026-06-12 — T2/T3/T4 signed off by user (test-map feel/audio pass). T6 done: Ch.1 THE FOREST built. Added crouch collision-shrink (CROUCH_H, feet-anchored + ceiling check) + hint caption rendering (was the last T4 TODO). Moved TEST GROUNDS to dev/testmap.js (harnesses load it before game.js; real LEVELS[0] is now Ch.1). New dev/ch1.js (16 checks, ALL PASS). headless/t5 ALL PASS, fuzz CLEAN, browser smoke PASS (whitelisted the expected file:// audio fallbacks).
- 2026-06-13 — T7 done: Ch.2 THE FENCE (searchlights) built; light cones now raycast occluders so a pushed box casts a real shadow; Light 3 rebuilt as a cheese-proof two-stage gate-house (9b). T8 done: Ch.3 THE YARD (boxes/plates/lift intro) built — 3 rooms (two-plate gate, counterweight lift to a plateau, lift+plate exit gate). New dev/ch3.js walks it (+ bypass/no-cheese guards). Geometry: 1-tile air gap makes raised platforms mountable; harness climb holds jump for full height (variable-jump gotcha). Updated dev/ch2.js exit assertion (Ch.2 → Ch.3 now). headless/t5/ch1/ch2/ch3 ALL PASS, fuzz CLEAN, browser render of all 3 rooms clean.
- 2026-06-14 — session 11: planned the Ch.3 lift-half rework (dev/CH3_REWORK.md) + implemented the lift BRAKE engine feature (lift.lock freezes a lift). session 12: shipped the rework — Room B = basic counterweight lift, Room C = THE CRANE (crate cranks B up, ceiling girder makes the clamp un-mountable, brake at a mid height). Found the brake can't be made necessary by a player's body (empty-holds + pogo) → needs a crate; deviated from the plan's body-driven Room B accordingly. Map rebuilt 95×24 via a column generator; dev/ch3.js rewritten. headless/t5/ch1/ch2/ch3 ALL PASS, fuzz CLEAN, Ch.3 browser render clean (0 errors).
- 2026-06-15 — session 13: T9 done — Ch.4 THE DRAINS (water/breath) built. 4 rooms (150×24, seed 104): A open pool (swim+jump-out), B flooded corridor w/ four air-pocket chimneys + sunken latch lever that opens the exit grate (breath-managed detour), C box-as-raft to a high pipe, D cistern w/ sunken lever under a guard-grate lid latching the exit gate. New dev/ch4.js (24 checks) drives every beat incl. breath drain/refill, no-bypass and breath-budget guards; needed a position-aware swim controller (read rows[10][col] to breathe at chimneys). Softened B's fork + D's side-tunnel vs DESIGN (deviations recorded). Updated dev/ch3.js exit assertion (Ch.3 → Ch.4). headless/t5/ch1/ch2/ch3/ch4 ALL PASS, fuzz CLEAN (8 seeds), Ch.4 browser render clean (0 errors). Awaiting user feel sign-off.
- 2026-06-16 — session 14: user signed off Ch.4 feel. T10 done — Ch.5 THE HUSKS (helm intro) built. 3 rooms (172×24, seed 105): player walks a one-way walkway over sealed husk pits ('-' viewing windows); a husk pressing a plate below opens the player's gate above. A: drive the lone husk onto its plate. B: two husks/two plates (`all`) — desync by jumping the lead husk onto a 2-tile step while the trailing one stays on the floor. C: three husks, a 3-tile gap — only the lead husk has runway to clear it on a timed jump; the others fall in safely (mantle the 3-tile wall back). Added a helm-group engine feature (a helm drives only its `group`; default null = all, backward compatible) so a later room's helm doesn't move/re-frame finished rooms' husks. New dev/ch5.js (group isolation + per-room solves + no-bypass + naive-fail guards). Tuned Room C's gap by measuring the jump window in-engine (raised ledge → too tight; flat far ledge → generous ~0.4 s + coyote). Updated dev/ch4.js exit assertion (Ch.4 → Ch.5). headless/t5/ch1–ch5 ALL PASS, fuzz CLEAN, Ch.5 browser render clean (0 errors, 122 fps). Awaiting user feel sign-off.
