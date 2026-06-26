// ---------------------------------------------------------------
// HOLLOW - entities.js : interactive world objects
// ---------------------------------------------------------------
'use strict';

// Build the runtime world from a chapter's entity definitions (tile coords)
function spawnEntities(defs, seed) {
  const w = {
    boxes: [], doors: [], levers: [], plates: [], lights: [],
    husks: [], helms: [], lifts: [], creatures: [], checks: [],
    exits: [], hints: [], triggers: [], cores: [],
  };
  // Seeded so spawn (light phase, creature timer) is deterministic — same
  // chapter always boots identically and the dev harnesses are reproducible.
  const rand = makeRng((seed || 1) >>> 0);
  for (const d of defs) {
    const px = d.x * TILE, py = d.y * TILE;
    switch (d.t) {
      case 'box':
        w.boxes.push({ x: px + 1, y: py + 2, w: 30, h: 30, vx: 0, vy: 0, grounded: false });
        break;
      case 'door':
        w.doors.push({
          x: px + TILE / 2 - 6, y: py, w: 12, h: (d.h || 3) * TILE,
          links: d.links, mode: d.mode || 'all', latch: !!d.latch,
          openT: 0, open: false, _wasMoving: false,
        });
        break;
      case 'lever':
        w.levers.push({ x: px, y: py, w: TILE, h: TILE, id: d.id, on: !!d.on });
        break;
      case 'plate':
        w.plates.push({
          x: px, y: py + TILE - 8, w: (d.w || 2) * TILE, h: 8,
          id: d.id, hold: d.hold || 0, pressed: false, timer: 0, sink: 0,
        });
        break;
      case 'light':
        w.lights.push({
          x: px + TILE / 2, y: py + TILE / 2, a0: d.a0, a1: d.a1,
          speed: d.speed || 0.5, phase: d.phase || 0, len: (d.len || 11) * TILE,
          fov: d.fov || 0.30, ang: d.a0, detect: 0, t: rand() * 10, tick: 0,
          offWhen: d.offWhen || null, disabled: false,
        });
        break;
      case 'husk': {
        const h = makeHumanoid(px + 7, py + TILE - 42);
        h.isHusk = true;
        h.group = d.group || null;   // which helm controls it (null = any helm)
        w.husks.push(h);
        break;
      }
      case 'helm':
        // group: a helm only controls husks whose group matches (null group =
        // controls ALL husks — the original behaviour, kept for the testmap and
        // single-helm chapters). Lets a chapter pen each room's husks under
        // their own helm so connecting in one room doesn't move (or re-centre
        // the camera on) the husks left behind in finished rooms.
        w.helms.push({ x: px, y: py, w: TILE, h: TILE * 2, glow: 0, group: d.group || null });
        break;
      case 'lift':
        w.lifts.push({
          ax: d.ax * TILE, ay: d.ay * TILE, bx: d.bx * TILE, by: d.by * TILE,
          aw: (d.aw || d.w || 2) * TILE, bw: (d.bw || d.w || 2) * TILE,
          travel: (d.travel || 3) * TILE,
          off: (d.off || 0) * TILE, vel: 0,
          lock: d.lock || null,   // signal id (lever/plate) that FREEZES the lift (the brake)
        });
        break;
      case 'creature':
        w.creatures.push({
          x: px, y: py - 26, w: 86, h: 58, homeX: px, vx: 0,
          state: 'dormant', timer: 1.5 + rand() * 2, eye: 0,
          range: (d.range || 15) * TILE, chargeDir: 0,
          hearsHusks: !!d.hearsHusks,   // also charges/kills a noisy husk (Ch.8 mirrored stillness)
          rng: makeRng((rand() * 4294967296) >>> 0),   // own stream for state timers
        });
        break;
      case 'check':
        w.checks.push({ x: px, y: py, w: TILE, h: TILE * 2, idx: d.idx, done: false, glow: 0 });
        break;
      case 'exit':
        w.exits.push({ x: px, y: py, w: (d.w || 2) * TILE, h: (d.h || 4) * TILE });
        break;
      case 'core':
        // The Core: a glowing mass. Walking into it on the last chapter flips
        // control to the ending cinematic (see game.js updateEnding). It's a
        // trigger zone + a warm glow; never solid.
        w.cores.push({ x: px, y: py, w: (d.w || 3) * TILE, h: (d.h || 4) * TILE });
        break;
      case 'hint':
        w.hints.push({ x: px, y: py, text: d.text, r: (d.r || 5) * TILE, alpha: 0 });
        break;
      case 'trigger':
        // A scripted zone: when the player first enters, it acts on a
        // creature (index `target`). 'charge' forces an immediate lunge
        // toward the player (the chase scare); 'wake' just opens its eye.
        w.triggers.push({
          x: px, y: py, w: (d.w || 2) * TILE, h: (d.h || 4) * TILE,
          action: d.action || 'charge', target: d.target == null ? 0 : d.target,
          once: d.once !== false, fired: false,
        });
        break;
    }
  }
  return w;
}

