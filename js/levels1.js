// ---------------------------------------------------------------
// HOLLOW - levels1.js : chapters 1-5
// Ch.1 (THE FOREST), Ch.2 (THE FENCE), Ch.3 (THE YARD), Ch.4 (THE DRAINS) and
// Ch.5 (THE HUSKS) are all live below.
// The TEST GROUNDS mechanics sheet now lives in dev/testmap.js (dev-only,
// loaded by the harnesses) so this file is the real game.
// ---------------------------------------------------------------
'use strict';

const LEVELS = [];

// -- Ch.1 — THE FOREST -------------------------------------------
// Tutorial, heavy rain, taught almost entirely by terrain. Left to right:
//   start flat (grass 5-9) | step-up stones 15-22 (teach JUMP) | 3-tile
//   rock wall 30-34 (teach MANTLE) | fallen hollow log 48-55, 3 thick with
//   a 1-tile gap beneath (teach CROUCH-under) | box stuck in mud (62) ->
//   push it to the 4-tile cliff 70-82 and climb box+jump+mantle | checkpoint
//   on the plateau | gentle descent 83-88 | long quiet walk (grass 110-116),
//   facility glow on the horizon | crouch under the fence 146-147 | exit (158).
//   No lethal hazards — pure traversal teaching. One checkpoint (death-free
//   chapter; it's just the save/continue anchor, placed past the only puzzle).
LEVELS.push({
  name: 'THE FOREST',
  bg: 'forest',
  seed: 101,
  palette: { sky0: '#080b10', sky1: '#18202e', horizonGlow: 'rgba(150,140,118,0.10)' },
  mood: { drone: 0.05, wind: 0.018, rain: 0.014, pitch: 52 },
  rain: true,
  dark: false,
  rows: [
    ".....................................................................................................................................................................",
    ".....................................................................................................................................................................",
    ".....................................................................................................................................................................",
    ".....................................................................................................................................................................",
    ".....................................................................................................................................................................",
    ".....................................................................................................................................................................",
    "..................................................................................................................................................##.................",
    "..................................................................................................................................................##.................",
    "..................................................................................................................................................##.................",
    "..................................................................................................................................................##.................",
    "..................................................................................................................................................##.................",
    "..................................................................................................................................................##.................",
    "..................................................................................................................................................##.................",
    "..................................................................................................................................................##.................",
    "..................................................................................................................................................##.................",
    "..................................................................................................................................................##.................",
    "................................................########..............#############...............................................................##.................",
    "..............................#####.............########..............###############.............................................................##.................",
    "..................##..........#####.............########..............#################...........................................................##.................",
    ".....GGGGG.....##.##.##.......#####...................................###################.....................GGGGGGG................................................",
    "#####################################################################################################################################################################",
    "#####################################################################################################################################################################",
    "#####################################################################################################################################################################",
    "#####################################################################################################################################################################",
  ],
  playerStart: [3, 19],
  entities: [
    { t: 'hint', x: 12, y: 16, text: '↑' },          // jump (the step-up stones)
    { t: 'hint', x: 45, y: 15, text: '↓' },          // crouch (the fallen log)
    { t: 'hint', x: 60, y: 16, text: 'X' },          // grab/push (the mud box)
    { t: 'box', x: 62, y: 19 },                      // stuck in mud: push to the cliff
    { t: 'check', x: 75, y: 14, idx: 0 },            // on the plateau, past the only puzzle
    { t: 'exit', x: 158, y: 16, w: 2, h: 4 },
  ],
});

