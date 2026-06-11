// ---------------------------------------------------------------
// HOLLOW - player.js : shared physics + the player controller
// ---------------------------------------------------------------
'use strict';

const GRAVITY = 1900;
const MAX_FALL = 900;

// --- tile queries (level.rows = array of strings) ---
function tileAt(level, tx, ty) {
  if (tx < 0 || tx >= level.w) return '#';
  if (ty < 0) return '.';
  if (ty >= level.h) return '#';
  return level.rows[ty][tx];
}
function isSolidTile(c) { return c === '#'; }
function isWaterTile(c) { return c === '~'; }
function isGrassTile(c) { return c === 'G'; }
function isOnewayTile(c) { return c === '-'; }

function rectHitsSolidTiles(level, x, y, w, h) {
  const tx0 = Math.floor(x / TILE), tx1 = Math.floor((x + w - 0.01) / TILE);
  const ty0 = Math.floor(y / TILE), ty1 = Math.floor((y + h - 0.01) / TILE);
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++)
      if (isSolidTile(tileAt(level, tx, ty))) return true;
  return false;
}

// Move an entity with axis-separated collision against tiles + solid rects.
// solids: [{x,y,w,h,ref}], opts: {oneway:boolean (respect '-' tiles)}
// Returns {hitX, hitY, groundRef} where hits are 'tile' | solid.ref | null
function moveEntity(ent, dt, level, solids, opts) {
  opts = opts || {};
  const res = { hitX: null, hitY: null, groundRef: null };

  // ---- X axis ----
  let dx = ent.vx * dt;
  if (dx !== 0) {
    let nx = ent.x + dx;
    // tiles
    if (rectHitsSolidTiles(level, nx, ent.y, ent.w, ent.h)) {
      const dir = Math.sign(dx);
      // step back to tile boundary
      if (dir > 0) {
        const tx = Math.floor((nx + ent.w - 0.01) / TILE);
        nx = tx * TILE - ent.w;
      } else {
        const tx = Math.floor(nx / TILE);
        nx = (tx + 1) * TILE;
      }
      ent.vx = 0; res.hitX = 'tile';
    }
    // solid rects
    for (const s of solids) {
      // floor-like contact (top within ~4px of our feet, e.g. a floating
      // box bobbing up under a rider) is a step, not a wall
      if (s.y >= ent.y + ent.h - 4) continue;
      const r = { x: nx, y: ent.y, w: ent.w, h: ent.h };
      if (aabb(r, s)) {
        if (dx > 0) nx = Math.min(nx, s.x - ent.w);
        else nx = Math.max(nx, s.x + s.w);
        ent.vx = 0; res.hitX = s.ref || 'solid';
      }
    }
    ent.x = nx;
  }

  // ---- Y axis ----
  let dy = ent.vy * dt;
  const prevFeet = ent.y + ent.h;
  if (dy !== 0) {
    let ny = ent.y + dy;
    if (rectHitsSolidTiles(level, ent.x, ny, ent.w, ent.h)) {
      if (dy > 0) {
        const ty = Math.floor((ny + ent.h - 0.01) / TILE);
        ny = ty * TILE - ent.h;
        res.hitY = 'tile'; res.groundRef = 'tile';
      } else {
        const ty = Math.floor(ny / TILE);
        ny = (ty + 1) * TILE;
        res.hitY = 'tile';
      }
      ent.vy = 0;
    }
    // one-way platforms (only when falling, feet were above the platform top)
    if (opts.oneway && dy > 0 && res.groundRef === null) {
      const tx0 = Math.floor(ent.x / TILE), tx1 = Math.floor((ent.x + ent.w - 0.01) / TILE);
      const tyF = Math.floor((ny + ent.h - 0.01) / TILE);
      for (let tx = tx0; tx <= tx1; tx++) {
        if (isOnewayTile(tileAt(level, tx, tyF)) && prevFeet <= tyF * TILE + 0.5) {
          ny = tyF * TILE - ent.h;
          ent.vy = 0; res.hitY = 'tile'; res.groundRef = 'tile';
          break;
        }
      }
    }
    for (const s of solids) {
      const r = { x: ent.x, y: ny, w: ent.w, h: ent.h };
      if (aabb(r, s)) {
        if (dy > 0 && prevFeet <= s.y + 6) {
          ny = s.y - ent.h;
          res.groundRef = s.ref || 'solid';
        } else if (dy < 0) {
          ny = Math.max(ny, s.y + s.h);
        } else continue;
        ent.vy = 0; res.hitY = s.ref || 'solid';
      }
    }
    ent.y = ny;
  }

  // grounded probe (1px below feet)
  if (res.groundRef === null) {
    if (rectHitsSolidTiles(level, ent.x, ent.y + 1, ent.w, ent.h)) res.groundRef = 'tile';
    else {
      // oneway under feet
      if (opts.oneway) {
        const tx0 = Math.floor(ent.x / TILE), tx1 = Math.floor((ent.x + ent.w - 0.01) / TILE);
        const tyF = Math.floor((ent.y + ent.h + 1) / TILE);
        const feet = ent.y + ent.h;
        for (let tx = tx0; tx <= tx1; tx++) {
          if (isOnewayTile(tileAt(level, tx, tyF)) && Math.abs(feet - tyF * TILE) < 2) { res.groundRef = 'tile'; break; }
        }
      }
      if (res.groundRef === null) {
        for (const s of solids) {
          const r = { x: ent.x, y: ent.y + 2, w: ent.w, h: ent.h };
          if (aabb(r, s) && ent.y + ent.h <= s.y + 6) { res.groundRef = s.ref || 'solid'; break; }
        }
      }
    }
  }
  return res;
}

