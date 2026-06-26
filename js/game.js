// ---------------------------------------------------------------
// HOLLOW - game.js : state machine, camera, orchestration, loop
// ---------------------------------------------------------------
'use strict';

const Game = {
  canvas: null, ctx: null,
  state: 'title',            // 'title' | 'play' | 'dead'
  chapterIdx: 0,
  chapter: null,             // LEVELS[chapterIdx] definition
  level: null,               // {w, h, rows} consumed by physics/render
  world: null,               // spawnEntities() result
  player: null,
  cam: { x: 0, y: 0, dx: 0, look: 0 },
  time: 0,
  fade: 1,                   // 0 = clear, 1 = black
  fadeV: 0,                  // >0 while fading out (per second)
  onFaded: null,
  danger: 0,
  last: 0,
  helmed: null,              // helm ref while connected (input routes to husks)
  checkpointIdx: -1,         // last checkpoint reached; -1 = playerStart
  breath: 0,                 // seconds of air left underwater (BREATH_MAX = full)
  paused: false,
  pauseSel: 0,               // 0 resume | 1 restart | 2 mute
  titleSel: 0,               // 0 continue | 1 new game (when a save exists)
  selecting: false,          // dev: chapter-select overlay open on the title
  selectSel: 0,              // dev: highlighted chapter in the select overlay
  ending: null,              // ending cinematic state (Ch.8 Core) when active
};

const BREATH_MAX = 9;        // seconds the player can hold their breath
const BREATH_WARN = 4;       // below this the screen starts closing in

// Husks the currently-connected helm drives. A helm with no group controls
// every husk (original behaviour); a grouped helm controls only its own group,
// so finished rooms' husks stay frozen and out of the camera centroid.
function controlledHusks() {
  const hm = Game.helmed;
  if (!hm || !Game.world) return [];
  if (hm.group == null) return Game.world.husks;
  return Game.world.husks.filter(h => h.group === hm.group);
}

// --------------------------- save / load ----------------------------

const SAVE_KEY = 'hollow_save';

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY,
      JSON.stringify({ chapter: Game.chapterIdx, checkpointIdx: Game.checkpointIdx }));
  } catch (e) { /* storage unavailable (private mode etc.) — play unsaved */ }
}

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s.chapter === 'number' && s.chapter >= 0 && s.chapter < LEVELS.length)
      return s;
  } catch (e) { /* corrupt/unavailable */ }
  return null;
}

// ------------------------ chapter management ------------------------

function loadChapter(i, checkpointIdx) {
  Game.chapterIdx = i;
  Game.chapter = LEVELS[i];
  Game.level = {
    w: Game.chapter.rows[0].length,
    h: Game.chapter.rows.length,
    rows: Game.chapter.rows,
  };
  Game.checkpointIdx = (checkpointIdx === undefined) ? -1 : checkpointIdx;
  Render.buildBackground(Game.chapter.bg, Game.chapter.seed);
  AudioSys.setMood(Game.chapter.mood);
  resetChapterState();
}

// Death/respawn rebuilds the whole world from defs (death resets the
// entire chapter's entity state — see DESIGN.md), but you respawn at
// the last checkpoint reached. Reached checkpoints stay reached.
function resetChapterState() {
  Game.world = spawnEntities(Game.chapter.entities, Game.chapter.seed);
  Game.helmed = null;
  let sx = Game.chapter.playerStart[0] * TILE + (TILE - 18) / 2;
  let sy = (Game.chapter.playerStart[1] + 1) * TILE - 42;
  for (const c of Game.world.checks) {
    if (c.idx <= Game.checkpointIdx) {
      c.done = true;
      if (c.idx === Game.checkpointIdx) {
        sx = c.x + (c.w - 18) / 2;
        sy = c.y + c.h - 42;
      }
    }
  }
  Game.player = makeHumanoid(sx, sy);
  Game.danger = 0;
  Game.breath = BREATH_MAX;
  Game.paused = false;
  updateCamera(0, true);
}

function fadeOutThen(speed, cb) {
  Game.fadeV = speed;
  Game.onFaded = cb;
}

function die(byHazard) {
  if (Game.state !== 'play' || Game.fadeV > 0) return;
  Game.state = 'dead';
  if (byHazard) AudioSys.death();
  fadeOutThen(byHazard ? 1.1 : 2.2, () => {
    resetChapterState();
    Game.state = 'play';
  });
}

// ----------------------------- camera -------------------------------

