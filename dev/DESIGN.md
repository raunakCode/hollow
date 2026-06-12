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

**Husks + helms**: stand at a helm, press X/E: you slump and *every husk in
the chapter mirrors your directional input simultaneously*. Disconnect and
they freeze in place (a husk left on a plate keeps pressing it). Puzzles come
from desync: walls stop one husk while another keeps walking; gaps that one
husk falls into and another jumps. Husks use full player physics (jump,
mantle, swim, push boxes). Never let a husk get unrecoverable — pits they
fall into need ramps back out, or the puzzle must still be solvable.

**Counterweight lifts**: two platforms on a rope. Heavier side sinks at
~58 px/s per unit of weight difference; equal weight = holds position
(rope friction — position is *state* the player sets). Player, husk, and box
each weigh 1. Brain food: getting weight onto the far side, riding while
balanced, using a husk as a remote-controlled counterweight.

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

### Ch. 3 — THE YARD (boxes, plates, lift intro; interior bg)
A: door needs two plates (`all`): one box + yourself; realize you can leave
the box and walk through while... no — plates are momentary: stack puzzle —
box on plate 1, plate 2 is *beyond* the door: use `hold: 3` on plate 2 from a
previous room's box drop. Keep it gentle. B: first counterweight lift: far
platform must come down — push a box onto the near platform? Wrong: push box
onto platform B so A rises empty; step on A (1v1, balanced where it stands);
realize you must *first* sink A by standing on it, step off at the bottom,
push the box on, etc. Let the player discover that lift position is state.
C: lift as adjustable bridge: park it mid-height to jump across to a ledge.
Latch door + checkpoint after each. Exit: stairwell down.

### Ch. 4 — THE DRAINS (water; interior bg, dim)
A: open pool, learn swimming + jumping out. B: flooded corridor with air
pockets; route forks — the long fork has a latch lever; sequence which air
pockets chain together within one breath. C: floating box: drag it into a
deep pool, climb onto it to reach a high pipe (box-as-raft). D: a sunken
latch lever beneath a guard grate: find the side tunnel. Checkpoint at every
surface chamber. Exit: climb out of the cistern.

### Ch. 5 — THE HUSKS (helm intro; interior bg)
A: one husk behind a floor gap you can't cross; helm on your side. Connect,
walk the husk onto a plate, disconnect (it keeps standing there), door
latches open. B: two husks at different x; two plates. Walking moves both —
use a wall that stops husk 1 while husk 2 keeps going to desync their
spacing, then place both. C: three husks, a gap: jump at the moment where
only the correct husk has runway to clear it; the others bonk a wall or land
safely below (ramp back up — no softlock). Checkpoints between rooms. Exit.

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
- Ending cinematic state (ch. 8) + credits. *(T13)*
- ~~Save/continue, pause menu, title screen.~~ done (T3 save + T5 pause/title menus)

## Difficulty / pacing principles

- One new idea per room; combine only ideas the player has already used.
- Execution windows generous (≥ 0.6 s); difficulty lives in the *plan*.
- If a puzzle can be brute-forced by walking right, it's set dressing — fine
  for pacing, but each chapter needs ≥ 2 genuine "stop and think" moments.
- Quiet walks (10–20 s of nothing) between puzzle clusters. That's the INSIDE
  rhythm: tension → release → dread.