function centerInWater(level, ent) {
  const cx = Math.floor((ent.x + ent.w / 2) / TILE);
  const cy = Math.floor((ent.y + ent.h / 2) / TILE);
  return isWaterTile(tileAt(level, cx, cy));
}
function headInWater(level, ent) {
  const cx = Math.floor((ent.x + ent.w / 2) / TILE);
  const cy = Math.floor((ent.y + 6) / TILE);
  return isWaterTile(tileAt(level, cx, cy));
}

// ----------------------------------------------------------------
// Humanoid mover: shared by the player and husks.
// ctl = {left,right,jump,jumpHeld,down} booleans for this frame.
// ----------------------------------------------------------------
function makeHumanoid(x, y) {
  return {
    x, y, w: 18, h: 42, vx: 0, vy: 0,
    facing: 1, grounded: false, inWater: false, crouch: false,
    runPhase: 0, airTime: 0, coyote: 0, jumpBuf: 0,
    mantle: null,        // {t, fromX, fromY, toX, toY}
    pushTimer: 0, stepTimer: 0,
    lastHitX: null,      // moveEntity hitX from this frame (game.js push check)
    grabbing: false, grabbedBox: null,
    jumpFromY: y,        // y of last solid footing (caps mantle climb height)
    state: 'idle',
  };
}

