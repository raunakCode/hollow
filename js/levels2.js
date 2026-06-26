// ---------------------------------------------------------------
// HOLLOW - levels2.js : chapters 5-8
// Built in tasks T10-T13. This stub exists so index.html's script
// tag resolves; chapter defs get pushed onto LEVELS here.
// ---------------------------------------------------------------
'use strict';

// ===============================================================
// CHAPTER 6 — THE MACHINES  (LEVELS[5])
// The synthesis: husks x lights x lifts x timed plates. No new engine
// feature — every mechanic already shipped (Ch.2 lights, Ch.3 lift, Ch.5
// helms/husks, T5 plate hold). The chapter rests on the husk/light asymmetry:
// a husk walks a lethal beam unharmed; the player dies in it.
//   ROOM A — THE BEAM CORRIDOR: drive a husk through a player-lethal searchlight
//     (husks are immune) onto a plate that latches the player's walkway gate.
//   ROOM B — THE RELAY: a timed plate (hold:4) is a husk self-gated run, and a
//     4-tile one-way drop forces a SECOND helm (B2) to re-drive the same husk.
//   ROOM C — THE COUNTERWEIGHT: a husk driven onto a lift platform raises the
//     far platform to bridge a 4-tile exit, plus a ground beam-dash for the
//     player (husk immune, player not). Finale combines husk + light + lift.
// No hint entities (hints are Ch.1-5 only; the player is experienced).
// 210x24, seed 106, interior. Map authored with dev/_gen_ch6.js (deleted).
// ===============================================================
LEVELS.push({
  name: 'THE MACHINES',
  bg: 'interior',
  seed: 106,
  palette: { sky0: '#06090e', sky1: '#10161f', horizonGlow: 'rgba(150,140,120,0.07)' },
  mood: { drone: 0.08, wind: 0.01, rain: 0.0, pitch: 44 },
  rain: false,
  dark: false,
  rows: [
    "..................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................",
    "############----------------------------------##############----------------------#...............................................................................................................................",
    "############..................................##############......................#...............................................................................................................................",
    "############..................................##############......................#...............................................................................................................................",
    "############..................................##############......................#...............................................................................................................................",
    "############..................................##############......................##################-----------------############...........................##########............................................",
    "############..................................##############........................................................#############...........................##########............................................",
    "############..................................##############........................................................#############...........................##########............................................",
    "############..................................##############........................................................#############...........................##########............................................",
    "####################################################################################################################################################..###...######################################################",
    "####################################################################################################################################################..###...######################################################",
    "####################################################################################################################################################..###...######################################################",
    "##################################################################################################################################################################################################################",
  ],
  playerStart: [3, 11],
  entities: [
    // ---- ROOM A — THE BEAM CORRIDOR (cols 0-56) ----
    // Player on the row-12 walkway; the lone husk is sealed in lane A below
    // (seen through '-' windows). A searchlight sweeps the lane = visibly lethal,
    // but the husk is immune. Drive it through the beam onto pA -> the walkway
    // gate d_a1 latches. New idea, taught by contrast: lights ignore husks.
    { t: 'husk', x: 13, y: 19, group: 'a' },
    { t: 'helm', x: 18, y: 10, group: 'a' },
    { t: 'light', x: 30, y: 14, a0: 0.30, a1: 0.95, speed: 0.16, len: 12, fov: 0.5 },
    { t: 'plate', x: 42, y: 19, w: 2, id: 'pA' },
    { t: 'door', x: 50, y: 6, h: 6, links: ['pA'], latch: true },     // d_a1 walkway gate
    { t: 'check', x: 54, y: 10, idx: 0 },
    // ---- ROOM B — THE RELAY (cols 57-129) ----
    // Two tiers for the player; one husk lane below both. pB1 has hold:4.
    { t: 'husk', x: 61, y: 19, group: 'b' },
    { t: 'helm', x: 64, y: 10, group: 'b' },                          // B1 (tier 1)
    { t: 'plate', x: 72, y: 19, w: 2, id: 'pB1', hold: 4 },
    { t: 'door', x: 80, y: 17, h: 3, links: ['pB1'] },                // d_b1 lane gate (NOT latch);
    // short, husk-height gate (rows 17-19): closes fast enough that with hold:0 it
    // slams before the husk crosses (hold>0 is what lets the husk beat it).
    { t: 'door', x: 82, y: 6, h: 6, links: ['pB1'] },                 // d_bw1 walkway gate (NOT latch)
    // Stage 1: drive husk onto pB1 -> d_bw1 + d_b1 open; disconnect (husk parks,
    // both hold), player walks through d_bw1 and DROPS 4 tiles to tier 2. The
    // col-82 face (#, rows 12-15) is un-mantleable (>3.2 tiles) -> B2 is forced.
    { t: 'helm', x: 88, y: 14, group: 'b' },                          // B2 (tier 2, on row-16 floor)
    { t: 'plate', x: 110, y: 19, w: 2, id: 'pB2' },
    { t: 'door', x: 120, y: 10, h: 6, links: ['pB2'], latch: true },  // d_b2 exit gate (blocks tier-2 row 16)
    // Stage 2: at B2 reconnect, drive husk RIGHT off pB1. hold:4 keeps d_b1 open
    // long enough for the husk to clear it (col 72->78, ~0.6s) then reach pB2,
    // which latches d_b2. hold>0 is NECESSARY (hold:0 slams d_b1 onto the husk).
    { t: 'check', x: 124, y: 14, idx: 1 },
    // ---- ROOM C — THE COUNTERWEIGHT (cols 130-209) FINALE ----
    // Player drops the chute (cols 129-131) from tier 2 to ground row 20. Drive
    // the husk onto platform A -> A sinks into the pit, B rises to row 18 and
    // holds. Disconnect (parked husk holds B up). Time a dash across the ground
    // beam (player not immune), jump onto raised B, mantle the row-16 plateau,
    // exit. No-bypass: plateau from ground = 4 tiles (>102px, fail); from raised
    // B = 2 tiles (ok) -> the husk-raise is required.
    { t: 'check', x: 132, y: 18, idx: 2 },   // Room C entrance, past latched d_b2 (death-reset safe)
    { t: 'helm', x: 136, y: 18, group: 'c' },
    { t: 'husk', x: 140, y: 19, group: 'c' },
    { t: 'lift', ax: 148, ay: 20, bx: 153, by: 20, aw: 2, bw: 3, travel: 2 },
    { t: 'light', x: 151, y: 18, a0: 2.45, a1: 3.55, speed: 0.13, len: 13, fov: 0.5 },
    { t: 'exit', x: 162, y: 12, w: 2, h: 4 },
  ],
});