// -- Ch.2 — THE FENCE --------------------------------------------
// First stealth chapter: sweeping searchlights at the facility perimeter, in the
// rain. Left to right:
//   start flat (grass 5-9) | LIGHT 1 yard: dash gap-to-gap between grass islands
//   (14-19, 25-30, 36-42), crouch in grass to vanish from the beam | checkpoint
//   (48) | LIGHT 2 guards a 3-tile wall (60-61): cross the lit strip when the
//   beam swings off, mantle to the dark corridor | quiet corridor 62-76 |
//   LIGHT 3 — the roofed GATE-HOUSE (cols 77-111, roof rows 14-16, so beams
//   can't be jumped over and the gate seals floor-to-ceiling so a box can't be
//   a step over it). Two stages:
//     A. an angled beam (3a) trained on the gate lever (86) — it's ALWAYS lit
//        there, so you can't run-up and pull it; push the box (waits at 81) in
//        as a moving shadow and CROUCH behind it (standing leaves your head in
//        the beam — detection samples the head, not just the centre), pull the
//        lever from its cover, the gate (96) latches open. Checkpoint past it.
//     B. an OVERHEAD beam (3b, col 104) sweeps the exit corridor — a floor box
//        casts no useful side-shadow under it, so it's a forced solo run: time
//        the dash through when the beam is at the far side.
//   | walk out into the facility (exit 121).
//   All three light geometries (+ the anti-cheese: no jump-over, no box-climb,
//   bare-lever caught) are validated in dev/ch2.js — tweak there if you move a
//   fixture.
LEVELS.push({
  name: 'THE FENCE',
  bg: 'facility',
  seed: 102,
  palette: { sky0: '#06080c', sky1: '#141b26', horizonGlow: 'rgba(170,180,200,0.12)' },
  mood: { drone: 0.08, wind: 0.02, rain: 0.02, pitch: 48 },
  rain: true,
  dark: false,
  rows: [
    "............................................................................................................................................",
    "............................................................................................................................................",
    "............................................................................................................................................",
    "............................................................................................................................................",
    "............................................................................................................................................",
    "............................................................................................................................................",
    "............................................................................................................................################",
    "............................................................................................................................################",
    "............................................................................................................................################",
    "............................................................................................................................################",
    "............................................................................................................................################",
    "............................................................................................................................################",
    "............................................................................................................................################",
    "............................................................................................................................################",
    ".............................................................................###################################............################",
    ".............................................................................###################################............################",
    ".............................................................................###################################............################",
    "............................................................##..............................................................################",
    "............................................................##..............................................................################",
    ".....GGGGG....GGGGGG.....GGGGGG.....GGGGGGG.................##...................................###############............################",
    "############################################################################################################################################",
    "############################################################################################################################################",
    "############################################################################################################################################",
    "############################################################################################################################################",
  ],
  playerStart: [3, 19],
  entities: [
    { t: 'hint', x: 16, y: 16, text: '↓' },          // crouch in the grass to hide from the beam
    { t: 'hint', x: 81, y: 18, text: 'X' },          // the box: push it into the beam as a moving shadow
    { t: 'hint', x: 86, y: 18, text: '↓' },          // crouch fully behind the box (standing leaves the head lit)
    // LIGHT 1 — wide slow sweep over the whole yard
    { t: 'light', x: 28, y: 3, a0: 0.88, a1: 2.18, speed: 0.13, len: 22, fov: 0.34 },
    { t: 'check', x: 48, y: 18, idx: 0 },            // past the yard, safe
    // LIGHT 2 — steep downward sweep of the strip in front of the mantle wall
    { t: 'light', x: 54, y: 3, a0: 1.32, a1: 1.82, speed: 0.2, len: 16, fov: 0.30 },
    // LIGHT 3 — the roofed gate-house (cols 77-111). Stage A: box shadow → lever.
    { t: 'box', x: 81, y: 19 },                       // the shield (waits left of the lit zone)
    { t: 'lever', x: 86, y: 19, id: 'g3', on: false },
    { t: 'door', x: 96, y: 17, h: 3, links: ['g3'], latch: true },   // gate, floor-to-ceiling
    { t: 'light', x: 94, y: 17, a0: 2.851, a1: 2.991, speed: 0.14, len: 12, fov: 0.30 },  // 3a, trained on lever
    { t: 'check', x: 98, y: 17, idx: 1 },            // up the step, past the gate (stage A done)
    // Stage B: a raised floor (1-tile step at 96->97) the box can't be pushed up,
    // so this beam can't be box-shielded — it's a forced solo timed dash.
    { t: 'light', x: 104, y: 17, a0: 0.45, a1: 2.69, speed: 0.11, len: 9, fov: 0.85 },
    { t: 'exit', x: 121, y: 16, w: 2, h: 4 },        // into the facility
  ],
});