// Solid rects that block a humanoid (excluding `self`)
function collectSolids(world, self) {
  const out = [];
  for (const b of world.boxes) if (b !== self) out.push({ x: b.x, y: b.y, w: b.w, h: b.h, ref: b });
  for (const d of world.doors) {
    const hh = d.h * (1 - d.openT);
    if (hh > 4) out.push({ x: d.x, y: d.y, w: d.w, h: hh, ref: d });
  }
  for (const L of world.lifts) {
    const r = liftRects(L);
    out.push({ ...r.a, ref: L }, { ...r.b, ref: L });
  }
  // husks are physical bodies to each OTHER (but not to the player). Without
  // this, two husks driven by the same helm input collapse onto one x against
  // a wall and can never be re-separated — stranding the puzzle and forcing a
  // checkpoint restart. The swept collision then keeps a trailing husk one
  // body-width behind the one ahead. Player<->husk stays pass-through so a roaming
  // husk can't shove the slumped body off its helm.
  if (self && self.isHusk)
    for (const h of world.husks)
      if (h !== self) out.push({ x: h.x, y: h.y, w: h.w, h: h.h, ref: h });
  return out;
}

function liftRects(L) {
  return {
    a: { x: L.ax, y: L.ay - L.off, w: L.aw, h: 12 },
    b: { x: L.bx, y: L.by + L.off, w: L.bw, h: 12 },
  };
}

// --------------------------- updates ---------------------------

function updateBoxes(world, level, dt) {
  for (const b of world.boxes) {
    const surf = waterSurfaceY(level, b.x + b.w / 2);
    if (surf !== null && b.y + b.h > surf) {
      // buoyancy: a damped spring that settles the box at the surface with
      // its top riding ~8px proud, instead of bobbing forever
      const targetTop = surf - 8;
      const err = b.y - targetTop;                 // >0 = sitting too deep
      b.vy += (-err * 14 - b.vy * 6) * dt;
      b.vy = clamp(b.vy, -120, 160);
      if (!b.dragged) b.vx = damp(b.vx, 0, 3, dt);
    } else {
      b.vy += GRAVITY * dt;
      if (b.vy > MAX_FALL) b.vy = MAX_FALL;
      // a box being pulled keeps the velocity the grab set this frame —
      // ground friction would otherwise knock it below the player's pace and
      // the grab would tear loose (sep grows). Push re-applies vx each frame,
      // so it's only pulling that needs this.
      if (!b.dragged) b.vx = damp(b.vx, 0, b.grounded ? 18 : 1.5, dt);
    }
    const res = moveEntity(b, dt, level, collectSolids(world, b), { oneway: true });
    b.grounded = res.groundRef !== null && b.vy >= 0;
    b.dragged = false;                              // re-asserted each frame by the grab
  }
}

function evalSignals(world) {
  const sig = {};
  for (const l of world.levers) if (l.on) sig[l.id] = true;
  for (const p of world.plates) if (p.pressed || p.timer > 0) sig[p.id] = true;
  return sig;
}

function updatePlates(world, dt, heavies) {
  for (const p of world.plates) {
    const zone = { x: p.x, y: p.y - 8, w: p.w, h: 16 };
    let hit = false;
    for (const h of heavies) if (aabb(zone, h)) { hit = true; break; }
    if (hit && !p.pressed) AudioSys.lever();
    p.pressed = hit;
    if (hit) p.timer = p.hold;
    else p.timer = Math.max(0, p.timer - dt);
    p.sink = damp(p.sink, hit ? 1 : 0, 12, dt);
  }
}

function updateDoors(world, dt) {
  const sig = evalSignals(world);
  for (const d of world.doors) {
    let want;
    if (d.mode === 'any') want = d.links.some(id => sig[id]);
    else want = d.links.every(id => sig[id]);
    if (d.latch && want) d.open = true;
    else if (!d.latch) d.open = want;
    const target = d.open ? 1 : 0;
    const moving = Math.abs(d.openT - target) > 0.01;
    if (moving && !d._wasMoving) AudioSys.doorMove();
    d._wasMoving = moving;
    d.openT = clamp(d.openT + (d.open ? 1 : -1) * dt * 0.9, 0, 1);
  }
}