// ===============================================================
// CHAPTER 7 — THE DEEP  (LEVELS[6])
// The darkness + Listener chapter (cavern bg, dark mask on). The whole
// chapter is RED-LIGHT / GREEN-LIGHT: the Listener cycles dormant (eye dark)
// -> waking (0.8s growl warning) -> alert (eye GLOWS). While the eye is open,
// any movement near it triggers a lethal charge; standing still is always safe.
// In the dark the only light is the player's glow + the Listeners' open eyes
// (eye-glow punches holes in the darkness mask — see game.js drawPlay).
//   ROOM A — THE FIRST EYE: one Listener astride the path; learn the growl tell.
//   ROOM B — THE TWO: two Listeners with overlapping danger zones on independent
//     cycles; grass tufts mark rest spots (flavor — stillness is what saves you).
//   ROOM C — THE FLOODED HOLLOW: a submerged crossing. You can't freeze in open
//     water (an idle swimmer SINKS ~170px/s = "noisy"), so stillness = standing
//     still on the pool FLOOR (grounded) while the eye is open; move when it shuts.
//   ROOM D — THE COLLAPSE (finale): a scripted chase. Entering wakes the Listener
//     (growl + glowing eye behind you); stepping the plate opens the EXIT DOOR
//     (which descends) AND lunges the Listener — slide under the door before it
//     seals; dawdling at the plate gets you swept. Exit -> title (last built ch.).
// 226x24, seed 107, cavern, dark, no hints. Map authored with dev/_gen_ch7.js
// (deleted). Two DESIGN deviations (recorded): Room C's "float motionless" is a
// floor-stand freeze (idle treading isn't possible — you sink too fast to be
// still); Room D's "closing door" is the top-anchored exit door descending as a
// plate-hold expires (our doors close top-down = a descending shutter).
// ===============================================================
LEVELS.push({
  name: 'THE DEEP',
  bg: 'cavern',
  seed: 107,
  palette: { sky0: '#04060a', sky1: '#080c12', horizonGlow: 'rgba(120,150,180,0.05)' },
  mood: { drone: 0.11, wind: 0.015, rain: 0.0, pitch: 38 },
  rain: false,
  dark: true,
  rows: [
    "##################################################################################################################################################################################################################################",
    "##################################################################################################################################################################################################################################",
    "##################################################################################################################################################################################################################################",
    "..................................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................................",
    "..................................................................................................................................................................................................................................",
    "........................................................................................................................~~~~~~~~~~~...............................................................................................",
    "........................................................................................................................~~~~~~~~~~~...............................................................................................",
    "........................................................................................................................~~~~~~~~~~~...............................................................................................",
    "..........................................................G.............G...........G...................................~~~~~~~~~~~...............................................................................................",
    "##################################################################################################################################################################################################################################",
    "##################################################################################################################################################################################################################################",
    "##################################################################################################################################################################################################################################",
    "##################################################################################################################################################################################################################################",
    "##################################################################################################################################################################################################################################",
    "##################################################################################################################################################################################################################################",
  ],
  playerStart: [3, 17],
  entities: [
    // ---- ROOM A — THE FIRST EYE (cols 0-48) ----
    // A single Listener astride the flat path. Cross by timing its eye: move while
    // it's dormant, FREEZE on the growl/glowing eye, continue when it shuts. The
    // creature body isn't solid (you walk through/past it); only the charge kills.
    { t: 'check', x: 4, y: 16, idx: 0 },                 // spawn
    { t: 'creature', x: 30, y: 17, range: 14 },          // creatures[0]
    { t: 'check', x: 44, y: 16, idx: 1 },                // past Room A
    // ---- ROOM B — THE TWO (cols 48-112) ----
    // Two Listeners 12 tiles apart with OVERLAPPING danger zones (cols ~54-90),
    // on independent (per-creature seeded) cycles, so the "both eyes shut" windows
    // are short and irregular. Stop-and-go: freeze whenever EITHER eye opens.
    // Grass tufts (cols 58/72/84) are rest markers only — stillness saves you.
    { t: 'creature', x: 66, y: 17, range: 12 },          // creatures[1]
    { t: 'creature', x: 78, y: 17, range: 12 },          // creatures[2]
    { t: 'check', x: 96, y: 16, idx: 2 },                // past Room B
    // ---- ROOM C — THE FLOODED HOLLOW (cols 112-138) ----
    // A short flooded crossing (water rows 14-17 over the solid floor, cols
    // 120-130). You bottom-walk it submerged; you can't freeze in open water
    // (idle = sinking = "noisy"), so the safe freeze is standing STILL on the
    // floor while the submerged Listener's eye is open. Breath stays generous
    // (short pool + open air above to surface in a green window).
    { t: 'check', x: 116, y: 16, idx: 3 },               // dry, before the pool
    { t: 'creature', x: 126, y: 17, range: 10 },         // creatures[3] (submerged)
    // ---- ROOM D — THE COLLAPSE (cols 138-226) FINALE ----
    // Scripted chase. Entering the corridor WAKES the chaser (growl + glowing eye
    // behind you, no lunge). Sprint to plate pD: stepping it opens the exit door
    // dD (which then DESCENDS as the hold expires) AND lunges the chaser at the
    // plate. Slide under dD before it seals; dawdling at pD = swept. Exit -> title.
    { t: 'check', x: 150, y: 16, idx: 4 },               // finale entrance (past the pool)
    { t: 'creature', x: 150, y: 17, range: 4 },          // creatures[4] — the chaser (tiny
    // natural range so ONLY the scripted triggers drive it; the entry growl +
    // glowing eye still fire — trigger 'wake' calls them directly)
    { t: 'trigger', x: 162, y: 13, w: 2, h: 6, target: 4, action: 'wake' },   // entry growl/tell
    { t: 'plate', x: 188, y: 17, w: 2, id: 'pD', hold: 1.1 },
    { t: 'trigger', x: 188, y: 13, w: 2, h: 6, target: 4, action: 'charge' }, // lunge on commit
    { t: 'door', x: 200, y: 14, h: 4, links: ['pD'] },   // dD exit door (NOT latch: it must close)
    { t: 'exit', x: 210, y: 15, w: 2, h: 4 },
  ],
});