function updateCamera(dt, snap) {
  const cam = Game.cam;
  // focus: player, or the controlled-husk centroid while connected to a helm
  let fx, fy, lookDir;
  const ch = controlledHusks();
  if (ch.length) {
    fx = 0; fy = 0;
    for (const h of ch) { fx += h.x + h.w / 2; fy += h.y + h.h / 2; }
    fx /= ch.length; fy /= ch.length;
    lookDir = ch[0].facing;
  } else {
    const p = Game.player;
    fx = p.x + p.w / 2; fy = p.y + p.h / 2;
    lookDir = p.facing;
  }
  cam.look = snap ? lookDir * 70 : damp(cam.look, lookDir * 70, 1.6, dt);
  const maxX = Math.max(0, Game.level.w * TILE - VIEW_W);
  const maxY = Math.max(0, Game.level.h * TILE - VIEW_H);
  const tx = clamp(fx + cam.look - VIEW_W / 2, 0, maxX);
  const ty = clamp(fy - VIEW_H * 0.58, 0, maxY);
  if (snap) { cam.x = tx; cam.y = ty; cam.dx = 0; return; }
  const prevX = cam.x;
  cam.x = damp(cam.x, tx, 3.4, dt);
  cam.y = damp(cam.y, ty, 2.8, dt);
  cam.dx = (cam.x - prevX) * 0.5;   // rain parallax feel
}

// ----------------------------- update -------------------------------

function updatePlay(dt) {
  const p = Game.player, level = Game.level, world = Game.world;

  if (Input.pressed['KeyR']) { die(false); return; }
  if (Input.pressed['KeyM']) AudioSys.toggleMute();

  const ctl = {
    left: Input.left(), right: Input.right(),
    up: Input.up(), down: Input.down(),
    jump: Input.jumpPressed(), jumpHeld: Input.jumpHeld(),
  };

  // X/E press: helm connect/disconnect, else lever toggle. (Box grab is
  // separate — it engages on hold, in updateBoxInteraction.)
  if (Input.actPressed()) updateActInteraction(p, world);

  const idle = { left: false, right: false, up: false, down: false, jump: false, jumpHeld: false };
  // while helmed the player slumps and the connected helm's husks mirror your
  // input; husks of other groups (finished rooms) stay frozen
  const playerCtl = Game.helmed ? { ...idle, down: true } : ctl;
  const controlled = controlledHusks();

  const wasInWater = p.inWater;
  updateHumanoid(p, playerCtl, dt, level, collectSolids(world, p), true);
  maybeSplash(p, wasInWater, dt);

  for (const h of world.husks) {
    const driven = controlled.includes(h);
    const huskCtl = driven ? ctl : idle;
    const hWasInWater = h.inWater;
    updateHumanoid(h, huskCtl, dt, level, collectSolids(world, h), false);
    maybeSplash(h, hWasInWater, dt);
    // husks push boxes like the player does (no grab — X/E is the helm key)
    if (driven && h.grounded && !h.inWater &&
        h.lastHitX && world.boxes.includes(h.lastHitX) &&
        ((h.facing > 0 && huskCtl.right) || (h.facing < 0 && huskCtl.left))) {
      h.lastHitX.vx = h.facing * 70;
      h.pushTimer = 0.2;
    }
  }

  if (Game.helmed) { p.grabbedBox = null; p.grabbing = false; }
  else updateBoxInteraction(p, world, dt);
  updateBoxes(world, level, dt);
  const heavies = [p, ...world.husks, ...world.boxes];
  updatePlates(world, dt, heavies);
  updateDoors(world, dt);
  updateLifts(world, dt, heavies);

  const ctx2 = Math.floor((p.x + p.w / 2) / TILE);
  const feetTy = Math.floor((p.y + p.h - 4) / TILE);
  const hidden = p.crouch && isGrassTile(tileAt(level, ctx2, feetTy));
  updateTriggers(world, p);
  const li = updateLights(world, level, p, hidden, dt);
  const cr = updateCreatures(world, level, p, dt);

  // breath: drains while the head is submerged, refills fast at the surface.
  // Run dry -> drown. (Husks don't breathe — only the controlled body does.)
  if (headInWater(level, p)) {
    Game.breath -= dt;
    if (Game.breath <= 0) { Game.breath = 0; die(true); return; }
  } else if (Game.breath < BREATH_MAX) {
    const wasLow = Game.breath < BREATH_WARN;
    Game.breath = Math.min(BREATH_MAX, Game.breath + dt * 4);
    if (wasLow && Game.breath >= BREATH_WARN) AudioSys.gasp();
  }
  const breathDanger = clamp((BREATH_WARN - Game.breath) / BREATH_WARN, 0, 1);

  Game.danger = Math.max(li.danger, cr.danger, breathDanger * 0.9);
  if (li.killed || cr.killed) { die(true); return; }

  for (const c of world.checks) {
    if (!c.done && aabb(p, c)) {
      c.done = true;
      Game.checkpointIdx = c.idx;
      AudioSys.checkpoint();
      saveGame();
    }
  }
  for (const hm of world.helms)
    hm.glow = damp(hm.glow, Game.helmed === hm ? 1 : 0.3, 4, dt);

  // hint captions: fade in when the player is within the hint's radius,
  // fade back out as they walk on. Pure proximity, no triggers.
  for (const ht of world.hints) {
    const d = Math.hypot((p.x + p.w / 2) - ht.x, (p.y + p.h / 2) - ht.y);
    const near = d < ht.r ? clamp(1 - d / ht.r, 0, 1) : 0;
    ht.alpha = damp(ht.alpha, near, 3, dt);
  }

  // ambient water bed: full volume when submerged, fading out within ~6 tiles
  // of the nearest water. (No-op until the recorded loop loads.)
  AudioSys.setWaterLevel(p.inWater ? 1 : waterProximity(level, p));

  if (Game.fadeV === 0) {
    // the Core: walking into the glow flips control to the ending cinematic
    for (const co of world.cores) {
      if (aabb(p, co)) { startEnding(); return; }
    }
    for (const ex of world.exits) {
      if (aabb(p, ex)) {
        fadeOutThen(1.3, () => {
          const n = Game.chapterIdx + 1;
          if (n < LEVELS.length) { loadChapter(n); Game.state = 'play'; saveGame(); }
          else {
            // game finished: clear the save so continue starts fresh
            try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ok */ }
            loadChapter(0); Game.state = 'title';
          }
        });
        break;
      }
    }
  }

  updateCamera(dt, false);
}

