# HOLLOW — status

_Last updated: 2026-06-15 (session 13)._

## Session 13 — T9 (Ch.4 THE DRAINS) built: the WATER / BREATH chapter

Built **Chapter 4 — THE DRAINS**, the first water chapter and the swimming /
jump-out / **breath-timer** teaching ground (the breath engine itself shipped in
T5; this is where it becomes a real chapter mechanic). Dim interior cistern,
150×24, seed 104, `bg:'interior'`. Four rooms, one idea each, walk-line row 12.
Authored the geometry with a throwaway column generator (`dev/_gen_ch4.js`,
deleted) and validated every beat by driving the real engine in the new
`dev/ch4.js` harness.

- **ROOM A — THE POOL.** Walk off the start deck into a deep OPEN pool (surface
  flush at row 12, always surfaceable → no drowning), swim across + down, and
  jump out onto the flush far bank. Pure swim + jump-out teach. | checkpoint 0.
- **ROOM B — THE FLOODED CORRIDOR (the breath puzzle).** A submerged tunnel
  under a 5-tile roof (rows 8–12): you swim it head-underwater (breath drains),
  surfacing at **four air-pocket chimneys** (vents to the surface). The exit
  GRATE (door gB, col 81) up to the Room-C ledge is shut, so you can't rush it —
  its **sunken latch lever** (gB) sits on the corridor floor far back (col 58,
  pulled *underwater* with X). The plan: don't dash the exit; detour to the
  sunken lever (a managed breath-leg off the chimney chain), pull it (the grate
  latches), route back to the now-open exit shaft and rise to the ledge. |
  checkpoint 1 (Room-C ledge, past the grate).
- **ROOM C — THE RAFT.** A high pipe ledge (row 9) is the only way on but is 3
  tiles above the pool surface — too high to jump out onto, and you can't mantle
  FROM water. Push the box into the narrow pool; it floats as a **raft**; climb
  it and mantle the pipe (the box's +1 tile is exactly the bridge). | checkpoint
  2 (the pipe ledge).
- **ROOM D — THE CISTERN.** Drop into a deep cistern; the exit gate (gD) is shut.
  Its sunken lever sits in a pocket capped by a **guard grate lid** — you can't
  drop straight onto it, you descend beside it and swim in along the floor. Pull
  it (the exit gate latches), surface, jump out onto the flush exit ledge, walk
  through the opened gate out of the drains (exit).
- **Two design deviations recorded in DESIGN.md** (the sketch wanted a literal
  two-branch fork in B and a distinct side tunnel in D): B's fork is softened to
  *short-blocked-vs-detour-to-the-sunken-lever* (same breath-planning idea, clean
  non-cheesable geometry); D's "side tunnel" is *swim-in-under-the-grate-lid* (a
  gentle finale). A real underwater two-way fork that's solvable on one breath
  AND non-bypassable is fiddly; the softened forms verify cleanly and keep the
  execution windows generous (the breath budget is the planning, not the timing).
- **Harness lesson (validate-by-driving again):** scripting a blind swim through
  a roof/chimney corridor needs a *position-aware* controller — pure hold-jump
  breaches into the open chimney air and bonks the next roof; pure glide sinks to
  the floor and the rise-to-air is too slow → drowns. The working driver reads
  `rows[10][col]` to know when the roof is open above (a chimney) and only then
  rises to breathe, otherwise gliding right just under the roof. (`dev/ch4.js`
  `spanCorridor` loop.) The breath budget itself is generous: chimneys ≤12 tiles
  apart (~3 s legs) on a 9 s lung; the deepest leg is the lever dive, which the
  harness drives chimney→lever→chimney without drowning.
- **`dev/ch3.js` exit assertion updated:** Ch.3 is no longer the last chapter, so
  its exit now advances to Ch.4 (asserts `chapterIdx===3`, was `state==='title'`).
  Ch.4's exit is the new last-chapter→title.
