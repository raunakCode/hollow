# HOLLOW — design bible

A 2D atmospheric puzzle-platformer in the spirit of INSIDE. Monochrome
blue-grey silhouette world, rain and fog, a small unnamed figure walking
left-to-right toward a distant facility. No dialogue, no HUD, no score.
Target: ~2 hours of gameplay across 8 chapters, difficulty from puzzle
thinking, not execution.

## Story (implied, never stated)

You wake in a dark forest and walk toward a glow on the horizon. You break
into a facility where limp human "husks" are controlled through helmets.
Descending through drains, machine halls, and a lightless cavern, you reach
the Core — a glowing mass. Touching it, the perspective flips: the final
stretch is walked by *all* the husks moving in unison with you, and you
realize you may have been one all along. Walk out into grey light. Fade.

## Controls

- ←/→ or A/D — move. ↓/S — crouch (hide in grass, squeeze under gaps).
- Z / Space / ↑ / W — jump (variable height; buffered + coyote time).
- X / E — interact: grab/pull box (hold), pull lever, connect/disconnect helm.
- R — restart from checkpoint. M — mute. Esc — pause.

## Mechanics & their rules (keep these consistent!)

**Movement**: run 215 px/s, jump clears **2 tiles** of height comfortably,
**3 tiles** via auto-mantle (press into wall while airborne). Max safe gap
jump: **4 tiles**. A box (1 tile) under you adds +1 tile of reach. These
numbers drive all level design — never require more.

**Boxes**: 30×30 px, pushable (walk into them) and pullable (hold X/E
nearby). Heavy: press plates, block searchlight beams, float in water
(top above surface — can be stood on as a raft/step).

**Levers**: toggle a signal id. **Plates**: momentary signal while any heavy
thing (player, husk, box) is on them; optional `hold` keeps the signal N
seconds after stepping off (timed-door puzzles). **Doors**: open when linked
signals are active (`all` or `any` mode); `latch: true` = stays open forever
once triggered (use after puzzles so death-reset can't strand the player).

**Searchlights**: sweeping cones. Detection fills in ~0.4 s, then a dart
kills you. Blocked by tiles, boxes, and closed doors. Crouching in grass
('G' tiles) makes you invisible. **Lights ignore husks** — that asymmetry is
a core puzzle tool. Lights take an optional `offWhen` (a signal id or list of
ids): while any listed signal is active the cone powers down — no detection,
dimmed in render (implemented T5).

**Husks + helms**: stand at a helm, press X/E: you slump and *every husk the
helm controls mirrors your directional input simultaneously*. A helm controls
its **group** (`husk.group`/`helm.group`; a helm with no group controls every
husk — the simple case). Group husks per room so a later room's helm doesn't
move (or re-centre the camera on) finished rooms' husks (Ch.5 does this; see
its built form). Disconnect and the husks freeze in place (a husk left on a
plate keeps pressing it). Puzzles come from desync: walls/steps that stop one
husk while another keeps walking; gaps that one husk falls into and another
jumps; the same jump that climbs one husk leaves another on the floor. Husks use
full player physics (jump, mantle, swim, push boxes). Husks are **solid to each
other** (but not to the player): without that, two husks driven by the same input
collapse onto one x against a wall and can never be re-separated, which softlocks
any two-plate desync (forced checkpoint). They now stack one body-width apart, so
the offset is always recoverable. Never let a husk get unrecoverable — pits they
fall into need a mantle/ramp back out, or the puzzle must still be solvable.

**Counterweight lifts**: two platforms on a rope. Heavier side sinks at
~58 px/s per unit of weight difference; equal weight = holds position
(rope friction — position is *state* the player sets). Player, husk, and box
each weigh 1. Brain food: getting weight onto the far side, riding while
balanced, using a husk as a remote-controlled counterweight. **Brake / lock**
(`lift.lock: 'signalId'`, a lever or plate): freezes the platform regardless of
weight, so a *crate-driven* lift can be stopped at a chosen mid-height the clamp
would otherwise overshoot (a crane). Note the engine limit found while building
Ch.3: the brake can't be made *necessary* against a player's own body — a
body-raised platform "empty-holds" once you step off, and a climber pogos off a
platform rather than loading it. The brake needs a *persistent* counterweight (a
crate) to matter. Introduced Ch.3 Room C; reused Ch.6.