// Fire the entry splash, but only on a real plunge. `inWater` is center-in-tile,
// so a swimmer bobbing at the surface flickers it on/off every few frames; the
// old cooldown alone still let it retrigger. We require the entity to have been
// CLEAR of the water for a beat first (`dryTime`) — a bob's out-interval is far
// shorter than that, so surface bobbing is silent while a genuine fall still
// splashes. Tracks dryTime per entity (player + husks).
function maybeSplash(ent, wasInWater, dt) {
  ent.splashCd = Math.max(0, (ent.splashCd || 0) - dt);
  if (!wasInWater && ent.inWater && (ent.dryTime || 0) > 0.4 &&
      ent.vy > 12 && ent.splashCd <= 0) {
    AudioSys.splash();
    ent.splashCd = 0.6;
  }
  ent.dryTime = ent.inWater ? 0 : (ent.dryTime || 0) + dt;
}

// 0..1 nearness of the player to water: scans columns within ±RANGE tiles for
// a water surface and maps the closest one's distance to a fade. Cheap (a few
// dozen waterSurfaceY probes) and only runs when not already submerged.
function waterProximity(level, p) {
  const RANGE = 7;
  const cx = Math.floor((p.x + p.w / 2) / TILE);
  const py = p.y + p.h / 2;
  let best = Infinity;
  for (let dx = -RANGE; dx <= RANGE; dx++) {
    const sy = waterSurfaceY(level, (cx + dx) * TILE + TILE / 2);
    if (sy == null) continue;
    const d = Math.hypot(dx * TILE, py - sy) / TILE;
    if (d < best) best = d;
  }
  if (best === Infinity) return 0;
  return clamp(1 - best / RANGE, 0, 1);
}

// X/E pressed: helm has priority, then levers. Reach is the player's
// body padded a few px — you interact with what you're standing at.
function updateActInteraction(p, world) {
  if (Game.helmed) {
    Game.helmed = null;
    AudioSys.disconnect();
    return;
  }
  const reach = { x: p.x - 6, y: p.y - 4, w: p.w + 12, h: p.h + 8 };
  for (const hm of world.helms) {
    if (!aabb(reach, hm)) continue;
    // only connect if this helm actually has husks to drive
    const has = hm.group == null ? world.husks.length
      : world.husks.some(h => h.group === hm.group);
    if (has) {
      Game.helmed = hm;
      AudioSys.connect();
      return;
    }
  }
  for (const l of world.levers) {
    if (aabb(reach, l)) {
      l.on = !l.on;
      AudioSys.lever();
      return;
    }
  }
}

