# HOLLOW — architecture & API reference

Keep this file current: it is what lets a cold session continue without
re-reading every line of code.

## Files & load order (index.html)

```
js/util.js      constants, math, RNG, Input, fitCanvas
js/audio.js     AudioSys: procedural ambience + one-shot SFX
js/player.js    tile queries, moveEntity physics, makeHumanoid/updateHumanoid
js/entities.js  spawnEntities, collectSolids, per-system update functions
js/render.js    Render: backgrounds, tiles, humanoid drawing, post fx
js/levels1.js   chapters 1–5 — defines global LEVELS = [] and pushes onto it
                (Ch.1 FOREST, Ch.2 FENCE, Ch.3 YARD, Ch.4 DRAINS, Ch.5 HUSKS)
dev/testmap.js  DEV-ONLY all-mechanics TEST GROUNDS sheet. Not in index.html;
                the harnesses load it after levels2.js / before game.js, where
                it does LEVELS.length=0 + push() to replace the chapter list.
js/levels2.js   chapters 6–8 — pushes onto LEVELS (Ch.6 MACHINES, Ch.7 DEEP;
                Ch.8 still to build in T13)
js/game.js      state machine, camera, orchestration, main loop
```

Dev tools (not loaded by the game): `dev/headless.js` — node smoke test
that runs the real scripts against stubbed DOM/audio and walks the test
map (run `node dev/headless.js`); `dev/browser-test.js` — headless-
Chromium smoke test of index.html itself (setup notes in its header);
`dev/fuzz.js` — random-input fuzzer that flags embed/stuck states
(player-in-tiles, player-deep-in-box, box-in-tiles). Run all three
after engine changes. Per-chapter walkthrough harnesses load the REAL
`LEVELS` (no testmap) and drive every beat: `dev/ch1.js` … `dev/ch7.js`
(`ch4.js` covers the water/breath chapter; `ch5.js` covers the helm chapter —
helm-group isolation, the room-A remote plate, room-B two-husk jump desync, and
room-C's timed runway jump over the gap; `ch6.js` the husk×light×lift synthesis;
`ch7.js` the Listener red-light/green-light chapter — eye cycle, still-is-safe vs
move-is-lethal, the growl warning, per-room crossings + the scripted door finale).

No modules, no fetch — everything is global-scope script, must run from
`file://`. Canvas is 960×540 (`VIEW_W/VIEW_H`), letterboxed via `fitCanvas`.

## Coordinates & level format

`TILE = 32`. A level/chapter object (to be consumed by game.js):

```js
{
  name: 'I. THE FOREST',
  bg: 'forest' | 'facility' | 'interior' | 'cavern',   // Render.buildBackground kind
  seed: 1234,                                          // bg RNG seed
  palette: { sky0:'#0a0d12', sky1:'#1a2230', horizonGlow:'rgba(...)' },
  mood: { drone: 0.06, wind: 0.05, rain: 0.04, pitch: 55 },  // AudioSys.setMood
  rain: true, dark: false,
  playerGlow: true,          // optional: a faint additive presence halo behind the
                             // player + husks (lit chapters only) so dark figures
                             // stay locatable on the near-black interior ground
  rows: ['....#...', ...],   // 24 strings, equal length; chars: # . ~ G -
  playerStart: [tx, ty],     // tile coords (feet placed on ty bottom)
  entities: [ ...defs ],     // see below
}
```

Game.js should derive `level = { w, h, rows }` from this (`w` = row length,
`h` = rows.length) — the physics/tile functions take that shape.

### Entity defs (tile coords; parsed by `spawnEntities`)