function updateHumanoid(p, ctl, dt, level, solids, sounds) {
  // --- mantle in progress: scripted move ---
  if (p.mantle) {
    p.mantle.t += dt / 0.28;
    const t = Math.min(1, p.mantle.t);
    const e = t * t * (3 - 2 * t);
    p.x = lerp(p.mantle.fromX, p.mantle.toX, e);
    p.y = lerp(p.mantle.fromY, p.mantle.toY, e);
    p.vx = 0; p.vy = 0;
    p.state = 'mantle';
    if (t >= 1) { p.mantle = null; p.grounded = true; }
    return;
  }

  p.inWater = centerInWater(level, p);
  p.crouch = !!(ctl.down && p.grounded && !p.inWater);

  const accel = p.inWater ? 600 : (p.grounded ? 1700 : 1100);
  const maxSpd = p.inWater ? 130 : (p.crouch ? 80 : (p.grabbing ? 90 : 215));
  const fric = p.inWater ? 3 : (p.grounded ? 14 : 2.5);

  let move = 0;
  if (ctl.left) move -= 1;
  if (ctl.right) move += 1;
  if (move !== 0) p.facing = move;

  p.vx += move * accel * dt;
  if (move === 0) p.vx = damp(p.vx, 0, fric, dt);
  p.vx = clamp(p.vx, -maxSpd, maxSpd);

  // --- vertical ---
  if (p.inWater) {
    p.vy += 380 * dt;                      // weak sink
    if (ctl.jumpHeld || ctl.up) p.vy -= 1150 * dt;  // swim up
    if (ctl.down) p.vy += 700 * dt;
    p.vy = damp(p.vy, 0, 2.2, dt);
    p.vy = clamp(p.vy, -240, 240);
  } else {
    p.vy += GRAVITY * dt;
    if (p.vy > MAX_FALL) p.vy = MAX_FALL;
    // variable jump height
    if (p.vy < 0 && !ctl.jumpHeld) p.vy += GRAVITY * 1.3 * dt;
  }

  // jump buffering + coyote time
  p.coyote = p.grounded ? 0.1 : Math.max(0, p.coyote - dt);
  p.jumpBuf = ctl.jump ? 0.12 : Math.max(0, p.jumpBuf - dt);
  if (p.jumpBuf > 0 && (p.coyote > 0 || p.inWater)) {
    if (p.inWater) {
      // jump out only near the surface
      const headTy = Math.floor((p.y + 4) / TILE);
      const cx = Math.floor((p.x + p.w / 2) / TILE);
      if (!isWaterTile(tileAt(level, cx, headTy - 1)) && p.y + 8 < (headTy + 1) * TILE) {
        p.vy = -560; p.jumpBuf = 0;
        if (sounds) AudioSys.splash();
      }
    } else {
      p.vy = -640; p.jumpBuf = 0; p.coyote = 0;
      if (sounds) AudioSys.jump();
    }
  }

  const wasGrounded = p.grounded;
  const wasVy = p.vy;
  const res = moveEntity(p, dt, level, solids, { oneway: true });
  p.grounded = res.groundRef !== null && p.vy >= 0;
  p.lastHitX = res.hitX;
  // remember the height of the last solid footing; mantle uses it to cap
  // total climb (water counts: you can always haul out onto a low ledge)
  if (p.grounded || p.inWater) p.jumpFromY = p.y;

  if (!wasGrounded && p.grounded && wasVy > 380 && sounds) AudioSys.land();
  if (p.inWater && !centerInWater(level, { ...p, y: p.y - p.vy * dt })) { /* noop */ }

  // --- ledge mantle: pressing into a wall while airborne ---
  if (!p.grounded && !p.inWater && move !== 0 && res.hitX === 'tile' && p.vy > -120) {
    const tx = move > 0 ? Math.floor((p.x + p.w + 2) / TILE) : Math.floor((p.x - 2) / TILE);
    const chestTy = Math.floor((p.y + p.h * 0.45) / TILE);
    // find the wall tile at chest height, check the two tiles above it are free
    if (isSolidTile(tileAt(level, tx, chestTy)) &&
        !isSolidTile(tileAt(level, tx, chestTy - 1)) &&
        !isSolidTile(tileAt(level, tx, chestTy - 2))) {
      const ledgeTopY = chestTy * TILE;
      // total climb from last footing must stay under ~3.2 tiles: keeps
      // 3-tile walls mantleable but 4-tile walls impossible without a box
      const climb = (p.jumpFromY + p.h) - ledgeTopY;
      if (climb <= 102 && ledgeTopY > p.y - 6 && ledgeTopY < p.y + p.h * 0.7) {
        const toX = move > 0 ? tx * TILE + 4 : tx * TILE + TILE - p.w - 4;
        const toY = ledgeTopY - p.h;
        // make sure the player fits up there
        if (!rectHitsSolidTiles(level, toX, toY, p.w, p.h)) {
          p.mantle = { t: 0, fromX: p.x, fromY: p.y, toX, toY };
          if (sounds) AudioSys.land();
        }
      }
    }
  }

  // --- animation state + footsteps ---
  const spd = Math.abs(p.vx);
  if (p.inWater) p.state = 'swim';
  else if (!p.grounded) p.state = p.vy < 0 ? 'jump' : 'fall';
  else if (p.crouch) p.state = 'crouch';
  else if (p.pushTimer > 0) p.state = 'push';
  else if (spd > 20) p.state = 'run';
  else p.state = 'idle';
  p.pushTimer = Math.max(0, p.pushTimer - dt);

  if (p.state === 'run' || p.state === 'push') {
    // ~1.9 stride cycles/s at full run; footsteps on each foot-plant
    // (half cycle) so audio stays locked to the legs
    const prevPlant = Math.floor(p.runPhase * 2);
    p.runPhase += spd * dt * 0.009;
    if (Math.floor(p.runPhase * 2) !== prevPlant && sounds) AudioSys.step();
  } else {
    p.runPhase = damp(p.runPhase, Math.round(p.runPhase), 10, dt);
  }
}