// ===============================================================
// CHAPTER 8 — THE CORE  (LEVELS[7]) — the gauntlet + the ending
// The last chapter: a short victory-lap gauntlet recombining shipped mechanics,
// leading into the Core chamber and the ending cinematic (the one new engine
// feature — see game.js updateEnding). Flat interior floor (rows 19-23), warm
// glow building toward the Core. 170x24, seed 108. No hints.
//   ROOM A — THE GLARE: two searchlights guard a roofed strip (can't be jumped
//     over). Push the box through as a rolling shadow-shield onto plate pA,
//     which latches the exit gate d_a (lights + box + plate).
//   ROOM B — THE HOLLOW: a husk SEALED in a basement under the main floor (the
//     player can't get in, the husk can't get out). Connect at the helm, drive
//     the husk onto pB to latch the player's gate d_b (husk + helm; the camera
//     drops to the basement on connect). See DESIGN deviation 1.
//   ROOM C — THE STILLNESS: a Listener that HEARS HUSKS (new: hearsHusks). Drive
//     the husk past the open eye, freezing it whenever the eye opens (a moving
//     husk is lunged at and killed), onto pC -> exit gate d_c latches. Then
//     disconnect and cross yourself, freezing on the eye (mirrored stillness).
//   THE CORE: walk into the glowing mass -> control flips. The player and the
//     husk crowd walk in unison to the far wall, push it open, warm whiteout,
//     title card, credits, back to the title. (No 'exit' entity — the Core is
//     the terminus; the ending clears the save.)
// Map authored with dev/_gen_ch8.js (deleted). Validated by dev/ch8.js.
// ===============================================================
LEVELS.push({
  name: 'THE CORE',
  bg: 'interior',
  seed: 108,
  palette: { sky0: '#0a0a0c', sky1: '#181410', horizonGlow: 'rgba(210,150,90,0.06)' },
  mood: { drone: 0.10, wind: 0.01, rain: 0.0, pitch: 46 },
  rain: false,
  dark: false,
  playerGlow: true,   // faint presence halo so the figure reads on the dark interior ground
  rows: [
    "..........................................................................................................................................................................",
    "..........................................................................................................................................................................",
    "..........................................................................................................................................................................",
    "#........................................................................................................................................................................#",
    "#........................................................................................................................................................................#",
    "#........................................................................................................................................................................#",
    "#........................................................................................................................................................................#",
    "#........................................................................................................................................................................#",
    "#........................................................................................................................................................................#",
    "#........................................................................................................................................................................#",
    "#........................................................................................................................................................................#",
    "#........................................................................................................................................................................#",
    "#........................................................................................................................................................................#",
    "#...........######################.......................................................................................................................................#",
    "#...........######################.......................................................................................................................................#",
    "#...........######################.......................................................................................................................................#",
    "#........................................................................................................................................................................#",
    "#........................................................................................................................................................................#",
    "#........................................................................................................................................................................#",
    "##########################################################################################################################################################################",
    "########################################################...........#######################################################################################################",
    "########################################################...........#######################################################################################################",
    "########################################################...........#######################################################################################################",
    "##########################################################################################################################################################################",
  ],
  playerStart: [3, 18],
  entities: [
    // ---- ROOM A — THE GLARE (cols 1-44) ----
    // Two searchlights sweep a roofed strip (rows 13-15 over cols 12-33) -> a
    // beam can't be jumped over. Push the box (rolling shadow) through onto pA;
    // pA latches the floor-to-roof gate d_a. The box is required: the two sweeps
    // overlap so there's no clean run window across the strip.
    { t: 'box', x: 7, y: 18 },
    { t: 'light', x: 18, y: 16, a0: 0.55, a1: 1.20, speed: 0.17, len: 9, fov: 0.5 },
    { t: 'light', x: 30, y: 16, a0: 1.95, a1: 2.60, speed: 0.14, len: 9, fov: 0.5 },
    { t: 'plate', x: 35, y: 18, w: 2, id: 'pA' },
    { t: 'door', x: 39, y: 13, h: 6, links: ['pA'], latch: true },     // d_a exit gate
    { t: 'check', x: 42, y: 17, idx: 0 },
    // ---- ROOM B — THE HOLLOW (cols 45-72) ----
    // A husk sealed in a basement UNDER the main floor (rows 20-22, cols 56-66;
    // solid roof at row 19, sub-floor row 23). The player walks the floor above
    // it and can never get in; the husk can never get out — so connecting at the
    // helm and driving it onto pB (which latches the player's gate d_b) is the
    // only way through. The camera drops to the husk on connect (the reveal).
    // (Desync was taught in full in Ch.5 and the husk/beam asymmetry in Ch.6 —
    // see the DESIGN deviation; the gauntlet's new beat is Room C.)
    { t: 'helm', x: 49, y: 16, group: 'b' },
    { t: 'husk', x: 58, y: 22, group: 'b' },          // in the sealed basement
    { t: 'plate', x: 61, y: 22, w: 2, id: 'pB' },      // on the basement sub-floor
    { t: 'door', x: 70, y: 13, h: 6, links: ['pB'], latch: true },     // d_b exit gate (main floor)
    { t: 'check', x: 73, y: 17, idx: 1 },
    // ---- ROOM C — THE STILLNESS (cols 74-128) ----
    // A Listener that hears husks. Drive the husk past its open eye (freeze when
    // it opens) onto pC -> d_c latches. Then disconnect and cross yourself,
    // freezing on the eye. Mirrored stillness: the husk must hold still too.
    { t: 'helm', x: 80, y: 16, group: 'c' },
    { t: 'husk', x: 84, y: 18, group: 'c' },
    { t: 'creature', x: 100, y: 18, range: 12, hearsHusks: true },
    { t: 'plate', x: 118, y: 18, w: 2, id: 'pC' },
    { t: 'door', x: 122, y: 13, h: 6, links: ['pC'], latch: true },    // d_c exit gate
    { t: 'check', x: 125, y: 17, idx: 2 },
    // ---- THE CORE (cols 129-168) — the ending ----
    { t: 'check', x: 132, y: 17, idx: 3 },        // Core-chamber entrance (last save)
    { t: 'core', x: 140, y: 14, w: 3, h: 5 },     // the glowing mass (ending trigger)
    { t: 'husk', x: 145, y: 18, group: 'core' },  // the silent crowd (no helm drives
    { t: 'husk', x: 147, y: 18, group: 'core' },  // them in play; the ending walks them)
    { t: 'husk', x: 149, y: 18, group: 'core' },
    { t: 'husk', x: 151, y: 18, group: 'core' },
    { t: 'husk', x: 153, y: 18, group: 'core' },
    { t: 'door', x: 160, y: 13, h: 6, links: ['_wall'] },  // the wall they push open
  ],
});