// -- Ch.3 — THE YARD ---------------------------------------------
// First interior chapter; the BOX / PLATE / LIFT / BRAKE teaching ground. No
// lethal hazards (gentle, like Ch.1) — R always resets the chapter if a box is
// wedged. Left to right, three rooms, each escalating one idea (see
// dev/CH3_REWORK.md for the design + the hard lift-physics constraints):
//   ROOM A — plates. A gate (door col 31, `all` of two plates, latched) needs
//     BOTH plate pa1 (20-21) and pa2 (25-26) pressed at once. You only weigh
//     enough for one: push the box (16) onto pa1, hop over it, stand on pa2 ->
//     the gate latches. (Teaches: plates = weight, a box can stand in for you,
//     `all` needs both, a latch only has to trigger once.) | checkpoint 0 (34).
//   ROOM B — counterweight lift (the BASIC lift). Push the box (39) onto
//     platform A (42-43); it sinks into its 2-deep pit and raises the far
//     platform B (48-50) to row 18, where the box's weight HOLDS it (position
//     is state). Hop the air gap (47) from the divider (44-46) onto the held B
//     — you + the box now balance the lift, so B stays put while you mantle the
//     exit ledge (51-57, 4-tile face, row 16). The box can't reach the ledge
//     face (pit B blocks it), so the lift is genuinely required. Step down the
//     stairs into Room C. | checkpoint 1 (63, Room-C entrance).
//   ROOM C — THE CRANE (the lift BRAKE: `lift.lock`, a lever that freezes a
//     platform regardless of weight). Push the crate (65) onto platform A
//     (70-71); its weight cranks platform B (76-78) up from the floor toward
//     its top clamp at row 17. But a ceiling girder (row 15, cols 75-76) caps
//     your jump so B at the clamp is UN-mountable — you must operate the BRAKE
//     lever brkC (73; hands free because the crate, not your body, drives) to
//     freeze B at a mountable MID height (row 18-19) as it rises, then hop onto
//     it and mantle the exit ledge (79-84, row 16). The clamp overshoots
//     uselessly; only a braked mid height bridges. Stairs down to the exit.
//     (Why Room B is a plain counterweight lift, not a brake puzzle: a body-
//     raised platform "empty-holds" on its own and a climber pogos rather than
//     loads it, so the brake can't be made necessary without a persistent
//     counterweight — see dev/CH3_REWORK.md §"empty holds".)
//   All geometry, solvability and the no-bypass / no-softlock properties are
//   asserted in dev/ch3.js — tweak there if you move a fixture. Rows were built
//   with a throwaway column-range generator (deleted) — regenerate that way if
//   you re-author; never hand-count the 95-char rows.
LEVELS.push({
  name: 'THE YARD',
  bg: 'interior',
  seed: 103,
  palette: { sky0: '#070a0e', sky1: '#121821', horizonGlow: 'rgba(140,150,170,0.07)' },
  mood: { drone: 0.07, wind: 0.012, rain: 0.0, pitch: 46 },
  rain: false,
  dark: false,
  rows: [
    "...............................................................................................",
    "...............................................................................................",
    "...............................................................................................",
    "...............................................................................................",
    "...............................................................................................",
    "...............................................................................................",
    "...............................#...............................................................",
    "...............................#...............................................................",
    "...............................#...............................................................",
    "...............................#...............................................................",
    "...............................#...............................................................",
    "...............................#...............................................................",
    "...............................#...............................................................",
    "...............................#...............................................................",
    "...............................#...............................................................",
    "...............................#...........................................##..................",
    "...............................#...................#######.....................######..........",
    "...................................................########....................#######.........",
    "...................................................#########...................########........",
    "...................................................##########..................#########.......",
    "##########################################..###....###################..###....################",
    "##########################################..###....###################..###....################",
    "######################################################################..#######################",
    "###############################################################################################",
  ],
  playerStart: [3, 19],
  entities: [
    { t: 'hint', x: 13, y: 18, text: 'X' },           // push the box onto the plate
    // ROOM A — two-plate latched gate (`all`)
    { t: 'box', x: 16, y: 19 },                        // push onto pa1
    { t: 'plate', x: 20, y: 19, w: 2, id: 'pa1' },
    { t: 'plate', x: 25, y: 19, w: 2, id: 'pa2' },
    { t: 'door', x: 31, y: 17, h: 3, links: ['pa1', 'pa2'], mode: 'all', latch: true },
    { t: 'check', x: 34, y: 18, idx: 0 },              // just past the gate
    // ROOM B — counterweight lift: the box on A raises + HOLDS B; board it
    { t: 'box', x: 39, y: 19 },                        // push onto platform A -> raises B
    { t: 'lift', ax: 42, ay: 20, bx: 48, by: 20, aw: 2, bw: 3, travel: 2 },
    { t: 'check', x: 63, y: 18, idx: 1 },              // Room-C entrance (Room B done)
    // ROOM C — THE CRANE: crate drives B up, brake it at a mid height to bridge
    { t: 'box', x: 65, y: 19 },                        // crate — push onto platform A
    { t: 'lift', ax: 70, ay: 20, bx: 76, by: 20, aw: 2, bw: 3, travel: 3, lock: 'brkC' },
    { t: 'lever', x: 73, y: 19, id: 'brkC' },          // the brake handle (crane operator)
    { t: 'exit', x: 90, y: 19, w: 2, h: 4 },           // past the exit ledge, down the stairs
  ],
});