```js
{t:'box',   x,y}
{t:'door',  x,y, h:3, links:['id'], mode:'all'|'any', latch:true}
{t:'lever', x,y, id:'id', on:false}
{t:'plate', x,y, id:'id', w:2, hold:0}        // y = tile the plate sits IN (top of floor)
{t:'light', x,y, a0,a1, speed:0.5, phase:0, len:11, fov:0.30, offWhen:'id'}  // angles in radians; y/x = fixture tile. offWhen: signal id that powers the cone DOWN (disabled = no detection, dims in render)
{t:'husk',  x,y, group:'a'}                    // y = tile whose bottom is the feet; group = which helm drives it (default null)
{t:'helm',  x,y, group:'a'}                    // 1×2-tile interaction zone; controls husks of its group (null group = ALL husks)
{t:'lift',  ax,ay, bx,by, w:2, travel:3, off:0, lock:'id'}  // counterweight: A at ay-off, B at by+off
                                               // w sets both platform widths; or aw/bw to size each
                                               // lock: signal id (lever/plate) that FREEZES the lift (the brake) while active
{t:'creature', x,y, range:15, hearsHusks:false} // y = row whose BOTTOM is the floor top
                                               // (i.e. floorRow-1, NOT the solid floor row).
                                               // body bottom = (y+1)*TILE; if y is a solid
                                               // tile the body embeds in it and every charge
                                               // self-aborts (rectHitsSolidTiles). range (tiles)
                                               // gates the NATURAL alert→charge + growl only;
                                               // trigger-driven lunges ignore it.
                                               // hearsHusks: also lunges at + is killed by a
                                               // husk that MOVES near its open eye (Ch.8 Room C
                                               // mirrored stillness); default false = ignores husks.
{t:'check', x,y, idx:N}                        // idx = checkpoint index, ascending
{t:'exit',  x,y, w:2, h:4}
{t:'core',  x,y, w:3, h:4}                     // the glowing mass (Ch.8): a trigger zone (never
                                               // solid) — walking into it flips to the ending state
{t:'hint',  x,y, text:'←  →', r:5}
{t:'trigger', x,y, w:2, h:4, target:0, action:'charge'|'wake', once:true}  // scripted chase: fires when the player enters; acts on world.creatures[target]
```

## Key APIs already implemented

### util.js
`clamp lerp damp(cur,target,rate,dt) aabb(a,b) dist makeRng(seed)`
`Input.left/right/up/down/jumpHeld/jumpPressed/grabHeld/actPressed()` —
call `Input.endFrame()` at end of each frame. `fitCanvas(canvas)` once.
Menus: `Input.menuUp/menuDown()` (Arrows/WS, move cursor), `menuConfirm()`
(Space/Enter/Z/X/E — disjoint from nav so ArrowUp never both moves & selects),
`escPressed()` (Escape, pause toggle). `digitPressed()` returns 1-9 pressed this
frame (0 = none); used by the title chapter-select.

### audio.js (AudioSys)
`init()` (must be inside a user-gesture handler; also kicks off `_loadSamples`),
`toggleMute()`, `setMood({drone,wind,rain,pitch})`, `update(dt, dangerLevel)`
every frame (drives heartbeat). One-shots: `step jump land gasp splash boxDrag
lever doorMove connect disconnect detectTick alarm death checkpoint creatureGrowl
creatureOpen`. (`gasp` = surfacing inhale once breath refills past the warn line.)

