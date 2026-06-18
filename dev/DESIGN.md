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
A: corridor swept by lights you cannot pass — but husks can. Helm overlooks
it: walk a husk through the beams onto a plate that opens your parallel
shielded corridor. B: timed plate (`hold: 4`): too far to sprint yourself —
park a husk on it instead, walk through, then notice the *next* door needs
that same husk: re-connect through a second helm. C: husk as counterweight:
you ride lift platform A; remotely walk a husk onto platform B to lower
yourself past a beam gap. Finale combines B+C. Checkpoints between rooms.

### Ch. 7 — THE DEEP (darkness + Listener; cavern bg)
Darkness mask on; player glow is the only light, Listener eyes glow when
open. A: single Listener beside the path — learn the growl tell. B: tunnel
with two Listeners on overlapping cycles; grass patches mark safe waiting
spots (flavor only — stillness is what saves you). C: pool crossing with a
Listener on the far shore: float motionless when the eye opens (vertical
drift is allowed, strokes are not). D: scripted finale: a long charge — sprint
right and slide under a closing door. Use a `trigger` zone (action `'charge'`)
to fire the scripted lunge as the player crosses the threshold (implemented T5).
Generous checkpoints (every segment).

### Ch. 8 — THE CORE (everything; interior bg, strange warm glow)
Three escalating rooms: (1) lights + box logistics, (2) husk desync + lift +
timed plate "orchestra" room, (3) darkness + one Listener + a husk you must
walk *while you both stand still during eye-open* (mirrored stillness).
Then the Core chamber: walking into the glow flips control — the ending walk:
every husk in the room walks in unison with you toward a wall and pushes it
open together. White fade. Title card. Credits (engine TODO: ending
cinematic state). After credits: "press R" → title.

## Engine features still needed (referenced above)

- ~~`light.offWhen: [ids]` — signals disable a searchlight.~~ done (T5)
- ~~Breath timer + drowning + screen-darkening tell.~~ done (T5)
- ~~Scripted chase trigger (ch. 7D) — a zone that forces a long charge.~~ done (T5: `trigger` entity)
- ~~Lift brake/lock (`lift.lock`) — a signal freezes a counterweight lift.~~ done (session 11; used Ch.3 Room C)
- Ending cinematic state (ch. 8) + credits. *(T13)*
- ~~Save/continue, pause menu, title screen.~~ done (T3 save + T5 pause/title menus)

## Difficulty / pacing principles

- One new idea per room; combine only ideas the player has already used.
- Execution windows generous (≥ 0.6 s); difficulty lives in the *plan*.
- If a puzzle can be brute-forced by walking right, it's set dressing — fine
  for pacing, but each chapter needs ≥ 2 genuine "stop and think" moments.
- Quiet walks (10–20 s of nothing) between puzzle clusters. That's the INSIDE
  rhythm: tension → release → dread.