// Push (walk into a box) and grab/pull (hold X/E next to one).
// Box velocity is applied here and integrated by updateBoxes the same
// frame; the one-frame feel lag noted in STATUS turned out unnecessary.
function updateBoxInteraction(p, world, dt) {
  p._dragSnd = Math.max(0, (p._dragSnd || 0) - dt);
  const dragNoise = () => {
    if (p._dragSnd <= 0) { AudioSys.boxDrag(); p._dragSnd = 0.16; }
  };

  // grab / release
  if (Input.grabHeld() && p.grounded && !p.inWater && !p.mantle) {
    if (!p.grabbedBox) {
      for (const b of world.boxes) {
        if (Math.abs((b.y + b.h) - (p.y + p.h)) > 20) continue;  // same floor
        const gapR = b.x - (p.x + p.w);
        const gapL = p.x - (b.x + b.w);
        if ((gapR > -4 && gapR < 10) || (gapL > -4 && gapL < 10)) {
          p.grabbedBox = b;
          break;
        }
      }
    }
  } else {
    p.grabbedBox = null;
  }
  if (p.grabbedBox) {
    const b = p.grabbedBox;
    const sep = b.x > p.x ? b.x - (p.x + p.w) : p.x - (b.x + b.w);
    if (sep > 14 || Math.abs((b.y + b.h) - (p.y + p.h)) > 20) {
      p.grabbedBox = null;             // box fell away or tore loose
    } else {
      b.vx = clamp(p.vx, -90, 90);
      b.dragged = true;                // skip box friction this frame (keeps pace)
      p.facing = b.x > p.x ? 1 : -1;   // face the box, even while pulling
      if (Math.abs(b.vx) > 8) dragNoise();
    }
  }
  p.grabbing = !!p.grabbedBox;

  // push: pressing into a box you collided with this frame
  if (!p.grabbing && p.grounded && !p.inWater &&
      p.lastHitX && world.boxes.includes(p.lastHitX)) {
    const dir = p.facing;
    if ((dir > 0 && Input.right()) || (dir < 0 && Input.left())) {
      p.lastHitX.vx = dir * 70;
      p.pushTimer = 0.2;
      dragNoise();
    }
  }
}

// ------------------------------ draw ---------------------------------

