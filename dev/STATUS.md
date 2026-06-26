# HOLLOW — status

_Last updated: 2026-06-26 (session 21)._

## Session 21 — Ch.8 Room A (THE GLARE) redesign + honest light detection

### Light detection now samples the head, not just the centre

Second playtest note: behind the box you didn't have to crouch — you could push
it standing and stay safe even though the beam was clearly on your head. Root
cause: light detection raycast only ever tested the player's **centre** point,
which a 1-tile box always covers, while the visible cone (correctly) splashed
over the standing head poking above the box. So the *visual* was right and the
*detection* was wrong.

Fix (`js/entities.js`): factored the per-point sightline test into
`lightSeesPoint(Lt, level, world, px, py)` and `updateLights` now calls it for
**both the head (`player.y+6`) and the centre** — lit if either has a clear
line. A standing figure's head sticks ~12px above the 1-tile box, so you must
now **crouch fully behind cover** to vanish (crouched head sits ~9px *below* the
box top). This is strictly *more* detection, so it only changes partial-cover
situations — the exact "looks lit but safe" bug, in two places:
- **Ch.8 Room A** (the new steady glare) — crouch-push the box across.
- **Ch.2 Light 3a** (gate-house lever) — crouch behind the box to pull the lever.

Both level comments + DESIGN updated; added a `↓` crouch hint at the Ch.2 gate-
house; the ch2/ch8 harnesses now assert *standing* behind the box is caught and
*crouching* survives. The other six chapters' light beats are unaffected
(verified: **`node dev/ch1..8.js` all PASS**).

### Ch.8 Room A (THE GLARE) redesign: the box is no longer skippable

