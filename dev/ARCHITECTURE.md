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
js/levels1.js   NOT WRITTEN — chapters 1–4 (must define global LEVELS = [] and push)
js/levels2.js   NOT WRITTEN — chapters 5–8 (pushes onto LEVELS)
js/game.js      NOT WRITTEN — state machine, camera, orchestration, main loop
```

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
{t:'light', x,y, a0,a1, speed:0.5, phase:0, len:11, fov:0.30}  // angles in radians; y/x = fixture tile
{t:'husk',  x,y}                               // y = tile whose bottom is the feet
{t:'helm',  x,y}                               // 1×2-tile interaction zone
{t:'lift',  ax,ay, bx,by, w:2, travel:3, off:0}  // two platform anchor points
{t:'creature', x,y, range:15}                  // y = floor tile it stands on
{t:'check', x,y, idx:N}                        // idx = checkpoint index, ascending
{t:'exit',  x,y, w:2, h:4}
{t:'hint',  x,y, text:'←  →', r:5}
```

## Key APIs already implemented

### util.js
`clamp lerp damp(cur,target,rate,dt) aabb(a,b) dist makeRng(seed)`
`Input.left/right/up/down/jumpHeld/jumpPressed/grabHeld/actPressed()` —
call `Input.endFrame()` at end of each frame. `fitCanvas(canvas)` once.

### audio.js (AudioSys)
`init()` (must be inside a user-gesture handler), `toggleMute()`,
`setMood({drone,wind,rain,pitch})`, `update(dt, dangerLevel)` every frame
(drives heartbeat). One-shots: `step jump land splash boxDrag lever doorMove
connect disconnect detectTick alarm death checkpoint creatureGrowl
creatureOpen`.

### player.js
- `tileAt(level,tx,ty)`, `isSolidTile/isWaterTile/isGrassTile/isOnewayTile(c)`,
  `rectHitsSolidTiles(level,x,y,w,h)`, `centerInWater/headInWater(level,ent)`.
- `moveEntity(ent, dt, level, solids, {oneway}) → {hitX, hitY, groundRef}` —
  axis-separated collision vs tiles + solid rects. `hitX` is `'tile'` or the
  `ref` of the rect hit (game.js uses a box ref hit to push boxes).
- `makeHumanoid(x,y)` → 18×42 entity. `updateHumanoid(p, ctl, dt, level,
  solids, sounds)` — full controller: run/jump (coyote+buffer)/swim/crouch/
  auto-mantle. `ctl = {left,right,up,down,jump,jumpHeld}` booleans, so the
  same function drives the player (from Input) and husks (mirrored ctl or
  all-false when frozen). `sounds` truthy = emit SFX (pass false for husks or
  make them quieter). GRAVITY=1900, jump v=-640.

### entities.js
- `spawnEntities(defs) → world` with arrays: boxes, doors, levers, plates,
  lights, husks, helms, lifts, creatures, checks, exits, hints.
- `collectSolids(world, self)` → rects blocking a humanoid/box (boxes, closed
  doors, lift platforms). `liftRects(L)` → `{a,b}` platform rects.
- Per-frame (call in this order from game.js):
  `updateBoxes(world, level, dt)` (buoyancy + friction included);
  `updatePlates(world, dt, heavies)` where heavies = [player, ...husks,
  ...boxes]; `updateDoors(world, dt)` (reads signals from levers+plates via
  `evalSignals`); `updateLifts(world, dt, heavies)` (carries riders);
  `updateLights(world, level, player, hidden, dt) → {killed, danger}`
  (`hidden` = crouching in grass; handles occlusion raycast vs tiles/boxes/
  doors); `updateCreatures(world, level, player, dt) → {killed, danger}`.
- Levers/helms do NOT self-update: game.js handles `Input.actPressed()`
  proximity interaction (lever toggle + `AudioSys.lever()`, helm
  connect/disconnect), box grab/pull, and push (on player `hitX` box ref:
  set `box.vx = facing*70`, `player.pushTimer = 0.2`).

### render.js (Render)
`init()` once. `buildBackground(kind, seed)` at chapter load. Per frame, in
order: `sky(ctx,palette,time)` → `parallax(ctx,cam)` → `fogBand(ctx,cam,time,
'rgba(120,140,160,0.045)')` → `tiles(ctx,level,cam,time)` (also draws grass &
oneways) → entity drawing (mostly TODO in game.js or added here) →
`water(ctx,level,cam,time)` (over entities, translucent) →
`humanoid(ctx, p, cam, {color, huskGlow, connected})` →
`darkness(ctx, amount, holes)` when dark (holes = screen-space
{x,y,r,a}) → `rainPass(ctx,dt,cam)` / `motesPass(ctx,dt,time)` →
`vignette(ctx)` → `grainPass(ctx)`.
Camera is `{x,y}` world px of the view's top-left (+ optional `dx` used by
rain for parallax feel).

**Still to draw (no helpers yet):** boxes, doors, levers, plates, light cones
+ fixtures, helms, lift platforms + ropes, creature, checkpoints, exits,
hint text. Add these as Render methods in the entity-render task.

## Conventions & gotchas

- Death = reset entire chapter (respawn world from defs) but spawn at the
  saved checkpoint's coords. Checkpoint placement rules in DESIGN.md.
- Husks: `h.isHusk = true`; they ignore searchlights; player and husks do
  NOT collide with each other (don't add them to each other's solids).
- While connected to a helm: route Input ctl to every husk, give player
  all-false ctl, camera follows husk centroid.
- Boxes are 30×30 spawned 1px inset in their tile; their solidity for
  humanoids comes from `collectSolids`.
- One-way `-` tiles only catch falling entities whose feet were above them.
- `damp()` everywhere for smoothing — never lerp by raw dt factors.
- Nothing has been run in a browser yet. Expect first-run bugs; budget
  time for them in the bring-up task.