function drawPlay(dt) {
  const ctx = Game.ctx, ch = Game.chapter, cam = Game.cam;
  Render.sky(ctx, ch.palette, Game.time);
  Render.parallax(ctx, cam);
  Render.fogBand(ctx, cam, Game.time, 'rgba(120,140,160,0.045)');
  Render.tiles(ctx, Game.level, cam, Game.time);
  // basic silhouettes for everything collidable/lethal (styled in T4)
  for (const co of Game.world.cores) Render.core(ctx, co, cam, Game.time);
  for (const ex of Game.world.exits) Render.exitGlow(ctx, ex, cam, Game.time);
  for (const c of Game.world.checks) Render.check(ctx, c, cam, Game.time);
  for (const L of Game.world.lifts) Render.lift(ctx, L, cam);
  for (const hm of Game.world.helms) Render.helm(ctx, hm, cam, Game.time);
  for (const lv of Game.world.levers) Render.lever(ctx, lv, cam);
  for (const pl of Game.world.plates) Render.plate(ctx, pl, cam);
  for (const d of Game.world.doors) Render.door(ctx, d, cam);
  for (const b of Game.world.boxes) Render.box(ctx, b, cam);
  for (const cr of Game.world.creatures) Render.creature(ctx, cr, cam, Game.time);
  Render.water(ctx, Game.level, cam, Game.time);
  const drivenSet = controlledHusks();
  // presence glow: in a lit-but-very-dark chapter (e.g. Ch.8's unlit stretches)
  // a dark figure on the near-black ground is invisible until you reach a light.
  // An opt-in (`playerGlow`) faint additive halo BEHIND the figures keeps you —
  // and the husks you drive — locatable, without lifting the silhouette itself.
  if (ch.playerGlow && !ch.dark) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = (e, col, r) => {
      const gx = e.x + e.w / 2 - cam.x, gy = e.y + e.h / 2 - cam.y;
      const g = ctx.createRadialGradient(gx, gy, 1, gx, gy, r);
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    };
    for (const h of Game.world.husks) halo(h, 'rgba(120,112,104,0.11)', 105);
    halo(Game.player, 'rgba(158,146,132,0.16)', 125);
    ctx.restore();
  }
  for (const h of Game.world.husks)
    Render.humanoid(ctx, h, cam, { huskGlow: true, connected: drivenSet.includes(h) });
  Render.humanoid(ctx, Game.player, cam, {});
  for (const ht of Game.world.hints) Render.hint(ctx, ht, cam);
  for (const Lt of Game.world.lights) Render.lightCone(ctx, Lt, cam, Game.level, Game.world);
  if (ch.dark) {
    const p = Game.player;
    // the player's glow + each Listener's OPEN eye punch holes in the dark, so
    // an opening eye reads as a glowing pool of light (the red-light tell). The
    // eye position mirrors Render.creature's (c.w*0.30, c.h*0.26).
    const holes = [
      { x: p.x + p.w / 2 - cam.x, y: p.y + p.h / 2 - cam.y, r: 140, a: 0.85 },
    ];
    for (const cr of Game.world.creatures) {
      if (cr.eye <= 0.05) continue;
      holes.push({
        x: cr.x + cr.w * 0.30 - cam.x, y: cr.y + cr.h * 0.26 - cam.y,
        r: 34 + 70 * cr.eye, a: 0.5 * cr.eye,
      });
    }
    Render.darkness(ctx, 0.93, holes);
  }
  if (ch.rain) Render.rainPass(ctx, dt, cam);
  else Render.motesPass(ctx, dt, Game.time);
  // drowning: the view closes to a shrinking porthole as breath runs out
  if (Game.breath < BREATH_WARN) {
    const p = Game.player;
    const k = clamp((BREATH_WARN - Game.breath) / BREATH_WARN, 0, 1);
    Render.darkness(ctx, k * 0.92, [
      { x: p.x + p.w / 2 - cam.x, y: p.y + p.h / 2 - cam.y, r: lerp(240, 70, k), a: 0.95 },
    ]);
  }
  Render.vignette(ctx);
  Render.grainPass(ctx);
}

// Title: a HOLLOW/New-Game choice when a save exists, else "press any key".
// The boot keypress can't skip it (gated on the fade half-clearing).
function updateTitle() {
  if (Game.fadeV > 0 || Game.fade >= 0.5) return;

  // Dev affordance: ` toggles a chapter-select overlay so any chapter can be
  // booted directly for testing. Handled before the any-key "new game" path so
  // toggling it can't double as starting the game.
  if (Input.pressed['Backquote']) {
    Game.selecting = !Game.selecting;
    Game.selectSel = clamp(Game.selectSel, 0, LEVELS.length - 1);
    return;
  }
  if (Game.selecting) { updateChapterSelect(); return; }

  const sv = loadSave();
  const begin = () => fadeOutThen(1.6, () => {
    const newGame = !sv || Game.titleSel === 1;
    if (newGame) {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ok */ }
      loadChapter(0);
    } else if (sv.chapter !== Game.chapterIdx || sv.checkpointIdx !== Game.checkpointIdx) {
      loadChapter(sv.chapter, sv.checkpointIdx);
    }
    AudioSys.setMood(Game.chapter.mood);
    Game.state = 'play';
  });
  if (sv) {
    if (Input.menuUp() || Input.menuDown()) Game.titleSel ^= 1;
    if (Input.menuConfirm()) begin();
  } else {
    Game.titleSel = 0;
    if (Input.anyKeyThisFrame) begin();
  }
}

// Dev chapter-select overlay (open from the title with `). Up/down move the
// cursor, a digit jumps straight to that chapter, confirm enters the cursor's
// chapter, Esc closes. Does not touch the save — a jump is a clean fresh load
// (any checkpoint reached afterwards saves as usual).
function updateChapterSelect() {
  if (Input.escPressed()) { Game.selecting = false; return; }
  const n = LEVELS.length;
  if (Input.menuUp())   Game.selectSel = (Game.selectSel + n - 1) % n;
  if (Input.menuDown()) Game.selectSel = (Game.selectSel + 1) % n;
  const d = Input.digitPressed();
  if (d >= 1 && d <= n) { Game.selectSel = d - 1; jumpToChapter(d - 1); return; }
  if (Input.menuConfirm()) jumpToChapter(Game.selectSel);
}