Playtest found the original Room A was solvable by **just running through the
lights** — the two sweeping searchlights left a window you could outrun, so the
box (the intended "rolling shadow-shield") was decorative. Root cause: light
detection ramps over ~0.42 s, and a full-speed runner (215 px/s) clears each
narrow sweeping cone in less than that, so detection never fills. Even the
*intended* box-push only got the player to ~0.48 detection — the box barely
shielded (two flanking down-pointing lights can't both be blocked by one box).

**Fix (data-only, no engine change):** replaced the two sweeping lights with a
single **steady** beam at the far (east) end of the roofed strip, aimed straight
back down the corridor (west, fixed `a0==a1`, `speed:0`). Because it never sweeps
there is no timing gap, and the roof still blocks jumping over it — the lit strip
is impassable on foot. Aimed west so the player (entering from the west) is always
on the shielded side of the box they push east; the box stays between them and
the beam the whole way.

Verified in a logic sim driving the real engine (`scratchpad/designA.js`) and in
real Brave:
- no-box sprint dies at **every** start delay 0–220 frames, and while jumping or
  crouching (no timing/jump/crouch escape);
- box-shield push completes the room (latches d_a, reaches checkpoint 0) with
  **zero** detection — the box reliably casts the shadow;
- rooms B/C and the ending are untouched. `dev/ch8.js` updated (its old box-push
  test placed the player **east** of the box, so it never actually pushed it —
  that masked the exploit) and now also asserts the no-box sprint is caught.
  Full `node dev/ch8.js` → ALL PASS.

## Session 20 — T13 done: Ch.8 THE CORE + the ENDING cinematic (the game is content-complete)

Built **Chapter 8 — THE CORE** as `LEVELS[7]` in `js/levels2.js` (was the last
stub) **and the ending cinematic** — the final T13 deliverable and the last
named engine TODO. With Ch.8 in, all 8 chapters + the ending exist; only T14
(full-game polish) remains. 170×24, seed 108, interior, **flat floor** (rows
19-23, the safest authoring base — like Ch.7), warm glow building toward the
Core, no hints (the player is fully experienced). A short victory-lap gauntlet
recombining shipped mechanics, then the Core chamber. Authored with a throwaway
column generator (`dev/_gen_ch8.js`, deleted) and validated by driving the engine
in the new **`dev/ch8.js`** (18 checks).

- **ROOM A — THE GLARE** (lights + box + plate). Two searchlights sweep a
  **roofed** strip (rows 13-15, cols 12-33 — so a beam can't be jumped over) and
  overlap into an **always-lit seam** (standing in it is lethal → no clean dash;
  the harness proves this). Push the box through as a rolling shadow-shield onto
  pA, which latches the floor-to-roof exit gate d_a. | checkpoint 0.
- **ROOM B — THE HOLLOW** (husk + helm). A husk **sealed in a basement UNDER the
  main floor** (rows 20-22 carved open, cols 56-66; solid roof at row 19, sub-
  floor row 23). The player walks the floor above it and can **never get in**; the
  husk can **never get out** (solid roof) — so connecting at the helm and driving
  it onto pB (which latches the player's gate d_b) is the only way through. The
  **camera drops to the husk on connect** (the reveal). | checkpoint 1.
- **ROOM C — THE STILLNESS** (Listener + husk, *mirrored stillness*). A Listener
  with the **new `hearsHusks` flag** also lunges at — and is killed by — a husk
  that **moves** near its open eye. Drive the husk past the eye (freeze it
  whenever the eye opens) onto pC → d_c latches; then disconnect and cross on
  foot, freezing **yourself** on the eye. Both you and your husk must hold still.
  | checkpoint 2.
- **THE CORE** (the ending). Walk into the **glowing mass** (a new `core` entity)
  → control flips to **`Game.state==='ending'`**. The player and the husk crowd
  walk in **unison** to the far wall (a `door` tagged `links:['_wall']`, which no
  signal opens in play), push it open, then a **warm whiteout** → the **HOLLOW
  title card** → a **credits scroll** → back to the **title** (the save is
  cleared). | checkpoint 3 at the chamber entrance.

- **Three engine additions** (all backward-compatible):
  1. **`core` entity + `Render.core`** — a warm pulsing radial bloom (the one warm
     light in the game), drawn with `lighter` compositing; the world's new `cores`
     array; touching it in `updatePlay` calls `startEnding()`.
  2. **`creature.hearsHusks`** — gated husk detection in `updateCreatures`: in
     `alert`, a husk that's near + noisy triggers a lunge at the husk; a charge
     that hits a husk is fatal (it's your body). Default false = every existing
     creature (Ch.7, testmap) is unchanged.
  3. **The ending state** — `updateEnding`/`drawEnding`/`drawCredits` + the
     `CREDITS` list in game.js; routed in `frame()` alongside play/title; the
     wall is animated directly (the ending doesn't run `updateDoors`, so the
     `_wall` link staying unsatisfied keeps it a solid wall during play).
- **The two design problems the build forced (and the deviations recorded):**
  1. **Room B can't be a flat-floor husk-on-plate puzzle** — the player can just
     stand on the plate (bypass). A non-bypassable husk puzzle needs a *sealed*
     chamber (Ch.5's idiom). Hence the under-floor basement. And the planned
     "husk desync + lift + timed-plate orchestra" was dropped: a robust desync of
     two mirror-driven husks needs frame-perfect jump tuning (their 18 px solidity
     offset makes the separation window tiny — the first build had **both** husks
     mantle the step). Desync was taught in full in Ch.5 and the lift in Ch.3/Ch.6,
     so Room B is a clean sealed-chamber beat and the gauntlet's genuinely new beat
     is Room C.
  2. **Room C is LIT, not dark** — darkness is a per-*chapter* flag (whole-level
     mask), so one chapter can't mix lit puzzle rooms (A's beams must read) with a
     single dark room without a new regional-darkness feature (out of scope for a
     victory-lap). The Listener's growl + glowing-eye tell reads fine in the light.
  Both folded into `dev/DESIGN.md` Ch.8 (now "Built form", 4 deviations) + the
  ending TODO marked done; `dev/ARCHITECTURE.md` updated (`core`/`hearsHusks`
  entity defs, `cores` array, `Render.core`, the `ending` state machine).
- **A harness gotcha worth noting** (cost one red→green cycle): a door object
  cached in a `const` across a `startCh8()` is **stale** — `loadChapter` rebuilds
  `Game.world` with fresh entity objects, so look doors up *after* each reset.
- **Verified:** `node dev/headless.js` ALL PASS, `dev/fuzz.js` FUZZ CLEAN (8
  seeds), `dev/t5.js` ALL PASS, `dev/ch1.js`…`ch7.js` ALL PASS, **`dev/ch8.js`
  ALL PASS** (18 checks: sanity; A always-lit-seam-is-lethal + box-shield-crosses-
  and-latches-d_a; B player-can't-reach-sealed-pB + driven-husk-latches-d_b +
  husk-can't-escape-the-basement; C husk-moving-near-open-eye-kills + still-husk-
  safe + careful-drive-latches-d_c + player-crosses-on-foot; CORE touch-starts-
  ending + wall-opens + whiteout→card→credits→end→title + save-cleared). Updated
  `dev/ch7.js`'s exit assertion (Ch.7 now advances to Ch.8 `chapterIdx===7`, not
  title). Browser render (throwaway playwright) of all rooms + the **full ending**
  (unison walk, warm whiteout, the HOLLOW card, the credits scroll, return to
  title) **clean (0 console errors, 121 fps)** — captures show the Core as a warm
  orb with the husk crowd, the basement reveal, the beam strip, and the title card.
- **Still needs the user (Ch.8 + ending feel sign-off):** play THE CORE. Does the
  glare's box-shield read after Ch.2/Ch.6? Is the sealed-basement reveal (camera
  drop) legible — is it clear you're driving a body you can never reach? Does Room
  C's *you-both-freeze* land (is it clear the Listener now hears the husk)? And
  the ending — does the unison walk into the wall, the whiteout, the card, and the
  credits feel like an *ending*, or does it need more weight/pacing (walk speed,
  whiteout timing, credits scroll rate are all easy to tune)? Machine-verified ≠
  feel-verified. The interior palette is dark — Room C especially reads dim in
  captures; may want a touch more ambient light.
- **Post-build fix (user-reported):** jumping straight to Ch.8, "I can't see my
  own character." Confirmed (brightened capture): the figure renders fine but the
  spawn (col 3) is unlit and a dark silhouette vanishes into the near-black
  interior ground (tiles are a fixed `#06080c`) until you reach Room A's first
  beam. Added an opt-in chapter flag **`playerGlow`** (Ch.8 only) → `drawPlay`
  draws a faint *additive* presence halo BEHIND the player + husks (lit chapters
  only; gated off for `dark`), so you stay locatable without lifting the
  silhouette. Other chapters are untouched (no flag = no code path). Re-verified:
  ch8/headless ALL PASS, ending render still clean (0 errors, 121 fps); the spawn
  figure now reads at normal brightness. (Ch.5/Ch.6 interiors may have the same
  dim-spawn issue — left as a polish item for T14 unless the user hits it.)

## Session 19 — dev tooling: title chapter-select (jump to any chapter for testing)

Added a **dev chapter-select** to the title so any chapter can be booted directly
(the user wanted faster testing). On the title, `` ` `` (Backquote) toggles a
"JUMP TO CHAPTER" overlay listing all 7 chapters; up/down move the cursor, a digit
**1-9 jumps straight in**, confirm enters the cursor's chapter, Esc closes. A faint
`` `  chapters`` hint sits bottom-left of the title.

- **Implementation:** `Input.digitPressed()` (util.js, returns 1-9/0);
  `Game.selecting`/`Game.selectSel` state; `updateChapterSelect()` +
  `jumpToChapter(i)` + `drawChapterSelect()` in game.js. The toggle is handled
  **before** the any-key "new game" path so pressing `` ` `` can't double as
  starting the game. `jumpToChapter` does a clean `loadChapter(i)` and does **not**
  write the save — the real continue-save is preserved (checkpoints reached after
  a jump still save as usual).
- **Verified:** `node dev/headless.js` ALL PASS, `dev/ch1.js` + `dev/ch7.js` ALL
  PASS (unchanged — title-only feature). Browser-driven check (throwaway
  playwright script): `` ` `` opens the overlay, ArrowDown increments the cursor
  per press, `Digit5` jumps straight to `chapterIdx===4` (THE HUSKS) in `play`
  with `selecting` cleared, **0 console errors**; screenshot confirms the overlay
  reads (HOLLOW + the 7-chapter list with the cursor highlight).

## Session 18 — T12 done: Ch.7 THE DEEP built (darkness + Listener red-light/green-light + chase finale)

Built **Chapter 7 — THE DEEP** as `LEVELS[6]` in `js/levels2.js` (was the stub).
The first **Listener** chapter and the first **dark** chapter. The whole thing is
**red-light / green-light**: a Listener cycles dormant → waking (0.8 s growl
warning) → alert (eye GLOWS); while the eye is open, *moving* near it triggers a
lethal charge, *standing still* is always safe. 226×24, seed 107, cavern,
`dark: true`, **no hints**. Flat continuous floor (row 18) so darkness never
causes a cheap fall; authored with a throwaway column generator (deleted) and
validated by driving the engine in the new **`dev/ch7.js`** (24 checks). Four
rooms, 5 checkpoints (every segment; all death-reset safe — Ch.7 has no
irreversible puzzle STATE, only positioning, so a checkpoint can sit anywhere):

- **ROOM A — THE FIRST EYE.** One Listener astride the path; learn the growl/eye
  tell. Its body isn't solid (you walk past it); only the charge kills. | check 0/1.
- **ROOM B — THE TWO.** Two Listeners 12 tiles apart with overlapping danger zones
  on **independent** (per-creature seeded) cycles, so the "both eyes shut" windows
  are short/irregular — stop-and-go, freeze when EITHER opens. Grass tufts mark
  rest spots (flavor — stillness is what saves you). | check 2.
- **ROOM C — THE FLOODED HOLLOW.** A short submerged crossing (water rows 14-17
  over the floor, cols 120-130) past a submerged Listener. Bottom-walk it; the
  safe freeze is standing still on the floor (grounded). Breath stays generous
  (cross a green window from the dry edge). | check 3.
- **ROOM D — THE COLLAPSE (finale).** Entering WAKES the chaser (growl + glowing
  eye behind you, no lunge); stepping plate **pD** opens the exit door **dD**
  (which then DESCENDS as the plate-hold expires) AND lunges the chaser at the
  plate — slide under dD before it seals; dawdling on pD is swept. Exit → title
  (Ch.7 is the last built chapter). | check 4 at the finale entrance.

- **One engine feature (render):** dark chapters now glow the Listener eyes.
  `drawPlay` (game.js) builds the darkness-mask holes as the player glow PLUS one
  hole per creature at its eye, radius/alpha scaled by `c.eye` — an OPEN eye reads
  as a glowing pool in the black (the red-light tell), a shut eye punches nothing.
  Backward-compatible (no creatures / no dark = unchanged).
- **The bug the harness caught (validate-by-driving again):** a creature's body
  bottom sits at `(def.y+1)*TILE`, so placing it ON the solid floor row embeds its
  rect in that tile and `rectHitsSolidTiles` **self-aborts every charge** (a
  Listener that can never lunge). Fix: creatures go one row ABOVE the floor (floor
  row 18 → `y:17`; cf. testmap floor row 16 → `y:15`). Recorded in DESIGN/ARCH.
- **Finale tuning:** a true continuous pursuit is unwinnable (charge 560 > run
  215), so the chaser gets a tiny natural `range:4` and is driven ONLY by the
  `trigger` zones (a `'wake'` tell on entry, a `'charge'` lunge on the plate) — the
  threat is "don't hesitate on the plate," not "outrun it forever." The first
  harness run died mid-sprint because a larger range let the *natural* alert→charge
  catch the runner; shrinking the range fixed it.
- **Two DESIGN deviations recorded:** (1) "float motionless" (Room C) is impossible
  — an idle submerged player sinks ~170 px/s (over the `|vy|>80` noise threshold) —
  so the freeze is a floor-stand, and the Listener is at floor level so its
  horizontal charge can overlap the player (hence bottom-walk, not surface swim).
  (2) the "closing door" is the engine's top-anchored door closing (slab grows
  downward = a descending shutter you slide under).
- **Bookkeeping done:** updated `dev/ch6.js`'s exit assertion (Ch.6 now advances to
  Ch.7 `chapterIdx===6`, not title); Ch.7's exit is the new last→title (automatic).
  Folded the 2 deviations + engine notes into `dev/DESIGN.md` Ch.7 (now "Built
  form"); updated `dev/ARCHITECTURE.md` (dark-chapter eye holes, creature-placement
  gotcha, ch7.js).