- **Verified:** `node dev/headless.js` ALL PASS, `node dev/fuzz.js` FUZZ CLEAN
  (8 seeds), `node dev/t5.js` ALL PASS, `node dev/ch1.js` / `ch2.js` / `ch3.js`
  ALL PASS, **`node dev/ch4.js` ALL PASS** (24 checks: level sanity; A full-
  breath-at-surface + swim-across-and-jump-out; B breath-drains-submerged,
  refills-at-chimney, grate-shut-blocks, X-lever-underwater-latches, lever-detour
  fits-budget, full corridor traverse-alive; C pipe-unreachable-bare, box-floats,
  raft+climb-reaches-pipe; D can't-drop-straight-onto-lever, lever-latches-gate,
  gate-blocks-until-pulled, exit→title). Browser render of all four rooms
  **clean (0 console errors)**; brightened zoom shows the pool, the roofed
  corridor + chimneys + checkpoint lamps, the box on the C ledge + pipe, the
  cistern grate lid, and the D exit ledge/gate reading correctly.
- **Still needs the user (Ch.4 feel sign-off):** play THE DRAINS. Does swimming
  feel good and is the jump-out window fair? Does the breath porthole teach
  "find air" without text, and are the air-pocket chimneys legible as breathing
  spots? Is Room B's "the grate's shut — go find the sunken lever, mind your
  breath" a real *plan* beat (and is the underwater lever findable — its only
  cue is the faint X hint)? Does the box-raft click? Is Room D a calm release
  after B/C? Machine-verified ≠ feel-verified.

## Session 12 — Ch.3 lift-half rework SHIPPED (Room C = THE CRANE / brake)

Finished the Ch.3 rework planned in session 11 (`dev/CH3_REWORK.md`). The goal
was to stop Rooms B and C from being the same puzzle. Outcome: **Room C is now
THE CRANE (the brake), genuinely different from Room B (the plain counterweight
lift).** Rebuilt both rooms' geometry + rewrote their `dev/ch3.js` tests; full
suite green; browser render clean.

- **Key finding that reshaped the plan (validate-by-harness paid off):** the
  plan's Room B — *body*-as-counterweight + brake — **can't make the brake
  necessary.** Two engine truths: (1) **"empty holds"** — a platform you raise
  with your own body stays put once you step off (0-v-0 balance), so no brake is
  needed to hold it; (2) **pogo-mantle** — to climb a raised platform you bounce
  off it (airborne ~95% of frames), so it never accumulates the sink that would
  make the brake matter (traced it: B sank 0.05 tiles before the player mantled
  away). The brake is only *robustly* necessary against a **persistent
  imbalance — a crate.** So I split it: **Room B = the basic counterweight lift**
  (a box raises + holds B; board the balanced platform), **Room C = THE CRANE**
  (crate + brake). Recorded in DESIGN.md + the lift mechanic note.
- **Room C — THE CRANE (the new puzzle).** Push the crate onto platform A; its
  weight cranks B up from the floor toward its top clamp (row 17). A **ceiling
  girder** (row 15 over the mount gap) caps your jump so B *at the clamp* is
  un-mountable — you must pull the **brake lever** (`brkC`) to freeze B at a
  mountable **mid** height (row 18) as it rises, then hop on and mantle the exit
  ledge. The clamp overshoots uselessly; only a braked mid height works. I
  **measured the mount limits in-engine first** (`dev/_probe_mount.js`, deleted):
  over a 1-tile air gap a platform is mountable up to **3 tiles up (row 17)** but
  not 4; a ceiling at **row 15** splits row-18 (mountable) from row-17 (not) —
  that split is what forces the brake. The crate-driven A sinks into a 3-deep
  pit (stays on the map); B starting at floor can only rise 3 tiles, so a
  *height*-unmountable overshoot was impossible — hence the girder.
- **Geometry** rebuilt with a fresh column generator (`dev/_gen_ch3.js`,
  deleted): the map is now **95×24** (was 130; tighter pacing). Room A unchanged.
  Entities: 3 boxes / 2 plates / 1 door / 2 lifts (only lift 1 has `lock:'brkC'`)
  / 1 lever / 2 checkpoints / 1 exit.
- **`dev/ch3.js` rewritten** for the new rooms: Room A (unchanged), Room B
  (box raises+holds B, board+mantle solve, bare ledge unclimbable, box-can't-
  cheese-the-ledge), Room C (crate cranks past the mid band to the clamp; clamp
  un-mountable; mid-brake mountable+solvable; the real X-lever brake holds under
  load and releases; full crane solve), exit→title. **`node dev/ch3.js` ALL PASS.**