function jumpToChapter(i) {
  Game.selecting = false;
  fadeOutThen(1.6, () => {
    loadChapter(i);
    AudioSys.setMood(Game.chapter.mood);
    Game.state = 'play';
  });
}

function drawTitle() {
  const ctx = Game.ctx;
  ctx.fillStyle = '#04060a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '58px Georgia, "Times New Roman", serif';
  const word = 'HOLLOW', stepX = 74;
  const x0 = VIEW_W / 2 - ((word.length - 1) * stepX) / 2;
  ctx.fillStyle = 'rgba(185,198,214,0.82)';
  for (let i = 0; i < word.length; i++) ctx.fillText(word[i], x0 + i * stepX, VIEW_H * 0.42);
  if (Game.selecting) {
    drawChapterSelect(ctx);
    ctx.restore();
    Render.vignette(ctx);
    Render.grainPass(ctx);
    return;
  }
  if (loadSave()) {
    const items = ['continue', 'new game'];
    ctx.font = '18px Georgia, serif';
    for (let i = 0; i < items.length; i++) {
      const on = Game.titleSel === i;
      ctx.fillStyle = on
        ? 'rgba(205,216,230,' + (0.7 + 0.15 * (Math.sin(Game.time * 3) + 1) / 2).toFixed(3) + ')'
        : 'rgba(120,135,155,0.45)';
      ctx.fillText((on ? '› ' : '  ') + items[i], VIEW_W / 2, VIEW_H * 0.60 + i * 30);
    }
  } else {
    const pulse = 0.18 + 0.10 * (Math.sin(Game.time * 1.7) + 1) / 2;
    ctx.font = '17px Georgia, serif';
    ctx.fillStyle = 'rgba(150,165,185,' + pulse.toFixed(3) + ')';
    ctx.fillText('press any key', VIEW_W / 2, VIEW_H * 0.62);
  }
  // Faint dev hint: ` opens the chapter-select.
  ctx.textAlign = 'left';
  ctx.font = '12px Georgia, serif';
  ctx.fillStyle = 'rgba(110,124,144,0.32)';
  ctx.fillText('`  chapters', 14, VIEW_H - 16);
  ctx.restore();
  Render.vignette(ctx);
  Render.grainPass(ctx);
}

function drawChapterSelect(ctx) {
  ctx.textAlign = 'center';
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = 'rgba(120,135,155,0.5)';
  ctx.fillText('JUMP TO CHAPTER', VIEW_W / 2, VIEW_H * 0.505);
  ctx.font = '16px Georgia, serif';
  const top = VIEW_H * 0.56, step = 22;
  for (let i = 0; i < LEVELS.length; i++) {
    const on = Game.selectSel === i;
    ctx.fillStyle = on
      ? 'rgba(205,216,230,' + (0.7 + 0.15 * (Math.sin(Game.time * 3) + 1) / 2).toFixed(3) + ')'
      : 'rgba(120,135,155,0.4)';
    const label = (i + 1) + '.  ' + (LEVELS[i].name || ('chapter ' + (i + 1)));
    ctx.fillText((on ? '› ' : '  ') + label, VIEW_W / 2, top + i * step);
  }
}

// Esc pause: resume / restart-at-checkpoint / mute. Play is frozen while open.
function updatePauseMenu() {
  if (Input.menuUp()) Game.pauseSel = (Game.pauseSel + 2) % 3;
  if (Input.menuDown()) Game.pauseSel = (Game.pauseSel + 1) % 3;
  if (Input.menuConfirm()) {
    if (Game.pauseSel === 0) Game.paused = false;
    else if (Game.pauseSel === 1) resetChapterState();   // clears Game.paused
    else AudioSys.toggleMute();
  }
}

function drawPause() {
  const ctx = Game.ctx;
  ctx.fillStyle = 'rgba(2,4,7,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '34px Georgia, serif';
  ctx.fillStyle = 'rgba(195,208,224,0.85)';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H * 0.34);
  const items = ['resume', 'restart', AudioSys.muted ? 'unmute' : 'mute'];
  ctx.font = '19px Georgia, serif';
  for (let i = 0; i < items.length; i++) {
    const on = Game.pauseSel === i;
    ctx.fillStyle = on ? 'rgba(210,220,234,0.92)' : 'rgba(120,135,155,0.45)';
    ctx.fillText((on ? '› ' : '  ') + items[i], VIEW_W / 2, VIEW_H * 0.50 + i * 32);
  }
  ctx.restore();
}