**Water**: swim freely; can only jump out near the surface. Breath: ~9 s of
head-underwater, then drowning death; the view closes to a shrinking porthole
as it runs out (no HUD bar) and refills fast at the surface with a gasp
(implemented T5). Boxes float; husks swim when mirrored.

**The Listener (creature)**: cavern predator. Cycle: dormant (eye dark,
2.5–4.5 s) → waking growl (0.8 s warning) → alert (eye glowing, 1.8–3.6 s) →
dormant. While its eye is open, any movement (|vx| > 14 or |vy| > 80) within
range triggers a charge that kills on contact. Red-light-green-light. The
growl is the tell; standing (or floating) still is always safe. It returns
home after a missed charge.

**Death**: fade to black ~0.8 s, respawn at last checkpoint. Death resets the
*whole chapter's* entity state — therefore checkpoints must only be placed
where everything behind the player is finished (latched doors), so no
earlier puzzle state is ever needed again.

**Saves**: localStorage `{chapter, checkpointIdx}` written at every
checkpoint. Title screen offers continue (any key resumes; fresh start if no
save).

## Presentation

- Palette per chapter: near-black silhouette foreground (#06080c), blue-grey
  gradient skies, one faint warm accent (the horizon glow / helm light).
- Parallax: 2–3 procedurally generated silhouette layers
  (forest / facility / interior / cavern — see `Render.buildBackground`).
- Post: fog bands, film grain, vignette + cinematic letterbox bars, rain in
  outdoor chapters, dust motes indoors, darkness mask with light holes in
  ch. 7 (player glow ~140 px radius).
- Audio: continuous drone+wind+rain bed crossfaded per chapter
  (`AudioSys.setMood`), synthesized one-shots, heartbeat that quickens with
  danger (light detection / creature eye).
- Camera: smooth follow with look-ahead in facing direction, clamped to
  level; follows husk centroid while connected to a helm.

## Chapter designs

Tile = 32 px. Maps are arrays of 24-row strings. Chars: `#` solid, `.` air,
`~` water, `G` grass, `-` one-way platform. Keep each chapter to one map
(~140–260 columns). Hints are 2–4 faint key-glyph captions in ch. 1–5 only.

### Ch. 1 — THE FOREST (tutorial, rain, ~8 min)
Mood: heavy rain, forest bg. Teach by terrain, almost no text.
Walk right → small step-ups (jump) → 3-tile rock wall (teaches mantle) →
crouch under a fallen hollow log → a box stuck in mud: push it to a 4-tile
cliff, climb (box+jump+mantle) → checkpoint → long quiet walk, facility glow
grows → crouch through a gap under the fence → exit.

### Ch. 2 — THE FENCE (stealth, rain, facility bg)
Light 1 sweeps an open yard dotted with grass patches: dash patch-to-patch
during the off-sweep, crouch to hide. Checkpoint. Light 2 guards a 3-tile
wall: time the mantle. Light 3 watches a lever that opens the gate (latch):
push a box into the beam's line to create standing shadow, pull lever from
cover. Checkpoint after gate. Exit into the facility.

### Ch. 3 — THE YARD (boxes, plates, lift + brake; interior bg)
Built form (session 12; see dev/CH3_REWORK.md for the design history). Three
escalating rooms, gentle, no lethal hazards. A: latched gate needs two plates
(`all`) at once — push a box onto plate 1 and stand on plate 2 yourself (you
only weigh enough for one). B: first **counterweight lift** — push a box onto
platform A; it sinks and raises + *holds* the far platform B (position is
state), and you board the balanced B to mantle a 4-tile exit ledge (the box
can't reach the ledge face, so the lift is required). C: **THE CRANE** — the
new **brake**: a crate cranks platform B up, but a ceiling girder makes its top
clamp un-mountable, so you operate a brake lever to freeze B at a mountable
*mid* height as it rises, then climb it. (Originally planned as a body-driven
"crank" with the brake in Room B too; that proved un-buildable — the brake
needs a persistent crate to be necessary — so Room B is the plain counterweight
lift and Room C carries the brake.) Checkpoints between rooms. Exit: stairs down.

### Ch. 4 — THE DRAINS (water; interior bg, dim)
Built form (session 13; first WATER chapter — teaches swimming, the jump-out
window, and the BREATH timer/porthole/drown). Four rooms, escalating, walk-line
row 12; 150×24, seed 104, asserted in dev/ch4.js. A: open pool — swim across,
jump out onto the flush far bank (always surfaceable, no drowning). B: a flooded
corridor under a 5-tile roof, swum head-underwater (breath drains), surfacing at
four air-pocket chimneys; the exit GRATE (door, latch) up to the next ledge is
shut, so you can't rush it — its SUNKEN lever sits on the corridor floor far back
(pulled underwater with X), and reaching it + the exit on the chimney chain is
the breath plan. C: a high pipe ledge unreachable from the pool (can't jump out
that high, can't mantle from water) — push the box into the narrow pool, it
floats as a RAFT, climb it and mantle the pipe (its +1 tile bridges). D: a deep
cistern — the exit gate (latch) is shut; its sunken lever sits in a pocket capped
by a guard GRATE (a lid: you can't drop straight onto it, you descend beside it
and swim in along the floor); pull it, surface, jump out onto the flush exit
ledge, walk through the opened gate out of the drains. Checkpoint on every dry
surface chamber (death-reset safe).
**Deviations from the sketch above** (recorded per the hard rule): B's literal
two-branch "route fork" is softened to *short-blocked-vs-detour* — the grate
gates the short way up so you must detour to the sunken lever, which is the same
breath-planning idea with simpler, non-cheesable geometry. D's "side tunnel" is a
*swim-in-along-the-floor* under the grate lid (a gentle finale beat), not a
distinct branching tunnel. (Reasons: a real underwater two-way fork that's both
solvable on one breath and non-bypassable is fiddly; the softened forms verify
cleanly and keep the breath windows generous.)

### Ch. 5 — THE HUSKS (helm intro; interior bg)
Built form (session 14; first HELM chapter — teaches connect/disconnect and
desync). 172×24, seed 105, asserted in dev/ch5.js. The PLAYER walks a continuous
one-way walkway (rows 12-13); each room's HUSKS are sealed in a pit below it
(open rows 14-19, floor row 20), seen through a '-' window but unreachable, so a
husk pressing a plate down in the pit is the only way to open the player's gate
above (a latched door on the walkway). Three escalating rooms, deathless (R
re-racks a wedged husk; husks being solid to each other means the two-husk
groups can no longer merge into one body against a wall):
A — one husk: connect at the helm, drive it onto its plate, the gate latches.
B — two husks, two plates, gate needs BOTH at once (`all`). One plate is on a
2-tile step (a husk can only reach it by jumping), the other on the floor. Both
husks mirror you, so the solve is a DESYNC: jump the lead husk up onto the step
while the trailing husk is still on open floor (no wall to climb), then walk both
onto their plates. C — three husks, a 3-tile gap: all mirror you, but only the
lead husk has the runway to clear the gap on a single timed jump and reach the
far plate; the others fall into the gap (safe — row 23 floor, a 3-tile wall
mantles back to the runway) and don't cross. Then the exit (last of levels1).
Checkpoints between rooms (each past a latched gate, death-reset safe).
**Deviations from the sketch above** (recorded per the hard rule): (1) The sketch
implied "every husk in the chapter" mirrors one helm; that can't support the per-
room A(1)/B(2)/C(3) structure (connecting in a later room would move + re-centre
the camera on finished rooms' husks). So a helm now controls only its **group**
of husks (engine: `husk.group`/`helm.group`; default null = all, unchanged for
testmap/single-helm). (2) The husks live in sealed pits the player overlooks (a
vertical "floor gap you can't cross") rather than across horizontal gaps, so the
player and husks never share a route — clean, no player softlock. (3) Room C's
discrimination is the timed jump (only the lead husk is at the gap lip when you
jump); the others fall in safely rather than "bonk a wall" — same idea (only the
right husk crosses, others are recoverable), simpler non-cheesable geometry.

### Ch. 6 — THE MACHINES (husks + lights + lifts + timed plates)
Built form (session 17; the synthesis chapter — every mechanic already shipped,
no new engine feature). 210×24, seed 106, interior, no hints (the player is
experienced). Asserted in dev/ch6.js (planned in dev/CH6_PLAN.md). Rests on the
husk/light asymmetry: a husk walks a player-lethal searchlight unharmed (lights
only test the player and husks aren't occluders); the player dies in it. Three
escalating rooms, checkpoints between (each past a latched gate, death-reset safe):
A — THE BEAM CORRIDOR. The player is on the row-12 walkway; the lone husk is
sealed in the lane below (rows 13-19, floor 20), seen through '-' windows. A
searchlight sweeps the lane (lethal to a player, immune for the husk). Drive the
husk through the beam onto plate pA, which latches the player's walkway gate d_a1.
B — THE RELAY. A timed plate pB1 (`hold: 4`) opens BOTH a gate in the husk's own
lane (d_b1) and the player's walkway gate (d_bw1). Park the husk on pB1, drop the
player 4 tiles off the tier-1 edge to tier 2 (the col-82 face is >3.2 tiles, so
un-mantleable — you can't return, the second helm is forced), then at helm B2 (on
tier 2) re-drive the SAME husk off pB1: it must beat d_b1 closing behind it (the
hold window) and run to pB2, which latches the exit gate d_b2. C — THE
COUNTERWEIGHT (finale). Drive the husk onto lift platform A (it sinks into a pit);
platform B rises 2 tiles to row 18 and HOLDS (the parked husk counterweights it).
The exit plateau (row 16) is a 4-tile mantle from the ground (impossible) but only
2 from raised B. A ground searchlight (lethal to the player, immune for the husk)
guards the approach with a real off-window — time a dash, board raised B, mantle
the plateau, exit (last built chapter → title).
**Deviations from the sketch above** (recorded per the hard rule): (1) Room A
realises "a corridor swept by lights you cannot pass — but husks can" as Ch.5's
sealed-lane idiom: the lit husk-lane the player overlooks. Husk-immunity is taught
by contrast (you watch the husk stroll the lit lane); the player is never
personally in that beam. (2) Room B makes the timed plate's `hold` the crux of a
husk SELF-GATED run — pB1 opens a gate in the husk's own path (d_b1), so the husk
must leave its own plate and beat the door (hold>0 is what gives it the window).
d_b1 is a short, husk-height gate (rows 17-19) rather than full-height so it slams
fast enough that hold:0 genuinely traps the husk (a full-height door's ~0.9 s close
let it squeak through). The two-helm relay is forced by a 4-tile one-way DROP
between B1 and B2 — helm control isn't range-limited, so the second helm is a
*player-spatial* requirement, not a range one. (3) Room C inverts "ride A, lower
yourself past a beam gap": you cannot drive a husk and ride a lift at once
(driving = slumped at a helm), so the husk is the remote COUNTERWEIGHT that RAISES
platform B to bridge the exit (Ch.3 Room B with a husk instead of a box; B sits
over its own pit so a sinking B drops into open space, never solid tiles), and the
player's beam-dash is a SEPARATE ground hazard. The timed plate is showcased
standalone in Room B rather than literally folding B into C. (Plan §summary said
"3 helms / 4 plates"; the real entity set is **4 helms / 3 plates** — Room B's
relay uses two helms, Room C uses a lift not a plate.)

### Ch. 7 — THE DEEP (darkness + Listener; cavern bg)
Built form (session 18; first Listener chapter — the whole thing is red-light /
green-light: a Listener cycles dormant → waking (0.8 s growl warning) → alert
(eye GLOWS); while the eye is open, moving near it triggers a lethal charge,
standing still is always safe). 226×24, seed 107, cavern, `dark: true`, no hints.
Asserted in dev/ch7.js. The darkness mask is the only light: the player's glow +
each Listener's OPEN eye punch holes in the mask (engine: game.js `drawPlay` adds
an eye-glow hole per creature scaled by `c.eye`), so an opening eye reads as a
glowing pool — the red-light tell. Four rooms, generous checkpoints (5 total —
every segment, all death-reset safe since nothing behind the player needs redoing):
A — THE FIRST EYE: one Listener astride the flat path; learn the growl/eye tell
(its body isn't solid, so you walk past it; only the charge kills). B — THE TWO:
two Listeners 12 tiles apart with overlapping danger zones on INDEPENDENT (per-
creature seeded) cycles, so the "both eyes shut" windows are short/irregular —
stop-and-go, freezing when EITHER opens; grass tufts mark rest spots (flavor).
C — THE FLOODED HOLLOW: a short submerged crossing (water over the floor) past a
submerged Listener — you bottom-walk it, freezing by standing still on the floor;
breath stays generous (cross a green window from the dry edge). D — THE COLLAPSE
(finale): entering WAKES the chaser (growl + glowing eye behind you, no lunge);
stepping plate pD opens the exit door dD (which then DESCENDS as the plate-hold
expires) AND lunges the chaser at the plate — slide under dD before it seals;
dawdling on pD is swept. Exit → title (last built chapter).
**Deviations from the sketch above** (recorded per the hard rule): (1) "float
motionless" in Room C isn't physically possible — an idle submerged player SINKS
at ~170 px/s (over the `|vy|>80` noise threshold), so the safe freeze is standing
still on the pool FLOOR (grounded, `vy≈0`); the creature must also be at floor
level for its horizontal charge to overlap the player, which is why Room C is a
bottom-walk rather than a surface swim. (2) The "closing door" is the engine's
top-anchored door CLOSING (the slab grows downward as the plate-hold expires) — a
descending shutter you slide under, exactly the INSIDE beat. The finale chase is a
scripted lunge at the commit point (the chaser is given a tiny natural `range` so
only the `trigger` zones drive it — a `'wake'` tell on entry, a `'charge'` lunge
on the plate); a true continuous pursuit is unwinnable (charge speed 560 > run
215), so the threat is "don't hesitate on the plate," not "outrun it forever."
**Engine-placement gotcha (recorded):** a creature's body bottom sits at
`(def.y+1)*TILE`, so its `y` must be the row whose bottom is the floor top (one
row ABOVE the floor row); placed ON a solid floor row its rect overlaps that
tile and `rectHitsSolidTiles` self-aborts every charge. (Floor row 18 → creature
`y:17`; cf. testmap floor row 16 → creature `y:15`.)

### Ch. 8 — THE CORE (everything; interior bg, strange warm glow) — Built form
A short victory-lap gauntlet (flat interior floor, rows 19-23; 170×24, seed 108,
no hints) recombining shipped mechanics, then the Core chamber + the ending.
- **ROOM A — THE GLARE** (lights + box): two searchlights sweep a roofed strip
  (rows 13-15, cols 12-33 — so a beam can't be jumped over) with an always-lit
  seam (no clean dash). Push the box as a rolling shadow-shield onto pA, which
  latches the floor-to-roof exit gate d_a. | checkpoint 0.
- **ROOM B — THE HOLLOW** (husk + helm): a husk **sealed in a basement under the
  main floor** (rows 20-22 carved open, cols 56-66; solid roof at row 19, sub-
  floor row 23). The player walks the floor above and can never get in; the husk
  can never get out — so connecting at the helm and driving it onto pB (which
  latches the player's gate d_b) is the only way through. The camera drops to the
  husk on connect (the reveal). | checkpoint 1.
- **ROOM C — THE STILLNESS** (Listener + husk, mirrored stillness): a Listener
  with the new **`hearsHusks`** flag also lunges at — and is killed by — a husk
  that *moves* near its open eye. Drive the husk past the eye (freeze it whenever
  the eye opens) onto pC → d_c latches; then disconnect and cross on foot,
  freezing yourself on the eye. Both you and your husk must hold still. | checkpoint 2.
- **THE CORE** (the ending): walk into the glowing mass (a `core` entity) →
  control flips. The player and the husk crowd walk in unison to the far wall (a
  `door` tagged `links:['_wall']`, which no signal opens during play), push it
  open, then a warm whiteout → the HOLLOW title card → a credits scroll → back to
  the title (the save is cleared). | checkpoint 3 at the chamber entrance.

**Deviations from the sketch above** (recorded per the hard rule):
1. **Room B is a calm single-husk sealed-basement beat, not a "husk desync + lift
   + timed-plate orchestra."** Desync was taught in full in Ch.5 and the husk/lift
   counterweight in Ch.3/Ch.6; a robust desync of two mirror-driven husks needs
   delicate jump-window tuning (their 18 px solidity offset makes the separation
   window tiny) and a non-bypassable husk puzzle on a *flat* floor isn't possible
   anyway (the player can just stand on the plate) — it needs a sealed chamber.
   So Room B uses the sealed-chamber idiom robustly; the gauntlet's genuinely new
   beat is Room C. The lift is omitted (its two rooms are Ch.3 and Ch.6).
2. **Room C is LIT, not dark.** Darkness is a per-*chapter* flag (whole-level
   mask), so a chapter can't mix lit puzzle rooms (A's beams must read) with a
   single dark room without a new regional-darkness feature (out of scope for a
   victory-lap). The Listener's growl + glowing-eye tell reads fine in the light.
3. **"Mirrored stillness" is realized by `hearsHusks`** (new engine flag): a
   Listener that hears husks charges at and is killed by a *moving* husk, so a
   driven husk must freeze on the eye exactly as the player does. The "you both
   stand still" tension is real because the husk is now at risk too.
4. The ending is its own `Game.state === 'ending'` cinematic (no `exit` entity in
   the chapter — the Core is the terminus); after the credits, **any key** (not
   "press R") returns to the title.

## Engine features still needed (referenced above)

- ~~`light.offWhen: [ids]` — signals disable a searchlight.~~ done (T5)
- ~~Breath timer + drowning + screen-darkening tell.~~ done (T5)
- ~~Scripted chase trigger (ch. 7D) — a zone that forces a long charge.~~ done (T5: `trigger` entity)
- ~~Lift brake/lock (`lift.lock`) — a signal freezes a counterweight lift.~~ done (session 11; used Ch.3 Room C)
- ~~Ending cinematic state (ch. 8) + credits.~~ done (T13: `Game.state==='ending'`,
  `updateEnding`/`drawEnding`/`CREDITS` in game.js; the `core` entity is the
  trigger, a `links:['_wall']` door is the wall they push open). Also added the
  `creature.hearsHusks` flag (Ch.8 Room C mirrored stillness).
- ~~Save/continue, pause menu, title screen.~~ done (T3 save + T5 pause/title menus)

## Difficulty / pacing principles

- One new idea per room; combine only ideas the player has already used.
- Execution windows generous (≥ 0.6 s); difficulty lives in the *plan*.
- If a puzzle can be brute-forced by walking right, it's set dressing — fine
  for pacing, but each chapter needs ≥ 2 genuine "stop and think" moments.
- Quiet walks (10–20 s of nothing) between puzzle clusters. That's the INSIDE
  rhythm: tension → release → dread.