function updateLifts(world, dt, heavies) {
  const sig = evalSignals(world);
  for (const L of world.lifts) {
    // the brake: while the lock signal is active the lift is frozen in place
    // regardless of weight (off held), so you can stand on a platform nothing
    // is counterweighting. Platforms stay solids; riders need no carry (off
    // doesn't change). Default lock=null = always free.
    if (L.lock && sig[L.lock]) { L.vel = 0; continue; }
    const r = liftRects(L);
    let wA = 0, wB = 0;
    const riders = { a: [], b: [] };
    for (const h of heavies) {
      const feet = h.y + h.h;
      if (h.x + h.w > r.a.x && h.x < r.a.x + r.a.w && Math.abs(feet - r.a.y) < 8) { wA++; riders.a.push(h); }
      if (h.x + h.w > r.b.x && h.x < r.b.x + r.b.w && Math.abs(feet - r.b.y) < 8) { wB++; riders.b.push(h); }
    }
    // platform A rides at ay - off, B at by + off, so positive off =
    // A up / B down: the heavier side must drive off the other way
    const targetVel = (wB - wA) * 58;
    L.vel = damp(L.vel, targetVel, 6, dt);
    const prevOff = L.off;
    L.off = clamp(L.off + L.vel * dt, -L.travel, L.travel);
    // platform A sits at ay - off, platform B at by + off: carry riders with them
    const dOff = L.off - prevOff;
    if (dOff !== 0) {
      for (const h of riders.a) h.y -= dOff;
      for (const h of riders.b) h.y += dOff;
    }
  }
}

function updateLights(world, level, player, hidden, dt) {
  let maxDanger = 0;
  let killed = false;
  const sig = evalSignals(world);
  for (const Lt of world.lights) {
    Lt.t += dt;
    const k = (Math.sin(Lt.t * Lt.speed * Math.PI * 2 + Lt.phase) + 1) / 2;
    Lt.ang = lerp(Lt.a0, Lt.a1, k);
    // a signal can cut the power: the cone keeps sweeping (so it's in
    // position when re-energised) but sees nothing and dims in render.
    // offWhen may be one id or a list — disabled if ANY listed signal is on.
    Lt.disabled = !!(Lt.offWhen && (Array.isArray(Lt.offWhen)
      ? Lt.offWhen.some(id => sig[id]) : sig[Lt.offWhen]));
    if (Lt.disabled) { Lt.detect = Math.max(0, Lt.detect - dt * 3); continue; }
    // detect player
    const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
    const dx = pcx - Lt.x, dy = pcy - Lt.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    let seen = false;
    if (!hidden && d < Lt.len && d > 8) {
      let da = Math.atan2(dy, dx) - Lt.ang;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) < Lt.fov / 2) {
        // raycast for occlusion (tiles + boxes + closed doors)
        seen = true;
        const steps = Math.ceil(d / 14);
        for (let i = 1; i < steps; i++) {
          const sx = Lt.x + dx * (i / steps), sy = Lt.y + dy * (i / steps);
          if (isSolidTile(tileAt(level, Math.floor(sx / TILE), Math.floor(sy / TILE)))) { seen = false; break; }
          let blocked = false;
          for (const b of world.boxes)
            if (sx > b.x && sx < b.x + b.w && sy > b.y && sy < b.y + b.h) { blocked = true; break; }
          if (!blocked) for (const dr of world.doors) {
            const hh = dr.h * (1 - dr.openT);
            if (sx > dr.x && sx < dr.x + dr.w && sy > dr.y && sy < dr.y + hh) { blocked = true; break; }
          }
          if (blocked) { seen = false; break; }
        }
      }
    }
    if (seen) {
      Lt.detect += dt * 2.4;
      Lt.tick -= dt;
      if (Lt.tick <= 0) { AudioSys.detectTick(); Lt.tick = 0.12; }
      if (Lt.detect >= 1) { killed = true; AudioSys.alarm(); }
    } else {
      Lt.detect = Math.max(0, Lt.detect - dt * 1.6);
    }
    maxDanger = Math.max(maxDanger, Lt.detect);
  }
  return { killed, danger: maxDanger };
}