- **Verified:** `node dev/headless.js` ALL PASS, `dev/fuzz.js` FUZZ CLEAN (8 seeds),
  `dev/t5.js` ALL PASS, `dev/ch1.js`…`ch6.js` ALL PASS, **`dev/ch7.js` ALL PASS**
  (24 checks: sanity; eye cycle; still-is-safe vs move-is-lethal; the 0.8 s growl
  is a true no-charge warning; A careful crossing; B independent cycles + stop-and-go
  crossing; C idle-sinks-to-floor + floor-stand-safe + crossing-without-drown; D
  entry-wake + pD-opens-dD + door re-seals + door-required + dawdle-swept + full-
  sprint-slides-under-dD→exit→title). Browser render of all four rooms **clean (0
  console errors)** — brightened captures show the player glow, the glowing eyes
  through the dark (one in A, two in B, a submerged one in the C pool), and the
  finale, all reading correctly.
- **Still needs the user (Ch.7 feel sign-off):** play THE DEEP. Does the eye/growl
  tell read in the dark (is the glowing-eye-as-red-light legible)? Is the freeze
  window fair (esp. Room C underwater, where stopping is a touch slower)? Are Room
  B's two independent cycles tense-but-solvable? Does the finale land — the
  descending-door slide + the "don't dawdle on the plate" lunge — and is the slide
  window comfortable? Machine-verified ≠ feel-verified.