// -- Ch.4 — THE DRAINS -------------------------------------------
// First WATER chapter: teaches swimming, the jump-out-near-surface window, and
// the BREATH timer (~9 s submerged, the view closes to a porthole, then you
// drown). Dim interior cistern. Walk/through-line is row 12. Four rooms, each
// one idea, escalating (see dev/DESIGN.md Ch.4 + the geometry was built with a
// throwaway column generator — never hand-count the 150-char rows):
//   ROOM A — THE POOL (cols 0-30). Walk off the start deck into a deep OPEN
//     pool (surface row 12, always surfaceable -> no drowning), swim across and
//     down, and jump out onto the flush far bank. Pure swim + jump-out teach.
//     | checkpoint 0 (27, the far bank).
//   ROOM B — THE FLOODED CORRIDOR (cols 31-84). A submerged tunnel under a
//     5-tile roof (rows 8-12): you swim it head-underwater (breath drains),
//     surfacing at four air-pocket chimneys (cols 40-41, 52-53, 64-65, 76-77)
//     that vent to the surface. The exit chimney (82-84) up to the Room-C ledge
//     is sealed by a GRATE (door gB, col 81). The grate's latch lever (gB) is
//     SUNK on the corridor floor far to the left (col 58, row 20): you can't
//     just rush the exit — dive to the lever (a managed breath-leg), pull it
//     (the grate latches open), then route back through the chimneys to the now-
//     open exit shaft and rise to the ledge. The plan (which pockets chain to
//     the lever and back to the exit on one breath) is the puzzle. | checkpoint
//     1 (88, the Room-C ledge, past the grate).
//   ROOM C — THE RAFT (cols 85-114). A box waits on the dry ledge (96); a high
//     pipe ledge (cols 102-114, top row 9) is the only way on, but it's 3 tiles
//     above the pool surface — too high to jump out of the water onto, and you
//     can't mantle FROM water. Push the box into the narrow pool (100-101); it
//     floats as a raft; climb onto it and mantle the pipe from there (the box's
//     +1 tile is exactly what bridges it). | checkpoint 2 (108, the pipe ledge).
//   ROOM D — THE CISTERN (cols 115-148). Drop off the pipe ledge into a deep
//     cistern. The exit is a flush ledge on the right (143-148) but its gate
//     (door gD, col 144) is shut. Its latch lever (gD) is sunk in a pocket
//     (cols 123-128, row 20) capped by a guard GRATE (the lid, row 18) so you
//     can't drop straight onto it — descend beside it and swim in along the
//     floor. Pull it (the exit gate latches open), surface, jump out onto the
//     ledge, walk through the gate to the exit. Climb out of the drains.
//   Every beat, the breath budget, and the no-bypass properties (grate shut
//   until its lever; pipe unreachable without the raft; lever pocket unreachable
//   straight-down) are asserted in dev/ch4.js — tweak there if you move a
//   fixture. Checkpoints sit on every dry "surface chamber" (death-reset safe:
//   each is past a finished/latched stretch).
LEVELS.push({
  name: 'THE DRAINS',
  bg: 'interior',
  seed: 104,
  palette: { sky0: '#04060a', sky1: '#0c121b', horizonGlow: 'rgba(90,120,140,0.06)' },
  mood: { drone: 0.09, wind: 0.0, rain: 0.0, pitch: 42 },
  rain: false,
  dark: false,
  rows: [
    ".....................................................................................................................................................#",
    ".....................................................................................................................................................#",
    ".....................................................................................................................................................#",
    ".....................................................................................................................................................#",
    ".....................................................................................................................................................#",
    ".....................................................................................................................................................#",
    ".....................................................................................................................................................#",
    ".....................................................................................................................................................#",
    "..................................######..##########..##########..##########..####...................................................................#",
    "..................................######..##########..##########..##########..####....................#############..................................#",
    "..................................######..##########..##########..##########..####....................#############..................................#",
    "..................................######..##########..##########..##########..####....................#############..................................#",
    "########~~~~~~~~~~~~~~~~~######...######..##########..##########..##########..####~~~###############~~#############~~~~~~~~~~~~~~~~~~~~~~~~~~~~#######",
    "########~~~~~~~~~~~~~~~~~######~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~###############~~#############~~~~~~~~~~~~~~~~~~~~~~~~~~~~#######",
    "########~~~~~~~~~~~~~~~~~######~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~###############~~#############~~~~~~~~~~~~~~~~~~~~~~~~~~~~#######",
    "########~~~~~~~~~~~~~~~~~######~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~###############~~#############~~~~~~~~~~~~~~~~~~~~~~~~~~~~#######",
    "########~~~~~~~~~~~~~~~~~######~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~###############~~#############~~~~~~~~~~~~~~~~~~~~~~~~~~~~#######",
    "########~~~~~~~~~~~~~~~~~######~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~###############~~#############~~~~~~~~~~~~~~~~~~~~~~~~~~~~#######",
    "########~~~~~~~~~~~~~~~~~######~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~###############~~#############~~~~~~~########~~~~~~~~~~~~~#######",
    "###############################~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~###############~~#############~~~~~~~~~~~~~~~~~~~~~~~~~~~~#######",
    "###############################~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~###############~~#############~~~~~~~~~~~~~~~~~~~~~~~~~~~~#######",
    "######################################################################################################################################################",
    "######################################################################################################################################################",
    "######################################################################################################################################################",
  ],
  playerStart: [3, 11],
  entities: [
    { t: 'hint', x: 14, y: 14, text: '↑' },            // swim up / jump out of the pool
    // ROOM A — open pool (no entities, just the swim + the checkpoint)
    { t: 'check', x: 27, y: 10, idx: 0 },              // the far bank, past the pool
    // ROOM B — flooded corridor: sunken lever opens the exit grate
    { t: 'hint', x: 58, y: 17, text: 'X' },            // the sunken grate lever
    { t: 'lever', x: 58, y: 20, id: 'gB' },            // on the corridor floor (dive to it)
    { t: 'door', x: 81, y: 13, h: 8, links: ['gB'], latch: true },   // exit grate
    { t: 'check', x: 88, y: 10, idx: 1 },              // the Room-C ledge, past the grate
    // ROOM C — float the box as a raft to reach the high pipe ledge
    { t: 'box', x: 96, y: 11 },                        // push into the pool -> raft
    { t: 'check', x: 108, y: 7, idx: 2 },              // the pipe ledge, past the raft
    // ROOM D — sunken lever (gD) under a guard grate opens the exit gate
    { t: 'lever', x: 125, y: 20, id: 'gD' },           // in the pocket under the lid
    { t: 'door', x: 144, y: 8, h: 4, links: ['gD'], latch: true },   // exit gate (on the ledge)
    { t: 'exit', x: 146, y: 8, w: 2, h: 4 },           // climb out of the drains
  ],
});