function updateCreatures(world, level, player, dt) {
  let killed = false, maxDanger = 0;
  for (const c of world.creatures) {
    const pcx = player.x + player.w / 2;
    const ccx = c.x + c.w / 2;
    const near = Math.abs(pcx - ccx) < c.range && Math.abs(player.y - c.y) < 200;
    const playerNoisy = Math.abs(player.vx) > 14 || Math.abs(player.vy) > 80;

    c.timer -= dt;
    switch (c.state) {
      case 'dormant':
        c.eye = damp(c.eye, 0, 8, dt);
        if (c.timer <= 0) {
          c.state = 'waking'; c.timer = 0.8;
          if (near) AudioSys.creatureGrowl();
        }
        break;
      case 'waking':
        // no charging mid-waking: the growl is a hard 0.8 s warning —
        // a full-speed runner needs ~0.35 s just to damp below the
        // noise threshold, so charging earlier makes the tell a lie
        c.eye = damp(c.eye, 1, 5, dt);
        if (c.timer <= 0) {
          c.state = 'alert'; c.timer = 1.8 + c.rng() * 1.8;
          if (near) AudioSys.creatureOpen();
        }
        break;
      case 'alert':
        c.eye = 1;
        if (near && playerNoisy) creatureStartCharge(c, pcx);
        // mirrored stillness (Ch.8): a Listener that hears husks also lunges at
        // a husk that MOVES near its open eye — so a driven husk must freeze too.
        else if (c.hearsHusks) {
          for (const h of world.husks) {
            const hcx = h.x + h.w / 2;
            if (Math.abs(hcx - ccx) < c.range && Math.abs(h.y - c.y) < 200 &&
                (Math.abs(h.vx) > 14 || Math.abs(h.vy) > 80)) { creatureStartCharge(c, hcx); break; }
          }
        }
        if (c.timer <= 0) { c.state = 'dormant'; c.timer = 2.2 + c.rng() * 2.2; }
        break;
      case 'charge': {
        c.vx = damp(c.vx, c.chargeDir * 560, 8, dt);
        c.x += c.vx * dt;
        // stop at walls
        if (rectHitsSolidTiles(level, c.x, c.y, c.w, c.h)) {
          c.x -= c.vx * dt; c.vx = 0; c.timer = 0;
        }
        if (aabb(c, player)) killed = true;
        // a charge that catches one of your husks is also fatal (it's your body)
        if (c.hearsHusks) for (const h of world.husks) if (aabb(c, h)) killed = true;
        c.timer -= dt;
        if (c.timer <= 0 && Math.abs(c.vx) < 80) { c.state = 'return'; }
        if ((c.chargeDir > 0 && ccx > c.targetX + 90) || (c.chargeDir < 0 && ccx < c.targetX - 90)) {
          c.vx = damp(c.vx, 0, 4, dt);
          if (Math.abs(c.vx) < 40) c.state = 'return';
        }
        break;
      }
      case 'return':
        c.eye = damp(c.eye, 0, 3, dt);
        c.x = damp(c.x, c.homeX, 1.2, dt);
        if (Math.abs(c.x - c.homeX) < 6) { c.state = 'dormant'; c.timer = 2.5 + c.rng() * 2; }
        break;
    }
    if (near && c.eye > 0.4 && c.state !== 'return') maxDanger = Math.max(maxDanger, c.eye * 0.85);
    if (c.state === 'charge') maxDanger = 1;
  }
  return { killed, danger: maxDanger };
}

// Force a creature into an immediate lunge toward world-x `px`. Shared by
// the natural alert→charge path and scripted trigger zones.
function creatureStartCharge(c, px) {
  c.state = 'charge';
  c.chargeDir = px > c.x + c.w / 2 ? 1 : -1;
  c.targetX = px;
  c.timer = 2.2;
  c.vx = c.chargeDir * 120;
  AudioSys.creatureGrowl();
}

// Scripted chase zones: fire once when the player enters, acting on a
// creature. Returns nothing; mutates world.creatures.
function updateTriggers(world, player) {
  for (const z of world.triggers) {
    const inside = aabb(z, player);
    if (!inside) { if (!z.once) z.fired = false; continue; }
    if (z.fired) continue;
    z.fired = true;
    const c = world.creatures[z.target];
    if (!c) continue;
    if (z.action === 'charge') {
      creatureStartCharge(c, player.x + player.w / 2);
    } else if (z.action === 'wake') {
      c.state = 'waking'; c.timer = 0.8; c.eye = Math.max(c.eye, 0.01);
      AudioSys.creatureGrowl();
    }
  }
}