## Session 17 — T11 done: Ch.6 THE MACHINES built (the husks×lights×lifts×timed-plates synthesis)

Executed the session-16 plan (`dev/CH6_PLAN.md`) start to finish. Built **Chapter 6
— THE MACHINES** as `LEVELS[5]` in `js/levels2.js` (was the stub). **No new engine
feature** — the whole chapter is a recombination of shipped mechanics, resting on
the **husk/light asymmetry** (lights only test the player; husks aren't occluders,
so a husk walks a player-lethal beam unharmed). 210×24, seed 106, interior, **no
hints** (the player is experienced). Authored geometry with a throwaway column
generator (deleted) and validated every beat by driving the engine in the new
`dev/ch6.js` (35 checks). Three escalating rooms, checkpoints between (each past a
latched gate, death-reset safe):

- **ROOM A — THE BEAM CORRIDOR.** Player on the row-12 walkway; the lone husk is
  sealed in the lane below, seen through `-` windows. A searchlight sweeps the lane
  (lethal to a player, immune for the husk). Drive the husk through the beam onto
  plate **pA**, which latches the walkway gate **d_a1**. Teaches husk-immunity by
  contrast. | checkpoint 0.
- **ROOM B — THE RELAY.** A timed plate **pB1 (`hold:4`)** opens BOTH a gate in the
  husk's own lane (**d_b1**) and the player's walkway gate (**d_bw1**). Park the husk
  on pB1, drop the player 4 tiles off the tier-1 edge to tier 2 (the col-82 face is
  >3.2 tiles → un-mantleable, so you can't go back — the second helm is forced), then
  at **helm B2** re-drive the SAME husk off pB1: it must beat d_b1 closing behind it
  (the hold window) and run to **pB2**, which latches the exit gate **d_b2**. |
  checkpoint 1.
- **ROOM C — THE COUNTERWEIGHT (finale).** Drive the husk onto lift platform A (it
  sinks into a pit); platform B rises 2 tiles to row 18 and **HOLDS** (the parked
  husk counterweights it). The exit plateau (row 16) is a 4-tile mantle from the
  ground (impossible) but only 2 from raised B. A ground searchlight guards the
  approach with a real off-window (~2.8–4.4 s measured) — time a dash, board raised
  B, mantle the plateau, exit → **title** (Ch.6 is the last built chapter). |
  checkpoint 2 at the Room-C entrance (past latched d_b2, so beam deaths don't replay
  Room B).

- **Two geometry fixes the harness forced (validate-by-driving paid off again):**
  1. **`d_b1` made a short, husk-height gate (rows 17-19) instead of full-height.**
     With a full-height door, the door's ~0.9 s close animation let the husk squeak
     through even at `hold:0` — so the hold wasn't actually necessary (the whole point
     of Room B). A short gate at the husk's body height slams to blocking in ~0.4 s, so
     `hold:0` now genuinely traps the husk and `hold:4` is what lets it beat the door.
  2. **Platform B given its OWN pit (cols 153-155).** Originally B rested flush on
     solid ground; the player's weight could sink B *into solid tiles* → the body got
     ejected/teleported (a death-like glitch the harness caught). Putting B over a pit
     (Ch.3 Room B's proven pattern) means a sinking B drops into open space and is
     recoverable.
- **Plan summary typo corrected:** the plan's prose said "3 helms / 4 plates"; the
  real entity set is **4 helms / 3 plates** (Room B's relay uses two helms B1+B2 both
  group `b`; Room C uses a lift, not a plate). The plan's own entity draft was right.
- **Bookkeeping done:** updated `dev/ch5.js`'s exit assertion (Ch.5 now advances to
  Ch.6 `chapterIdx===5`, not title); Ch.6's exit is the new last→title (automatic via
  `chapterIdx+1 < LEVELS.length` in game.js — no game.js edit needed). Folded the 3
  deviations into `dev/DESIGN.md` Ch.6 (now "Built form").
