# CH6 — THE MACHINES: build plan (designed session 16, NOT yet built)

T11. Ch.6 goes in **`js/levels2.js`** (currently a stub) as **`LEVELS[5]`**.
Synthesis chapter: **husks × lights × lifts × timed plates** — every mechanic
already exists in the engine. No new engine feature is needed. Verified the
wiring this session (entities.js / game.js / player.js); the constraints below
are real and drove the design.

`name:'THE MACHINES'`, `bg:'interior'`, `seed:106`, `rain:false`, `dark:false`.
Palette/mood: copy Ch.3/Ch.5 interior values. **No hint entities** (DESIGN: hints
are ch.1–5 only; the player is experienced).

Map is **210 wide × 24 rows**. Build the rows with a throwaway generator
`dev/_gen_ch6.js` (like prior chapters) — never hand-count 210-char strings —
then paste into levels2.js and delete the generator. Validate every beat by
driving the engine in a new `dev/ch6.js` harness (mirror `dev/ch5.js`'s bootstrap;
it loads levels1+levels2 and calls `loadChapter(5)`).

## Engine facts that constrain the design (confirmed this session)

- **Lights ignore husks** — `updateLights` only tests the player; husks are
  never detected and are **not** light occluders (occlusion checks tiles/boxes/
  closed doors only). This is the core A/C asymmetry: a husk walks a lethal beam
  unharmed; the player dies in it.
- **One-way `-` tiles do NOT block light rays** (`isSolidTile` is true only for
  `#`). So a beam in a husk lane can **leak up through `-` windows** and detect
  the player on the walkway above. Mitigate by aiming lights low/away from the
  walkway, or make those window tiles `#`. **Must verify player-on-walkway
  detect==0 in the harness.**
- **Husks solid to each other, pass-through to the player** (`collectSolids`).
  One husk per group here, so no merge risk.
- **You cannot drive a husk and ride a lift at the same time** — driving = slumped
  at a helm. So any lift puzzle is: set husk position via helm → disconnect (husk
  freezes, its weight stays counted) → board the lift; weights are then fixed.
- **Balanced lift HOLDS** (rope friction). `targetVel=(wB−wA)*58`. Player=husk=
  box=1. So a husk counterweight gives *holding/raising*, not a controllable ride.
- **Mantle cap = 102px (~3.2 tiles)** from last footing (`jumpFromY`); jump clears
  2 tiles easily. A 4-tile wall needs a +1-tile step.
- **Plate `hold:N`** keeps the signal N s after the presser steps off
  (`updatePlates`: `if hit p.timer=p.hold; else timer-=dt`). **Door not `latch`**
  = open only while signal active.
- **Lift A-over-a-pit pattern** (Ch.3 Room B, proven): box/husk on platform A
  sinks A into a pit and raises platform B +2 tiles, which **holds** once the
  player boards B (balance). Numbers there: `ax/ay=42/20, bx/by=48/20, aw2 bw3
  travel2`; A over a 2-wide row-20 pit.

## Rooms (each = one clean idea, escalating)

### ROOM A — THE BEAM CORRIDOR (husks + lights). cols 0–56.
Player on the **row-12 walkway**; husk sealed in the **lane below** (rows 13–19,
floor row 20), seen through `-` windows (Ch.5 idiom). A searchlight sweeps the
lane = visibly lethal. Drive the husk (immune) along the lit lane onto plate
**pA**; pA **latches** the player's walkway gate `d_a1`; disconnect, walk through
to checkpoint 0. New idea: **lights ignore husks** (taught by watching the husk
stroll the lit lane). Player is never in this beam (sealed lane). Gentle intro.

### ROOM B — THE RELAY (timed plate + two helms, one husk). cols 57–129.
Two tiers for the player; one husk lane below both.
- **Tier 1** walkway row 12 (cols 57–82): **helm B1** (col 64) + the husk +
  plate **pB1 (`hold:4`)** + **lane gate `d_b1`** + **walkway gate `d_bw1`**, all
  in/over the lane under tier 1.