- **Verified:** `node dev/headless.js` ALL PASS, `node dev/fuzz.js` FUZZ CLEAN,
  `node dev/t5.js` ALL PASS, `node dev/ch1.js` ALL PASS, `node dev/ch2.js` ALL
  PASS, `node dev/ch3.js` ALL PASS. Browser render of Rooms B & C **clean (0
  console errors)**; brightened zoom shows the lift platforms, crate, brake
  lever, the ceiling girder, and the stepped exit ledges reading correctly.
- **Still needs the user (Ch.3 feel sign-off):** play THE YARD. Does Room C's
  "watch B rise and brake it at the right height" read as a crane without text?
  Is the ceiling girder legible as *why* you can't ride it to the top? Is Room B
  → Room C a clear escalation (counterweight → you control the position)?
  Machine-verified ≠ feel-verified.

## Session 11 — Ch.3 later-half rework PLAN + lift brake engine feature

Started a creative rework of Ch.3's lift half. The honest problem: **Rooms B and
C are the same puzzle** ("load A → raise B → climb B"). That's the *only*
raise-and-use pattern the lift physics allow with one box — with ≤1 box the
player can never ride a platform up (counterweight maxes at your own weight =
balanced), and boarding any raised platform alone sinks it. The fix is to
**decouple position from weight** with a lift **brake/lock**.