- **Verified:** `node dev/headless.js` ALL PASS, `dev/fuzz.js` FUZZ CLEAN (8 seeds),
  `dev/t5.js` ALL PASS, `dev/ch1.js`…`ch6.js` ALL PASS. **`dev/ch6.js` ALL PASS**
  (35 checks: sanity + helm-group isolation; A husk-through-beam latches d_a1 + husk
  never dies + no walkway leak + lethal-in-lane; B park-husk-on-pB1 opens both gates +
  un-mantleable drop + B2 relay latches d_b2 + hold-necessity; C husk-raises-B-and-
  holds + plateau-unreachable-from-ground + reachable-from-raised-B → exit→title +
  real beam off-window + B/plateau beam-safe). Browser render of all rooms **clean
  (0 console errors, 122 fps)** — brightened captures show the walkway/lit lane, the
  connected camera drop, tier-2 windows, and the Room-C lift/pits/beam/plateau all
  reading correctly.
- **Still needs the user (Ch.6 feel sign-off):** play THE MACHINES. Does "the husk
  walks the searchlight unharmed; you don't" click by contrast (Room A)? Is Room B's
  two-stage relay — park the husk, drop yourself past the un-returnable edge, re-drive
  it from a second helm to beat the lane gate — legible and fair (is the hold window
  generous enough)? Does Room C's husk-as-counterweight + timed beam-dash land as a
  finale, and is the dash window comfortable? Machine-verified ≠ feel-verified.