// --------------------------- ending cinematic ------------------------
// Walking into the Core (Ch.8) flips control: the player and every husk in the
// chamber walk in unison toward the far wall and push it open together, then a
// warm whiteout, the title card, the credits scroll, and back to the title.

const CREDITS = [
  'HOLLOW',
  '',
  '',
  'a small game in the shape',
  'of a larger silence',
  '',
  '',
  'THE FOREST',
  'THE FENCE',
  'THE YARD',
  'THE DRAINS',
  'THE HUSKS',
  'THE MACHINES',
  'THE DEEP',
  'THE CORE',
  '',
  '',
  'built procedurally —',
  'every line of it drawn, not loaded',
  '',
  '',
  'with thanks to INSIDE,',
  'for showing the way down',
  '',
  '',
  '',
  'thank you for walking',
  '',
];

function startEnding() {
  Game.state = 'ending';
  Game.helmed = null;
  Game.danger = 0;
  Game.paused = false;
  // the wall they push open: the door tagged with the '_wall' link (which no
  // signal ever satisfies, so it stays a solid wall during play)
  const wall = Game.world.doors.find(d => d.links && d.links.includes('_wall'));
  Game.ending = { phase: 'walk', t: 0, white: 0, scroll: 0, wall, opening: false, donePrompt: 0 };
  AudioSys.disconnect();
}

const ENDING_WALK = { left: false, right: true, up: false, down: false, jump: false, jumpHeld: false };

function updateEnding(dt) {
  const e = Game.ending, p = Game.player, world = Game.world, level = Game.level;
  e.t += dt;

  if (e.phase === 'walk' || e.phase === 'whiteout') {
    // unison walk: the player and EVERY husk stride right together
    updateHumanoid(p, ENDING_WALK, dt, level, collectSolids(world, p), false);
    for (const h of world.husks)
      updateHumanoid(h, ENDING_WALK, dt, level, collectSolids(world, h), false);
    // the wall: starts opening once the crowd reaches it, then they pour through
    if (e.wall) {
      const reach = p.x + p.w > e.wall.x - TILE * 1.4;
      if (reach && !e.opening) { e.opening = true; AudioSys.doorMove(); }
      if (e.opening) e.wall.openT = clamp(e.wall.openT + dt * 0.5, 0, 1);
    }
    updateCamera(dt, false);
  }

  switch (e.phase) {
    case 'walk':
      // once they've walked THROUGH the opened wall, begin the warm whiteout
      if (e.wall && e.wall.openT > 0.85 && p.x > e.wall.x + TILE) { e.phase = 'whiteout'; e.t = 0; }
      break;
    case 'whiteout':
      e.white = clamp(e.white + dt * 0.45, 0, 1);
      if (e.white >= 1 && e.t > 2.2) { e.phase = 'card'; e.t = 0; }
      break;
    case 'card':
      // hold the wordmark on white, then settle the field toward black
      if (e.t > 5.0) { e.phase = 'credits'; e.t = 0; e.scroll = 0; }
      break;
    case 'credits':
      e.scroll += dt * 34;   // px/s
      // skip to the end prompt on a key
      if (Input.anyKeyThisFrame) { e.phase = 'end'; e.t = 0; }
      else if (e.scroll > CREDITS.length * 40 + VIEW_H * 0.5) { e.phase = 'end'; e.t = 0; }
      break;
    case 'end':
      e.donePrompt = clamp(e.donePrompt + dt, 0, 1);
      // a key after the prompt has shown returns to the title (fresh save)
      if (e.t > 0.6 && Input.anyKeyThisFrame && Game.fadeV === 0) {
        fadeOutThen(1.4, () => {
          try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* ok */ }
          Game.ending = null;
          loadChapter(0);
          Game.state = 'title';
        });
      }
      break;
  }
}