// -- Ch.5 — THE HUSKS ---------------------------------------------
// First HELM chapter: connect at a helm (X) and the husks of its group
// mirror your movement; disconnect and they freeze. The PLAYER walks a
// continuous one-way walkway (rows 12-13); each room's husks are sealed
// in a pit below it (open rows 14-19, floor row 20) that the player can
// see through a '-' window but never reach, so a husk pressing a plate
// down in the pit is the only way to open the player's gate above. Three
// escalating rooms (172x24, seed 105; every beat + no-bypass property is
// asserted in dev/ch5.js — rows were built with a throwaway column generator
// (dev/_gen_ch5.js, since deleted; regenerate that way if re-authoring, never
// hand-count the 172-char rows):
//   ROOM A — one husk: drive it onto its plate (pA) to latch your gate.
//     | checkpoint 0 (past gate A).
//   ROOM B — two husks, two plates, gate B needs BOTH at once (all). One
//     plate is on a 2-tile step a husk can only reach by jumping; the
//     other is on the floor. Both husks mirror you, so you must DESYNC:
//     jump the lead husk up onto the step while the trailing husk is
//     still on open floor, then walk both onto their plates. | checkpoint 1.
//   ROOM C — three husks, a 3-tile gap. All mirror you, but only the lead
//     husk has the runway to clear the gap on a timed jump and reach the
//     far plate (pC); the others fall into the gap (safe — a 3-tile wall
//     mantles back to the runway; the far side's wall is 4 tiles, no
//     fall-up bypass). | checkpoint 2 → exit.
LEVELS.push({
  name: 'THE HUSKS',
  bg: 'interior',
  seed: 105,
  palette: { sky0: '#06090e', sky1: '#10161f', horizonGlow: 'rgba(150,140,120,0.07)' },
  mood: { drone: 0.08, wind: 0.01, rain: 0.0, pitch: 44 },
  rain: false,
  dark: false,
  rows: [
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "#########---------------------#####################---------------------------------------##############------------------------------------------------####################",
    "#########.....................#####################.......................................##############................................................####################",
    "#########.....................#####################............................#..........##############................................................####################",
    "#########.....................#####################............................#..........##############................................................####################",
    "#########.....................#####################............................#..........##############................................................####################",
    "#########.....................#####################............................#..........##############................................................####################",
    "#########.....................#####################.................############..........##############................................................####################",
    "#########.....................#####################.................############..........##############................................................####################",
    "##########################################################################################################################...###############################################",
    "##########################################################################################################################...###############################################",
    "##########################################################################################################################...###############################################",
    "############################################################################################################################################################################",
  ],
  playerStart: [2, 11],
  entities: [
    { t: 'hint', x: 4, y: 10, text: '←  →' },
    // ROOM A — one husk: drive it onto the plate to open your gate
    { t: 'hint', x: 19, y: 9, text: 'X' },
    { t: 'husk', x: 13, y: 19, group: 'a' },
    { t: 'plate', x: 23, y: 19, w: 2, id: 'pA' },
    { t: 'helm', x: 19, y: 10, group: 'a' },
    { t: 'door', x: 38, y: 6, h: 6, links: ['pA'], latch: true },
    { t: 'check', x: 42, y: 10, idx: 0 },
    // ROOM B — two husks, two plates (one on the step): desync with a jump
    { t: 'hint', x: 59, y: 9, text: 'X' },
    { t: 'husk', x: 55, y: 19, group: 'b' },
    { t: 'husk', x: 62, y: 19, group: 'b' },
    { t: 'plate', x: 66, y: 19, w: 2, id: 'pB1' },
    { t: 'plate', x: 77, y: 17, w: 2, id: 'pB2' },
    { t: 'helm', x: 59, y: 10, group: 'b' },
    { t: 'door', x: 94, y: 6, h: 6, links: ['pB1', 'pB2'], mode: 'all', latch: true },
    { t: 'check', x: 96, y: 10, idx: 1 },
    // ROOM C — three husks, a gap: only the one with runway clears it
    { t: 'hint', x: 110, y: 9, text: 'X' },
    { t: 'husk', x: 116, y: 19, group: 'c' },
    { t: 'husk', x: 110, y: 19, group: 'c' },
    { t: 'husk', x: 107, y: 19, group: 'c' },
    { t: 'plate', x: 150, y: 19, w: 2, id: 'pC' },
    { t: 'helm', x: 110, y: 10, group: 'c' },
    { t: 'door', x: 158, y: 6, h: 6, links: ['pC'], latch: true },
    { t: 'check', x: 160, y: 10, idx: 2 },
    { t: 'exit', x: 164, y: 8, w: 2, h: 4 },
  ],
});