## Session 16 — Ch.6 (T11) fully DESIGNED, not yet built (ran low on budget)

Started T11 (Ch.6 THE MACHINES — the husks×lights×lifts×timed-plates synthesis).
Confirmed every mechanic already exists (re-read entities.js/game.js/player.js)
so **no new engine feature is needed**, then designed the whole chapter concretely
and wrote the build plan to **`dev/CH6_PLAN.md`** — read it first next session and
just execute it. Did NOT touch `js/levels2.js` (still the stub) so nothing is
half-built/broken. **Resume = build per the plan: write `dev/_gen_ch6.js`, paste
rows+entities into levels2.js as `LEVELS[5]`, write `dev/ch6.js`, iterate to green
(incl. light tuning), then the bookkeeping below.**

- **Design (full detail + exact coords in CH6_PLAN.md):** 210×24, seed 106,
  interior, no hints. Room A THE BEAM CORRIDOR (drive a husk through a lethal-to-
  player beam — husks are immune — onto a plate that latches your walkway gate;
  Ch.5 sealed-lane idiom). Room B THE RELAY (timed plate `hold:4` as a husk
  self-gated run + a two-helm relay forced by a 4-tile one-way drop). Room C THE
  COUNTERWEIGHT (husk as a remote counterweight raising a lift to bridge a 4-tile
  exit — Ch.3-B with a husk — plus a ground beam-dash the player times).