- **Designed the full rework in `dev/CH3_REWORK.md`** (read it before touching
  the lift rooms): critique, the exact lift-physics constraints, the brake spec,
  reworked **Room B "Crank"** (crank a platform up with your own body, brake it,
  climb the platform you raised — you can't be counterweight *and* climber) and
  **Room C "The Crane"** (a crate drives the lift; brake it at a chosen **mid**
  height the clamp overshoots, to bridge to the exit), richer future variants
  (2-box ride-up, cargo-crane, for Ch.6), the hard-won lessons (air-gap, hold-
  jump-for-height), and an ordered resume checklist.
- **Implemented the brake engine feature** (the one piece that unblocks all of
  it): `lift.lock` = a signal id (lever/plate) that freezes the lift. Parsed in
  `spawnEntities`; `updateLifts` evaluates signals and early-`continue`s when
  locked. **Additive + safe — `lock` defaults null so every existing lift is
  unchanged.** `dev/ch3.js` has an isolated brake assertion (locks under load,
  resumes when released). ARCHITECTURE.md updated (lift `lock` field +
  updateLifts note).
- **NOT yet done (next session, per the doc's checklist §8):** rebuild Rooms B &
  C geometry to actually USE the brake + rewrite their `dev/ch3.js` tests, then
  fold the brake into DESIGN.md. The current shipped Rooms B/C still work and
  pass — the rework replaces them.
- **Verified:** full suite green with the brake in — `node dev/headless.js` ALL
  PASS, `node dev/fuzz.js` FUZZ CLEAN, `node dev/t5.js` ALL PASS, `node
  dev/ch1.js` ALL PASS, `node dev/ch2.js` ALL PASS, `node dev/ch3.js` ALL PASS
  (incl. the new brake test).

## Session 10 — T8 (Ch.3 THE YARD) built: boxes / plates / lift intro

Built **Chapter 3 — THE YARD**, the first interior chapter and the box / plate
/ counterweight-lift teaching ground (no lethal hazards, gentle like Ch.1; R
always resets the chapter if a box is wedged). Three rooms, one idea each, all
in `js/levels1.js` (130×24, `bg:'interior'`, seed 103). Authored the geometry
with a throwaway generator (column-range fills → exact equal-width rows; deleted
after authoring) and validated every beat by driving the real engine in the new
`dev/ch3.js` harness.

- **ROOM A — plates.** A latched gate (door col 31, `all` of pa1 (20-21) + pa2
  (25-26)) needs both plates pressed at once; you only weigh enough for one, so
  push the box onto pa1, hop over it, stand on pa2 → the gate latches. Teaches:
  plates = weight, a box substitutes for you, `all` needs both, latch triggers
  once. | checkpoint 0.
- **ROOM B — counterweight lift (ascend).** A 4-tile plateau (62-83) is
  unclimbable bare. Push the box onto platform A (pit 53-54) and it sinks,
  raising platform B (pit 58-61) two tiles **and holding it there** (position is
  state). Hop up onto raised B, mantle the plateau. The box can't reach the
  plateau face (pit B blocks it) so the lift is genuinely required. | checkpoint
  1 (on the plateau) | quiet walk + step down into Room C.
- **ROOM C — lift + plate (synthesis).** The exit gate (door col 115, latched)
  opens from plate pc, which sits on a 4-tile ledge (103-110) reachable only via
  the second lift (box onto A2 (94-95) raises B2 (99-102), board, mantle, press
  pc). Drop down, walk the stairwell to the exit. | checkpoint 2 (room-C
  entrance — Room B is finished behind it).

- **Two geometry/feel lessons learned the hard way (both fixed by building +
  driving, not by eyeballing):**
  1. **A raised lift platform flush against the divider is un-mountable** — its
     side is a wall and its underside a ceiling the player bonks (jump apex
     stalls at the platform bottom). Fix: a **1-tile air gap** beside the
     platform's approach edge (pit B/B2 are one tile wider than the platform, on
     the divider side) so the player arcs *up over the gap* and lands on top.
  2. **HOLLOW has variable jump height**, so a 1-frame jump tap is only a minimum
     hop — useless for clearing 2 tiles. The harness's auto-hop now *holds* jump
     ~16 frames for full height (a real lesson for any future scripted climb).
- **`dev/ch2.js` exit assertion updated:** Ch.2 is no longer the last chapter, so
  its exit now advances to Ch.3 (asserts `chapterIdx===2`, was `state==='title'`).
- **Verified:** `node dev/headless.js` ALL PASS, `node dev/fuzz.js` FUZZ CLEAN,
  `node dev/t5.js` ALL PASS, `node dev/ch1.js` ALL PASS, `node dev/ch2.js` ALL
  PASS, **`node dev/ch3.js` ALL PASS** (sanity; Room A bypass-guards + full
  solve; Room B bare-plateau-unclimbable, box-raises-and-holds-B, full ascent,
  no box-cheese; Room C gate-shut-until-plate, lift→plate→latch, full ascent;
  exit ends the chapter). Browser render of all three rooms is clean (0 console
  errors) and the box/plates/gate/lift platforms read in a brightened zoom.
- **Still needs the user (Ch.3 hand sign-off):** play THE YARD. Does the
  two-plate "use the box as a weight" click without text? Is the lift's
  load-A-to-raise-B legible, and is hopping onto the raised platform + mantling
  the plateau tense-but-fair (not fiddly)? Does the interior mood (no rain,
  dust motes, darker palette) land after two outdoor chapters? Machine-verified
  ≠ feel-verified.

## Session 9b — Ch.2 Light 3 rebuilt: cheese-proof + two-stage (user feedback)

User playtested and broke the Light 3 gate puzzle: "used the box to jump on to
the door, then jumped over the light." Two real failures — the box doubled as a
climbing step over the gate, and the low/open beam could be jumped over. Said
the puzzles are too easy and to make them hard + creative. Rebuilt Light 3 as a
**sealed, two-stage gate-house** (cols 77-111):

- **Anti-cheese by structure:** the whole gate-house is **roofed** (tiles rows
  14-16) so no beam can be jumped over, and the gate is a **floor-to-ceiling**
  door (rows 17-19, meets the roof underside) so a box can't be a step over it.
  Both exploits are now impossible (asserted in dev/ch2.js).
- **Stage A — box shadow → lever.** Beam 3a (col 94, on the roof) is *trained on
  the gate lever* (col 86): it's ALWAYS lit there (dark window 0.00s), so you
  can't run up and pull it bare — you must push the box (waits col 81) in as a
  moving shadow, pull the lever from cover (gate latches), then clamber over the
  box, through the gate, up a step, to checkpoint 1.
- **Stage B — forced solo timing.** Past the gate the floor is **raised one tile**
  (a step the box physically can't be pushed up — verified), so the box is left
  behind and the stage-B beam (3b, col 104) can't be box-shielded. It's a wide
  slow sweep you must *time* a dash through (mistimed = caught; a dwell column is
  lethal standing). This also dodges the "overhead beams are only box-proof
  straight down, shieldable at the angled extremes" trap — exclusion-by-step is
  airtight where overhead-geometry isn't.
- Geometry + every anti-cheese property validated numerically before building;
  dev/ch2.js now has explicit bypass tests (box-climb-gate fails, box-can't-climb-
  step, bare-lever caught, overhead dwell lethal, dash solvable-AND-punishing)
  and a full stage-A traversal (no softlock). **`node dev/ch2.js` ALL PASS**;
  full suite (headless/fuzz/t5/ch1) green; browser render of both stages clean
  (box shadow reads clearly).
- **Lights 1 & 2 NOT yet hardened** — the user said "some of the puzzles" are
  easy; Light 3 (their example) is done. 1 (yard) and 2 (mantle wall) aren't
  cheesable (overhead beams can't be jumped over) but have over-generous timing
  windows. Open question to the user below on how hard to push them.

## Session 9 — T7 (Ch.2 THE FENCE) built + searchlight cones now cast shadows

Built **Chapter 2 — THE FENCE**, the first stealth chapter (three sweeping
searchlights in the rain), and fixed a readability gap the chapter exposed: the
light cone was a flat wedge that drew straight over walls and the box, so the
core "push a box to make a standing shadow" puzzle had no *visible* shadow.

- **Ch.2 — THE FENCE** in `js/levels1.js` (140×24, `bg:'facility'`, seed 102).
  Left→right: start grass → **Light 1** wide slow sweep over a yard of grass
  islands (dash the gaps, crouch in grass to vanish) → checkpoint (48) →
  **Light 2** steep sweep of the strip in front of a 3-tile mantle wall (60-61):
  cross when the beam swings off, mantle to the dark corridor → quiet corridor →
  **Light 3** low near-horizontal beam guarding the gate lever: push the box (80)
  as a *rolling shield*, stop in its shadow to pull the lever (gate latches),
  keep pushing through the gate (92) → checkpoint (94) → exit into the facility.
- **The Light 3 geometry was nailed analytically before building.** A box only
  occludes a beam to a ground-standing player if the beam is shallow, so Light 3
  is mounted **low** (row 16) and to the right; the box then casts a shadow that
  holds for the whole shielded push. Nice emergent property: the sweep's overlap
  point (**col 88**) is *always lit*, so a no-box run from lever to gate gets
  caught crossing it — the box is genuinely required, not optional.
- **Light cones now respect occluders (render fix).** `Render.lightCone` was a
  smooth gradient arc; it now fans `_coneRayHit` rays across the fov, each
  stopped at the first solid tile / box / closed door — the **same occluders the
  detection raycast uses** — so walls clip the beam and a pushed box carves a
  real, visible shadow that matches exactly where the player is hidden. Signature
  gained `(…, level, world)`; call site in `game.js drawPlay` updated.
- **`dev/ch1.js` final test updated:** Ch.1 is no longer the last chapter, so its
  exit now advances to Ch.2 (asserts `chapterIdx===1`) instead of returning to
  title.
- **Verified:** `node dev/headless.js` ALL PASS, `node dev/fuzz.js` FUZZ CLEAN,
  `node dev/t5.js` ALL PASS, `node dev/ch1.js` ALL PASS, **`node dev/ch2.js`
  ALL PASS** (sanity + 3 lights; standing in the yard is detected while
  crouch-in-grass hides; the 3-tile wall mantles; the lever is lethal bare but
  safe behind the box and latches the gate; the full rolling-shield push survives
  lever-pull-to-gate; exit ends the chapter). `node dev/browser-test.js` BROWSER
  SMOKE PASS, plus a Ch.2 render pass (facility bg + 3 cones, 0 console errors)
  and the shadow math spot-checked (rays stop at box/ground, pass through open
  sky). Box-shadow confirmed rendering in a zoomed browser capture.
- **Still needs the user (Ch.2 hand sign-off):** play THE FENCE. Do the sweep
  windows feel tense-but-fair (Light 1's dark gaps are generous ~3-6s; speed up
  if dull)? Does "crouch in grass = invisible" read on its own? Is the box→shadow
  Light 3 puzzle legible — can you *see* the shadow and understand the rolling
  shield, or is the beam too faint (base cone alpha is unchanged from testmap;
  easy to bump for Ch.2 if needed)? Machine-verified ≠ feel-verified.

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