- **Stage 1:** drive the husk onto pB1 → opens `d_bw1` (player's walkway gate) AND
  `d_b1` (a gate **in the husk lane**, both linked to pB1, neither latched).
  Disconnect → husk parks on pB1 (keeps pressing) → `d_bw1` stays open → player
  walks through it and **drops 4 tiles** off the tier-1 edge (col 83) to **Tier 2**
  (floor row 16). The 4-tile face at col 82 (`#` rows 12–15 above the row-16 floor)
  is **un-mantleable (>3.2 tiles)** → can't return to B1 → **B2 is forced.**
- **Stage 2:** at **helm B2** (on tier 2) reconnect (same group `b`), drive the
  husk RIGHT off pB1. The instant it leaves, `hold:4` starts; the husk must clear
  `d_b1` within the window (col 72→78, ~0.9 s — generous) then run to plate
  **pB2** (col 110) which **latches** the exit gate `d_b2`. **`hold>0` is
  NECESSARY** — with hold:0 `d_b1` slams the instant the husk steps off pB1 and
  traps it (recoverable: drive husk back onto pB1, retry — not a softlock).
- Disconnect, walk tier 2 through `d_b2` to checkpoint 1, then drop to Room C.
New idea: a **timed plate** + needing the **same husk twice via a second helm**.

### ROOM C — THE COUNTERWEIGHT (husk-as-counterweight lift + beam). cols 130–209. FINALE.
Player drops from tier 2 (row 16) down to **ground row 20**. Mirrors Ch.3 Room B
but the counterweight is a **husk** (driven on remotely) and a searchlight guards
the approach.
- **helm C** (col 136) + **husk c** (col 140) on the ground; a **lift** (platform A
  over a 2-wide pit at cols 148–149; platform B cols 153–155; `ay=by=20, aw2 bw3
  travel2`); a **searchlight** sweeping the ground stretch (cols ~140–152) between
  the helm and platform B; the **exit plateau** (cols 156–165, top **row 16**).
- **Solve:** drive the husk onto platform A → A sinks 2 into the pit, B **rises to
  row 18** and holds. Disconnect (husk parked on A holds B up). **Time a dash**
  across the beam (husk was immune; player isn't — asymmetry again, now + a lift),
  jump onto raised B (row 18), **mantle the row-16 plateau** (climb 64<102 ✓),
  walk into the exit.
- **No-bypass math:** plateau row 16 from ground row 20 = climb 128 > 102 (✗);
  from raised B row 18 = climb 64 < 102 (✓) → the husk-raise is required.
New idea: **husk as a remote counterweight** (combined with a light + lift).
*Optional:* place checkpoint idx2 at the Room C entrance (col ~132) so beam deaths
don't replay Room B; it's past Room B's latched `d_b2`, so it's death-reset safe.

## Generator fills (width 210, height 24; rows top=0). `fill(r0,r1,c0,c1,ch)`.

```
// global
fill(21,23, 0,209,'#')      // bedrock
fill(20,20, 0,209,'#')      // ground / lane floor
// ROOM A
fill(12,19, 0,11,'#')       // start block + lane-A left wall
fill(12,12, 12,45,'-')      // walkway windows over lane A (rows 13-19 air by default)
fill(12,19, 46,59,'#')      // lane-A right wall + gate base + A/B divider + lane-B left wall
// ROOM B
fill(12,12, 60,81,'-')      // tier-1 windows over lane B (rows 13-19 air by default)
fill(12,16, 82,82,'#')      // tier-drop wall (above the husk lane)
fill(17,19, 82,82,'.')      // husk passes UNDER the wall at col 82
fill(16,16, 83,128,'#')     // tier-2 floor (row 16)
fill(16,16, 100,116,'-')    // tier-2 windows over lane B
fill(17,19, 83,115,'.')     // lane B air under tier 2
fill(17,19, 116,118,'#')    // lane B right end wall (husk stops past pB2)
fill(17,23, 119,128,'#')    // solid block right of the lane, under tier 2
fill(16,19, 129,131,'.')    // drop chute tier 2 -> Room C ground (row 20 stays '#')
// ROOM C
fill(20,22, 148,149,'.')    // pit for platform A (row 23 stays '#' = pit floor)
fill(16,19, 156,165,'#')    // exit plateau (top row 16)
```
After fills, sanity-check every row is exactly 210 chars; print an ASCII map with
a column ruler to eyeball the walkway/lane/tier/pit/plateau before pasting.

## Entities (draft — tune light a0/a1/speed/len/fov in the harness)

```
playerStart: [3, 11]
// ROOM A
{ t:'husk',  x:13, y:19, group:'a' }
{ t:'helm',  x:18, y:10, group:'a' }
{ t:'light', x:30, y:14, a0:0.30, a1:0.95, speed:0.16, len:12, fov:0.5 }  // aim DOWN into lane; verify no leak to walkway
{ t:'plate', x:42, y:19, w:2, id:'pA' }
{ t:'door',  x:50, y:6,  h:6, links:['pA'], latch:true }
{ t:'check', x:54, y:10, idx:0 }
// ROOM B
{ t:'husk',  x:61, y:19, group:'b' }
{ t:'helm',  x:64, y:10, group:'b' }                 // B1 (tier 1)
{ t:'plate', x:72, y:19, w:2, id:'pB1', hold:4 }
{ t:'door',  x:78, y:13, h:7, links:['pB1'] }        // d_b1 lane gate (NOT latch)
{ t:'door',  x:82, y:6,  h:6, links:['pB1'] }        // d_bw1 walkway gate (NOT latch)
{ t:'helm',  x:88, y:14, group:'b' }                 // B2 (tier 2, on row-16 floor; helm rows 14-15)
{ t:'plate', x:110, y:19, w:2, id:'pB2' }
{ t:'door',  x:120, y:10, h:6, links:['pB2'], latch:true } // d_b2 exit gate (blocks tier-2 row 16)
{ t:'check', x:124, y:14, idx:1 }
// ROOM C
{ t:'helm',  x:136, y:18, group:'c' }                // on ground row 20 (helm rows 18-19)
{ t:'husk',  x:140, y:19, group:'c' }
{ t:'lift',  ax:148, ay:20, bx:153, by:20, aw:2, bw:3, travel:2 }
{ t:'light', x:151, y:18, a0:2.45, a1:3.55, speed:0.13, len:13, fov:0.5 } // sweep ground; ≥1s off-window; player on B/plateau safe
{ t:'exit',  x:162, y:12, w:2, h:4 }
```
Door rects are thin 12px slabs centred in the column (proven to block the 18px
player/husk). Helm `y` = top row, h=2 tiles, stands on the floor 2 rows below.

## Harness checks (dev/ch6.js) — mirror dev/ch5.js patterns

- **sanity:** name, 24 rows × 210 wide; counts (3 husks / 3 helms / 4 plates /
  4 doors / 1 lift / 2 lights / 1 exit / 2-3 checks); husks grouped 1/1/1 a,b,c;
  all gates start shut.
- **helm groups:** connecting at B drives only group-b; a & c husks stay frozen.
- **A:** player alone can't open `d_a1` (sealed lane); drive husk through the beam
  onto pA → `d_a1` latches; **husk is NEVER killed in the beam**; **player standing
  on the walkway is NOT detected** (no leak); player walks to checkpoint 0.
- **B stage 1:** drive husk onto pB1 → `d_bw1` + `d_b1` open; disconnect, husk
  parked holds them; player walks through `d_bw1`, drops to tier 2, **cannot mantle
  back to tier 1** (assert), reaches B2.
- **B stage 2:** at B2 reconnect, drive husk off pB1 → it clears `d_b1` within the
  hold window and reaches pB2 → `d_b2` latches. **hold-necessity:** with the door
  rebuilt at hold:0 (or just assert) the husk can't pass after stepping off
  (document the reasoning even if not asserted). No-bypass: player can't reach pB2
  / the exit without the husk.
- **C:** plateau unreachable from ground (assert mantle fails), reachable from
  raised B (assert solve); husk-on-A raises B and HOLDS after disconnect; the beam
  has a real off-window (player detected mid-cross during a lit phase, safe during
  the gap); player on raised B / plateau not detected; exit → **title** (last built
  chapter).

## MUST-DO bookkeeping (the cross-chapter exit chain)

- **Update `dev/ch5.js` final assertion:** Ch.5 is no longer the last chapter —
  its exit now advances to **Ch.6 (`chapterIdx===5`)**, not `state==='title'`
  (same edit prior sessions made to ch1–ch4 when the next chapter landed).
- Ch.6's exit is the new **last-chapter → title** (until T12 builds Ch.7).
- Run the **full suite**: `node dev/headless.js`, `dev/fuzz.js`, `dev/t5.js`,
  `dev/ch1.js`…`ch6.js`. Then a **browser render check** (serve over http; 0
  console errors; brightened zoom of each room).
- Update `dev/STATUS.md`, check off **T11** in `dev/TASKS.md` (only after
  built+verified), append the session-log line, and fold the three **deviations**
  below into `dev/DESIGN.md` Ch.6.

## DESIGN deviations to record (per the hard rule)

1. **Room A** uses Ch.5's sealed-lane idiom: "the corridor you cannot pass" is the
   sealed lit husk-lane the player overlooks; husk-immunity is taught by contrast
   (the husk walks the lit lane), and the player is never personally in that beam.
2. **Room B** uses the timed plate's `hold` as the crux of a **husk self-gated
   run** (pB1 opens lane gate d_b1; the husk must leave its own plate and beat the
   door), and forces the **two-helm relay** with a 4-tile one-way drop between B1
   and B2 (control isn't range-limited; the second helm is a *player-spatial*
   requirement).
3. **Room C** realises "lower yourself past a beam gap" as a **husk-counterweight
   that RAISES** platform B to bridge a 4-tile exit (Ch.3 Room B with a husk
   instead of a box) + a separate timed **ground beam-dash** for the player; the
   finale combines husk+light+lift (the timed plate is showcased standalone in
   Room B rather than literally folding Room B into Room C).
```