- **Key engine facts that shaped it** (all in the plan): lights ignore husks and
  husks aren't light occluders; **one-way `-` tiles do NOT block light rays** (so a
  lane beam can leak up to the walkway — must verify detect==0); you can't drive a
  husk while riding a lift; a balanced lift HOLDS; mantle cap 102px (~3.2 tiles);
  plate `hold` keeps the signal N s after step-off.
- **MUST-DO bookkeeping next session** (in the plan): update `dev/ch5.js`'s final
  assertion — Ch.5 exit now advances to Ch.6 (`chapterIdx===5`), not `title`
  (same edit ch1–ch4 got when the next chapter landed); Ch.6 exit is the new
  last→title. Then full suite + browser render, fold 3 deviations into DESIGN.md,
  check off T11.
- **Nothing verified yet** — design only. No code changed; suite is still green
  from session 15.

## Session 15 — bugfix: multi-husk groups could merge into one body (softlock)

User found a real dead-end in Ch.5: drive a two-husk group into a wall and both
husks converge onto the **same x** (identical mirrored input + a shared wall =
the offset collapses). After that every input moves them as one — you can never
get one onto each of two plates, and the only escape is a checkpoint restart.

- **Fix — husks are now solid to each OTHER** (not to the player). `collectSolids`
  (entities.js) adds the peer husks to a husk's own solids list when `self.isHusk`,
  so the existing swept collision stops a trailing husk one body-width (**18px**)
  behind the one ahead. They can never overlap → the offset is always recoverable.
  Player↔husk stays pass-through on purpose (a roaming husk must not be able to
  shove the slumped body off its helm). ~3 lines, reuses the existing sweep.
- **Why this over a recovery affordance:** it makes the merge physically
  impossible instead of just softening the reset, and it's the INSIDE-faithful
  reading (the bodies are physical). Considered+rejected: re-press-helm to re-rack
  the husks (band-aid — merging still happens and feels bad).
- **Verified:** full suite stayed green — `headless`/`t5`/`ch1`–`ch5` ALL PASS,
  `fuzz` CLEAN (8 seeds). **Room C's timed-jump window survived unchanged** (the
  one tuned beat I was worried about). A focused throwaway drove both room-B husks
  into the stopper wall and confirmed they settle at exactly 18px apart (was: 0).
- Docs updated: DESIGN.md (husk mechanic + Ch.5 deathless note), ARCHITECTURE.md
  (`collectSolids` + the husk-solidity rule). No new known issues.

## Session 14 — Ch.4 feel signed off; T10 (Ch.5 THE HUSKS) built: the HELM chapter

User signed off Ch.4 ("chapter 4 seems pretty good"), so **T9's feel pass is in**.
Then built **Chapter 5 — THE HUSKS**, the first HELM chapter (connect at a helm,
the husks mirror you; disconnect, they freeze). 172×24, seed 105, `bg:'interior'`.
The whole chapter sits on one spatial idea: **the player walks a continuous
one-way walkway (rows 12-13) over sealed husk pits** (open rows 14-19, floor row
20) that they see through `-` viewing windows but can never enter — so a husk
pressing a plate down in the pit is the only way to open the player's latched
gate up on the walkway. Three rooms, one idea each, deathless (no hazards; R
re-racks a wedged husk). Authored geometry with a throwaway column generator
(`dev/_gen_ch5.js`, deleted) and validated every beat by driving the engine in
the new `dev/ch5.js`.

- **Engine feature first — helm husk groups.** The existing helm controlled
  *all* `world.husks` and the camera followed *all* husks' centroid. That can't
  support a per-room A(1)/B(2)/C(3) layout — connecting in room C would also move
  rooms A/B's husks and yank the camera to the level's middle. Added
  `husk.group`/`helm.group`: a helm drives only its group; **default `null` =
  controls all husks (unchanged for the testmap + any single-helm chapter)**.
  New `controlledHusks()` (game.js) is used by the mirror loop, the box-push
  loop, `updateCamera` (centroid), `drawPlay` (connected glow), and the connect
  guard. Additive + backward-compatible — full existing suite stayed green.