function drawEnding(dt) {
  const ctx = Game.ctx, e = Game.ending;
  if (e.phase === 'walk' || e.phase === 'whiteout') {
    drawPlay(dt);
    if (e.white > 0) {
      // warm whiteout blooming from the open wall
      ctx.fillStyle = `rgba(255,248,236,${e.white.toFixed(3)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    return;
  }
  // card / credits / end: a calm field with serif text
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (e.phase === 'card') {
    // white settling toward a deep calm blue-black
    const k = clamp(e.t / 5.0, 0, 1);
    const v = Math.round(lerp(248, 6, k));
    ctx.fillStyle = `rgb(${v},${Math.round(lerp(244, 8, k))},${Math.round(lerp(232, 12, k))})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const tcol = k < 0.5 ? 90 : 200;
    ctx.font = '60px Georgia, "Times New Roman", serif';
    const word = 'HOLLOW', stepX = 76, x0 = VIEW_W / 2 - ((word.length - 1) * stepX) / 2;
    const a = clamp(Math.min(e.t / 1.0, (5.0 - e.t) / 1.0), 0, 1);
    ctx.fillStyle = `rgba(${tcol},${tcol + 8},${tcol + 20},${(0.9 * a).toFixed(3)})`;
    for (let i = 0; i < word.length; i++) ctx.fillText(word[i], x0 + i * stepX, VIEW_H * 0.44);
  } else {
    ctx.fillStyle = '#06080c';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (e.phase === 'credits') drawCredits(ctx, e);
    else {
      ctx.font = '60px Georgia, serif';
      ctx.fillStyle = 'rgba(200,210,226,0.85)';
      for (let i = 0; i < 6; i++) ctx.fillText('HOLLOW'[i], VIEW_W / 2 - 190 + i * 76, VIEW_H * 0.40);
      const pulse = 0.18 + 0.12 * (Math.sin(Game.time * 1.7) + 1) / 2;
      ctx.font = '16px Georgia, serif';
      ctx.fillStyle = `rgba(150,165,185,${(pulse * e.donePrompt).toFixed(3)})`;
      ctx.fillText('press any key', VIEW_W / 2, VIEW_H * 0.62);
    }
  }
  ctx.restore();
  Render.vignette(ctx);
  Render.grainPass(ctx);
}

function drawCredits(ctx, e) {
  const baseY = VIEW_H + 20 - e.scroll;
  for (let i = 0; i < CREDITS.length; i++) {
    const y = baseY + i * 40;
    if (y < -20 || y > VIEW_H + 20) continue;
    const line = CREDITS[i];
    const head = line === line.toUpperCase() && line.length > 2;
    ctx.font = (head ? '20px' : '16px') + ' Georgia, serif';
    // fade near the top/bottom edges
    const edge = clamp(Math.min(y, VIEW_H - y) / 80, 0, 1);
    ctx.fillStyle = `rgba(190,202,220,${(0.7 * edge).toFixed(3)})`;
    ctx.fillText(line, VIEW_W / 2, y);
  }
}

// ---------------------------- main loop ------------------------------

function frame(ts) {
  requestAnimationFrame(frame);
  const dt = clamp((ts - Game.last) / 1000, 0, 1 / 30);
  Game.last = ts;
  Game.time += dt;

  if (Game.state === 'title') {
    updateTitle();
    drawTitle();
  } else if (Game.state === 'ending') {
    updateEnding(dt);
    drawEnding(dt);
  } else {
    if (Game.state === 'play') {
      if (Input.escPressed() && Game.fadeV === 0) Game.paused = !Game.paused;
      if (Game.paused) updatePauseMenu();
      else updatePlay(dt);
    }
    drawPlay(dt);
    if (Game.paused) drawPause();
  }

  if (Game.fadeV > 0) {
    Game.fade = Math.min(1, Game.fade + Game.fadeV * dt);
    if (Game.fade >= 1) {
      Game.fadeV = 0;
      const cb = Game.onFaded;
      Game.onFaded = null;
      if (cb) cb();
    }
  } else {
    Game.fade = Math.max(0, Game.fade - dt * 1.1);
  }
  if (Game.fade > 0) {
    Game.ctx.fillStyle = 'rgba(0,0,0,' + Game.fade.toFixed(3) + ')';
    Game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  AudioSys.update(dt, Game.danger);
  Input.endFrame();
}

// ------------------------------ boot ---------------------------------

(function boot() {
  const canvas = document.getElementById('game');
  Game.canvas = canvas;
  Game.ctx = canvas.getContext('2d');
  fitCanvas(canvas);
  Render.init();
  loadChapter(0);
  Game.state = 'title';
  // AudioContext must be created inside a real user-gesture handler
  // (autoplay policy) — Input's own keydown listener doesn't count
  // for code that runs later in the rAF loop.
  window.addEventListener('keydown', () => {
    AudioSys.init();
    if (AudioSys.ctx && AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume();
  });
  requestAnimationFrame(frame);
})();