**Recorded samples (session 5):** `AUDIO_SAMPLES` (top of file) maps names →
`assets/audio/*.wav`, loaded via `fetch`+`decodeAudioData` into `this.samples`
(needs http; on file:// or 404 it logs once and falls back to synth). Helpers:
`_playSample(name, gain, rate) → bool` (one-shot, false if not loaded),
`_ensureWaterBed()` (builds the looping water source once `waterLoop` decodes),
`setWaterLevel(0..1)` (fades the water bed by proximity; no-op until loaded).
`splash()` plays the `splash` sample if present else `_synthSplash()`.
game.js `updatePlay` calls `setWaterLevel` each frame via `waterProximity(level,p)`.

### player.js
- `tileAt(level,tx,ty)`, `isSolidTile/isWaterTile/isGrassTile/isOnewayTile(c)`,
  `rectHitsSolidTiles(level,x,y,w,h)`, `centerInWater/headInWater(level,ent)`,
  `waterSurfaceY(level,x) → y|null` (top of the water column at world-x;
  box buoyancy springs toward it).
- `moveEntity(ent, dt, level, solids, {oneway}) → {hitX, hitY, groundRef}` —
  axis-separated collision vs tiles + solid rects. `hitX` is `'tile'` or the
  `ref` of the rect hit (game.js uses a box ref hit to push boxes). The X
  pass skips solids whose top is within ~4px of the entity's feet —
  floor-like contact is a step, not a wall (stops a bobbing floating box
  from ejecting its rider sideways).
- `makeHumanoid(x,y)` → 18×`STAND_H` entity. `updateHumanoid(p, ctl, dt, level,
  solids, sounds)` — full controller: run/jump (coyote+buffer)/swim/crouch/
  auto-mantle. **Crouch shrinks the collider**: while `ctl.down` is held on the
  ground the box resizes (feet-anchored) from `STAND_H=42` to `CROUCH_H=25` so
  the figure fits under a 1-tile (32px) gap; you also can't stand back up while
  a ceiling is overhead (a headroom test vs tiles + `solids` keeps `p.crouch`
  true until you clear it). `p.h` is therefore dynamic — read it, don't assume
  42. `ctl = {left,right,up,down,jump,jumpHeld}` booleans, so the
  same function drives the player (from Input) and husks (mirrored ctl or
  all-false when frozen). `sounds` truthy = emit SFX (pass false for husks or
  make them quieter). GRAVITY=1900, jump v=-640.
  Fields game.js relies on: `p.lastHitX` (this frame's moveEntity hitX),
  `p.grabbing`/`p.grabbedBox` (set by game.js; grabbing caps run speed at
  90), `p.jumpFromY` (y of last solid/water footing — mantle rejects
  climbs where launch-feet minus ledge-top exceeds 102px ≈ 3.2 tiles, so
  3-tile walls mantle but 4-tile walls need a box; raw jump apex would
  otherwise reach a 4-tile ledge).

### entities.js
- `spawnEntities(defs, seed) → world` with arrays: boxes, doors, levers, plates,
  lights, husks, helms, lifts, creatures, checks, exits, hints, triggers, cores.
  `seed` (chapter seed) feeds a `makeRng` so spawn jitter (light phase, creature
  timer, each creature's own `rng` stream) is **deterministic** — same chapter
  boots identically and dev harnesses are reproducible. (Was `Math.random()`.)
- `collectSolids(world, self)` → rects blocking a humanoid/box (boxes, closed
  doors, lift platforms). `liftRects(L)` → `{a,b}` platform rects. **When `self`
  is a husk it also includes the OTHER husks** (not the player), so same-group
  husks driven by one helm can't collapse onto a single x against a wall and
  become inseparable — they stack one body-width (18px) apart instead.
- Per-frame (call in this order from game.js):
  `updateBoxes(world, level, dt)` (buoyancy + friction included);
  `updatePlates(world, dt, heavies)` where heavies = [player, ...husks,
  ...boxes]; `updateDoors(world, dt)` (reads signals from levers+plates via
  `evalSignals`); `updateLifts(world, dt, heavies)` (carries riders; a lift
  whose `lock` signal is active is frozen in place — the brake);
  `updateTriggers(world, player)` (scripted chase zones; fires once on enter);
  `updateLights(world, level, player, hidden, dt) → {killed, danger}`
  (`hidden` = crouching in grass; handles occlusion raycast vs tiles/boxes/
  doors; a light whose `offWhen` signal is active sets `Lt.disabled`, skips
  detection, and dims in render); `updateCreatures(world, level, player, dt) →
  {killed, danger}`.
- `creatureStartCharge(c, px)` — force a creature into an immediate lunge toward
  world-x `px`; shared by the natural alert→charge path and trigger zones.
- Levers/helms do NOT self-update: game.js handles `Input.actPressed()`
  proximity interaction (lever toggle + `AudioSys.lever()`, helm
  connect/disconnect — both implemented in T3). Box push + grab/pull are in
  `updateBoxInteraction` in game.js (see below).

### render.js (Render)
`init()` once. `buildBackground(kind, seed)` at chapter load. Per frame, in
order: `sky(ctx,palette,time)` → `parallax(ctx,cam)` → `fogBand(ctx,cam,time,
'rgba(120,140,160,0.045)')` → `tiles(ctx,level,cam,time)` (also draws grass &
oneways) → entity drawing (Render.* per-entity, called from game.js) →
`water(ctx,level,cam,time)` (over entities, translucent) →
`humanoid(ctx, p, cam, {color, huskGlow, connected})` →
`darkness(ctx, amount, holes)` when dark (holes = screen-space
{x,y,r,a}) → `rainPass(ctx,dt,cam)` / `motesPass(ctx,dt,time)` →
`vignette(ctx)` → `grainPass(ctx)`.
Camera is `{x,y}` world px of the view's top-left (+ optional `dx` used by
rain for parallax feel).

Drawn (mostly pulled forward from T4 in sessions 2–3): `box`, `door`,
`plate`, `lever`, `lightCone`, `helm`, `lift` (ropes + slabs, per-platform
width via `liftRects`), `creature` (body + eye), `check` (lamp),
`exitGlow`, `core` (a warm pulsing radial bloom — the Ch.8 glowing mass, drawn
with `lighter` compositing), `hint`. `humanoid` has a faint rim-light so the
figure separates from same-value backgrounds. `hint(ctx, h, cam)` draws a faint serif key-glyph
at `h.alpha` (game.js fades alpha in/out by player proximity to `h.r`).
`lightCone(ctx, Lt, cam, level, world)` fans a ray per ~0.012 rad across the
fov, each stopped by `_coneRayHit(level, world, …)` at the first solid tile /
box / closed door (the *same* occluders `updateLights` raycasts for detection),
so walls clip the beam and a pushed box casts a visible shadow that matches
where the player is actually hidden. Brightness still scales with `Lt.detect`;
a `disabled` (offWhen) fixture dims to a dead glow.

### game.js

Global `Game` object: `{state ('title'|'play'|'dead'|'ending'), chapterIdx,
chapter (LEVELS def), level ({w,h,rows}), world, player, cam {x,y,dx,look}, time,
fade (0 clear..1 black), fadeV, onFaded, danger, last, helmed, checkpointIdx,
breath, paused, pauseSel, titleSel, selecting, selectSel, ending}`. Consts:
`BREATH_MAX=9`, `BREATH_WARN=4`.

- **Ending cinematic** (`Game.state==='ending'`, Ch.8): `updatePlay` starts it
  when the player touches a `core` zone (`startEnding()`). `Game.ending =
  {phase, t, white, scroll, wall, opening, donePrompt}`; `updateEnding`/
  `drawEnding` run instead of `updatePlay`/`drawPlay`. Phases: `walk` (the player
  + every husk are auto-driven right; the wall — the door tagged `links:['_wall']`,
  which no signal opens in play — animates `openT` once they reach it) → `whiteout`
  (warm-white bloom) → `card` (the HOLLOW wordmark on a settling field) →
  `credits` (the `CREDITS` scroll; any key skips) → `end` (press any key →
  fade → title, save cleared). No `exit` entity is used (the Core is the terminus).

- `loadChapter(i)` — sets chapter/level, `Render.buildBackground`,
  `AudioSys.setMood`, then `resetChapterState()`.
- `resetChapterState()` — respawns world from defs + player at the
  latched checkpoint (or `playerStart` if none), snaps camera.
- `fadeOutThen(speed, cb)` — fade to black at `speed`/s, run cb, auto
  fade back in (fade-in always runs at 1.1/s whenever fadeV == 0).
- `die(byHazard)` — play → dead → (fade) → reset → play. R key calls
  `die(false)`; lights/creature kills call `die(true)` + death SFX.
- `updateCamera(dt, snap)` — damped follow, facing look-ahead (±70 px,
  damped), clamped to level bounds; `cam.dx` feeds rain parallax.
- `updatePlay(dt)` — ctl from Input → `updateHumanoid` (splash SFX on
  water entry) → `updateBoxInteraction` → updateBoxes/Plates/Doors/Lifts
  (heavies = [player, husks, boxes]) → `updateTriggers` → hidden =
  crouch-in-grass → updateLights/Creatures → **breath** (drains while
  `headInWater`, drown→`die(true)` at 0; refills ×4/s at the surface,
  `gasp` SFX crossing the warn line; low breath feeds `Game.danger`) →
  danger/kills → checkpoints/save → core (→ ending) / exit check → camera.
- **Breath UX**: `drawPlay` closes the view to a shrinking porthole
  (`Render.darkness` with a hole at the player) once `breath < BREATH_WARN`.
- **Dark chapters** (`chapter.dark`, e.g. Ch.7): `drawPlay` calls
  `Render.darkness(0.93, holes)` where holes = the player glow (r140) PLUS one
  hole per creature at its eye (`c.x+c.w*0.30, c.y+c.h*0.26`, radius/alpha scaled
  by `c.eye`), so an OPEN Listener eye glows through the mask (the red-light tell);
  a shut eye (`eye≤0.05`) punches nothing.
- **Pause** (`Esc`, only in play, ignored mid-fade): `Game.paused` freezes
  `updatePlay`; `updatePauseMenu()` + `drawPause()` give resume / restart
  (`resetChapterState`) / mute (`AudioSys.toggleMute`), `Game.pauseSel` cursor.
- **Title** (`updateTitle`/`drawTitle`): with a save present, a `continue`/
  `new game` menu (`Game.titleSel`, nav + `menuConfirm`); with none, "press
  any key" → new game. New game clears the save and loads chapter 0; continue
  loads the saved chapter+checkpoint. Gated on `fade < 0.5` (boot keypress
  can't skip an unseen title).
- **Dev chapter-select** (testing aid): on the title, `` ` `` (Backquote) toggles
  `Game.selecting` — a "JUMP TO CHAPTER" overlay listing every `LEVELS` entry.
  `updateChapterSelect()` handles up/down (`Game.selectSel`), a digit 1-9 jumps
  straight to that chapter, confirm enters the cursor's chapter, Esc closes.
  `jumpToChapter(i)` fades out → `loadChapter(i)` → play; it does NOT write the
  save (any checkpoint reached afterwards saves normally). Handled before the
  any-key "new game" path so the toggle can't double as starting the game. A
  faint `` `  chapters`` hint sits in the title's bottom-left.
- `updateBoxInteraction(p, world, dt)` — push: if `p.lastHitX` is a box
  and the player is grounded, dry, and pressing toward it → `box.vx =
  facing*70`, `p.pushTimer = 0.2`, throttled `boxDrag` SFX. Grab: hold
  X/E while grounded next to a box (≤10px gap, same floor ±20px) →
  `p.grabbedBox`; box gets `clamp(p.vx, ±90)` each frame, player faces
  the box, grab breaks on release/jump/separation >14px/floor mismatch.
  Box velocity set here is integrated by updateBoxes the same frame.
- Frame order: title? (updateTitle+drawTitle) : (Esc toggles pause;
  paused→updatePauseMenu else updatePlay; drawPlay; if paused drawPause) →
  fade overlay → `AudioSys.update(dt, danger)` → `Input.endFrame()`. dt clamped to
  ≤ 1/30 (headless Chromium runs rAF at ~120 fps — physics are dt-true).
- Audio autoplay: a dedicated `window` keydown listener calls
  `AudioSys.init()` (+ resume if suspended); title exit also requires
  `Game.fade < 0.5` so the boot keypress can't skip an unseen title.

## Conventions & gotchas

- Death = reset entire chapter (respawn world from defs) but spawn at the
  saved checkpoint's coords. Checkpoint placement rules in DESIGN.md.
- Husks: `h.isHusk = true`; they ignore searchlights. Husks ARE solid to each
  OTHER (`collectSolids` adds peer husks when `self` is a husk) so a multi-husk
  group can't merge into one body; the player and husks do NOT collide (a
  roaming husk must not be able to shove the slumped body off its helm).
- While connected to a helm: route Input ctl to the helm's husks (see groups
  below), give player all-false ctl (a `down` slump), camera follows the
  controlled-husk centroid. `controlledHusks()` (game.js) returns them: a helm
  with `group==null` drives ALL husks (original behaviour — testmap, single-helm
  chapters); a grouped helm drives only `husks` of the same `group`, so a later
  room's helm leaves finished rooms' husks frozen and out of the camera centroid.
  Used by Ch.5 (one group per room). Husks of other groups get idle ctl.
- Boxes are 30×30 spawned 1px inset in their tile; their solidity for
  humanoids comes from `collectSolids`.
- One-way `-` tiles only catch falling entities whose feet were above them.
- `damp()` everywhere for smoothing — never lerp by raw dt factors.
- T1 verified in node (dev/headless.js) and headless Chromium
  (dev/browser-test.js): movement, mantle, oneway, gap, swim, respawn,
  title flow, audio init — zero console errors. Subjective feel and the
  audio mix still need a human pass (T2).