- **ROOM A — the remote weight.** Connect at the helm, drive the lone husk onto
  its plate (pA); the gate (on the walkway) latches; disconnect and walk through.
  | checkpoint 0.
- **ROOM B — the desync (two husks, two plates, `all`).** One plate is on a
  **2-tile step** a husk can only reach by jumping; the other is on the floor.
  Both husks mirror you, so you must **desync**: jump the *lead* husk up onto the
  step while the *trailing* husk is still on open floor (no wall to climb), then
  walk both onto their plates → both pressed at once → gate latches. Naively
  walking both right (no jump) piles them on the floor — only one plate — gate
  stays shut (asserted). | checkpoint 1.
- **ROOM C — the timed runway jump (three husks, a 3-tile gap).** All three
  mirror you, but only the **lead** husk has the runway to clear the gap on a
  single timed jump and reach the far plate (pC); the trailing two fall into the
  gap — **safe** (row-23 floor; a 3-tile wall mantles back to the runway) — and
  don't cross. Gate latches; disconnect; walk out the exit (last of levels1).
  | checkpoint 2.
- **Room C tuning lesson (measure in-engine again).** First built the far ledge
  one tile *higher* than the runway (a 4-tile gap-side wall, so a fallen husk
  couldn't mantle *up* to it — a clean no-fall-up-bypass). But that made the jump
  window brutal: the husk had to arrive at the raised ledge still high, so a jump
  even ~1 tile early landed short — a ~0.06 s window. Dropped the far ledge to the
  runway level and scanned the jump window in-engine: now jumping anywhere from
  ~col 119.75 to past the lip succeeds (~0.4 s + coyote), and jumping too early
  fails *safely* (husk drops into the gap). Accepted that a player could
  alternatively fall a husk in and mantle the 3-tile far wall up to the ledge —
  a benign emergent solve, not a cheese (still needs helm control).
- **Three DESIGN deviations recorded** (per the hard rule): (1) a helm controls
  its *group*, not literally "every husk in the chapter"; (2) husks live in
  sealed *pits the player overlooks* (a vertical gap) rather than across
  horizontal gaps, so player/husk routes never collide (no player softlock);
  (3) Room C's losers *fall in safely* rather than "bonk a wall" — same "only the
  right husk crosses, others recoverable" idea, simpler non-cheesable geometry.
- **`dev/ch4.js` exit assertion updated:** Ch.4 is no longer the last chapter, so
  its exit now advances to Ch.5 (asserts `chapterIdx===4`). Ch.5's exit is the
  new last-chapter→title.
- **Verified:** `node dev/headless.js` / `t5.js` / `ch1.js` / `ch2.js` / `ch3.js`
  / `ch4.js` ALL PASS, `node dev/fuzz.js` FUZZ CLEAN (8 seeds), **`node dev/ch5.js`
  ALL PASS** (level sanity; helm-group isolation — driving room B leaves rooms
  A & C husks frozen; A remote-plate solve + player-can't-open-alone; B naive-walk
  fails / desync solve lands one husk on the step + one on the floor + latches; C
  player-can't-open-alone + only one husk crosses to pC + the other two stay in
  the gap; exit→title). Browser render of all three rooms **clean (0 console
  errors, 122 fps)**; gate A opened from a live husk-drive, and brightened
  connected-camera shots show the pit + step (one husk low, one up on the step)
  and the gap reading correctly.
- **Still needs the user (Ch.5 feel sign-off):** play THE HUSKS. Does connecting
  at a helm and seeing the husk below "click" (the `-` window + camera drop)? Is
  Room B's desync — *jump the near husk up while the far one's still on the floor*
  — discoverable without text, and is the jump timing fair? Is Room C's
  "only the one with runway clears it; the others fall in (safe)" readable, and is
  the gap-jump window comfortable? Machine-verified ≠ feel-verified.

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
