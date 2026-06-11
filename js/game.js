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
};

// ------------------------ chapter management ------------------------

function loadChapter(i) {
  Game.chapterIdx = i;
  Game.chapter = LEVELS[i];
  Game.level = {
    w: Game.chapter.rows[0].length,
    h: Game.chapter.rows.length,
    rows: Game.chapter.rows,
  };
  Render.buildBackground(Game.chapter.bg, Game.chapter.seed);
  AudioSys.setMood(Game.chapter.mood);
  resetChapterState();
}

// Death/respawn rebuilds the whole world from defs. Checkpoint spawn
// points arrive in T3; until then you respawn at playerStart.
function resetChapterState() {
  Game.world = spawnEntities(Game.chapter.entities);
  const s = Game.chapter.playerStart;
  Game.player = makeHumanoid(s[0] * TILE + (TILE - 18) / 2, (s[1] + 1) * TILE - 42);
  Game.danger = 0;
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
  const p = Game.player, cam = Game.cam;
  cam.look = snap ? p.facing * 70 : damp(cam.look, p.facing * 70, 1.6, dt);
  const maxX = Math.max(0, Game.level.w * TILE - VIEW_W);
  const maxY = Math.max(0, Game.level.h * TILE - VIEW_H);
  const tx = clamp(p.x + p.w / 2 + cam.look - VIEW_W / 2, 0, maxX);
  const ty = clamp(p.y + p.h / 2 - VIEW_H * 0.58, 0, maxY);
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

  const ctl = {
    left: Input.left(), right: Input.right(),
    up: Input.up(), down: Input.down(),
    jump: Input.jumpPressed(), jumpHeld: Input.jumpHeld(),
  };
  const wasInWater = p.inWater;
  updateHumanoid(p, ctl, dt, level, collectSolids(world, p), true);
  if (!wasInWater && p.inWater && p.vy > 40) AudioSys.splash();

  updateBoxInteraction(p, world, dt);
  updateBoxes(world, level, dt);
  const heavies = [p, ...world.husks, ...world.boxes];
  updatePlates(world, dt, heavies);
  updateDoors(world, dt);
  updateLifts(world, dt, heavies);

  const ctx2 = Math.floor((p.x + p.w / 2) / TILE);
  const feetTy = Math.floor((p.y + p.h - 4) / TILE);
  const hidden = p.crouch && isGrassTile(tileAt(level, ctx2, feetTy));
  const li = updateLights(world, level, p, hidden, dt);
  const cr = updateCreatures(world, level, p, dt);
  Game.danger = Math.max(li.danger, cr.danger);
  if (li.killed || cr.killed) { die(true); return; }

  if (Game.fadeV === 0) {
    for (const ex of world.exits) {
      if (aabb(p, ex)) {
        fadeOutThen(1.3, () => {
          const n = Game.chapterIdx + 1;
          if (n < LEVELS.length) { loadChapter(n); Game.state = 'play'; }
          else { loadChapter(0); Game.state = 'title'; }
        });
        break;
      }
    }
  }

  updateCamera(dt, false);
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
  // entity rendering (boxes/doors/levers/...) lands in T4
  Render.water(ctx, Game.level, cam, Game.time);
  for (const h of Game.world.husks) Render.humanoid(ctx, h, cam, { huskGlow: true });
  Render.humanoid(ctx, Game.player, cam, {});
  if (ch.dark) {
    const p = Game.player;
    Render.darkness(ctx, 0.93, [
      { x: p.x + p.w / 2 - cam.x, y: p.y + p.h / 2 - cam.y, r: 140, a: 0.85 },
    ]);
  }
  if (ch.rain) Render.rainPass(ctx, dt, cam);
  else Render.motesPass(ctx, dt, Game.time);
  Render.vignette(ctx);
  Render.grainPass(ctx);
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
  const pulse = 0.18 + 0.10 * (Math.sin(Game.time * 1.7) + 1) / 2;
  ctx.font = '17px Georgia, serif';
  ctx.fillStyle = 'rgba(150,165,185,' + pulse.toFixed(3) + ')';
  ctx.fillText('press any key', VIEW_W / 2, VIEW_H * 0.62);
  ctx.restore();
  Render.vignette(ctx);
  Render.grainPass(ctx);
}

// ---------------------------- main loop ------------------------------

function frame(ts) {
  requestAnimationFrame(frame);
  const dt = clamp((ts - Game.last) / 1000, 0, 1 / 30);
  Game.last = ts;
  Game.time += dt;

  if (Game.state === 'title') {
    // fade < 0.5 so the keypress that booted the page can't skip a
    // title you haven't seen yet
    if (Input.anyKeyThisFrame && Game.fadeV === 0 && Game.fade < 0.5) {
      fadeOutThen(1.6, () => {
        AudioSys.setMood(Game.chapter.mood);
        Game.state = 'play';
      });
    }
    drawTitle();
  } else {
    if (Game.state === 'play') updatePlay(dt);
    drawPlay(dt);
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
