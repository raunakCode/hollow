// ---------------------------------------------------------------
// HOLLOW - render.js : silhouettes, parallax, fog, light, post fx
// ---------------------------------------------------------------
'use strict';

const Render = {
  bgLayers: [],      // [{canvas, factor}]
  grain: null,
  rain: [],
  motes: [],
  darkCanvas: null,

  init() {
    // film grain tile
    const g = document.createElement('canvas');
    g.width = 160; g.height = 160;
    const gc = g.getContext('2d');
    const img = gc.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 26;
    }
    gc.putImageData(img, 0, 0);
    this.grain = g;

    this.darkCanvas = document.createElement('canvas');
    this.darkCanvas.width = VIEW_W; this.darkCanvas.height = VIEW_H;

    for (let i = 0; i < 160; i++)
      this.rain.push({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, s: 500 + Math.random() * 350, l: 10 + Math.random() * 14 });
    for (let i = 0; i < 40; i++)
      this.motes.push({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, vx: 4 + Math.random() * 8, ph: Math.random() * 9 });
  },

  // ------------- parallax background generation -------------
  buildBackground(kind, seed) {
    this.bgLayers = [];
    const rng = makeRng(seed);
    const make = (factor, draw) => {
      const c = document.createElement('canvas');
      c.width = 2048; c.height = VIEW_H + 200;
      draw(c.getContext('2d'), c.width, c.height);
      this.bgLayers.push({ canvas: c, factor });
    };

    const treeLayer = (ctx, W, H, col, baseY, scale) => {
      ctx.fillStyle = col;
      let x = 0;
      while (x < W) {
        const tw = (10 + rng() * 22) * scale;
        const th = (160 + rng() * 220) * scale;
        // trunk
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x + tw * 0.34, baseY - th);
        ctx.lineTo(x + tw * 0.66, baseY - th);
        ctx.lineTo(x + tw, baseY);
        ctx.fill();
        // branches
        const nb = 2 + Math.floor(rng() * 4);
        for (let i = 0; i < nb; i++) {
          const by = baseY - th * (0.4 + rng() * 0.55);
          const bl = (26 + rng() * 60) * scale;
          const dir = rng() < 0.5 ? -1 : 1;
          ctx.save();
          ctx.translate(x + tw / 2, by);
          ctx.rotate(dir * (0.5 + rng() * 0.7));
          ctx.fillRect(0, -2 * scale, bl, 4 * scale);
          ctx.restore();
        }
        x += tw + 16 + rng() * 90;
      }
      ctx.fillRect(0, baseY, W, H - baseY);
    };

    const buildingLayer = (ctx, W, H, col, baseY, scale, lit) => {
      ctx.fillStyle = col;
      let x = 0;
      while (x < W) {
        const bw = (60 + rng() * 160) * scale;
        const bh = (90 + rng() * 260) * scale;
        ctx.fillRect(x, baseY - bh, bw, bh + (H - baseY));
        if (rng() < 0.5) { // antenna / chimney
          const ax = x + bw * rng();
          ctx.fillRect(ax, baseY - bh - 38 * scale, 4 * scale, 40 * scale);
        }
        if (lit && rng() < 0.65) { // a few dim windows
          ctx.save();
          ctx.fillStyle = 'rgba(190,200,170,0.10)';
          const nw = 1 + Math.floor(rng() * 4);
          for (let i = 0; i < nw; i++)
            ctx.fillRect(x + 8 + rng() * (bw - 20), baseY - bh + 10 + rng() * (bh - 30), 6, 9);
          ctx.restore();
          ctx.fillStyle = col;
        }
        x += bw + 20 + rng() * 110;
      }
      ctx.fillRect(0, baseY, W, H - baseY);
    };

    const pillarLayer = (ctx, W, H, col, scale) => {
      ctx.fillStyle = col;
      let x = 30;
      while (x < W) {
        const pw = (24 + rng() * 50) * scale;
        ctx.fillRect(x, 0, pw, H);
        if (rng() < 0.7) { // hanging cable
          const cx0 = x + pw + 30 + rng() * 120;
          const sag = 60 + rng() * 120;
          ctx.beginPath();
          ctx.moveTo(x + pw, 60 + rng() * 100);
          ctx.quadraticCurveTo(cx0, sag + 160, cx0 + 90 + rng() * 80, 40 + rng() * 120);
          ctx.lineWidth = 2.5 * scale; ctx.strokeStyle = col; ctx.stroke();
        }
        x += pw + 130 + rng() * 260;
      }
    };

    const cavernLayer = (ctx, W, H, col, scale) => {
      ctx.fillStyle = col;
      // ceiling stalactites
      ctx.beginPath(); ctx.moveTo(0, 0);
      let x = 0;
      while (x < W) {
        const len = (40 + rng() * 150) * scale;
        const wdt = 30 + rng() * 80;
        ctx.lineTo(x + wdt / 2, len);
        ctx.lineTo(x + wdt, 10 + rng() * 40);
        x += wdt;
      }
      ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
      // floor mounds
      for (let i = 0; i < 14; i++) {
        const mx = rng() * W, mw = 80 + rng() * 220, mh = 30 + rng() * 90;
        ctx.beginPath();
        ctx.ellipse(mx, H, mw, mh, 0, Math.PI, 0);
        ctx.fill();
      }
    };

    if (kind === 'forest') {
      make(0.12, (c, W, H) => treeLayer(c, W, H, 'rgba(16,22,30,0.9)', H - 60, 0.7));
      make(0.3,  (c, W, H) => treeLayer(c, W, H, 'rgba(10,14,20,0.95)', H - 40, 1.0));
      make(0.55, (c, W, H) => treeLayer(c, W, H, 'rgba(8,12,18,1)', H - 14, 1.5));
    } else if (kind === 'facility') {
      make(0.1,  (c, W, H) => buildingLayer(c, W, H, 'rgba(17,23,32,0.9)', H - 70, 0.8, true));
      make(0.3,  (c, W, H) => buildingLayer(c, W, H, 'rgba(10,14,20,0.95)', H - 40, 1.1, true));
      make(0.55, (c, W, H) => treeLayer(c, W, H, 'rgba(8,12,18,1)', H - 10, 1.2));
    } else if (kind === 'interior') {
      make(0.15, (c, W, H) => pillarLayer(c, W, H, 'rgba(15,20,28,0.85)', 0.8));
      make(0.4,  (c, W, H) => pillarLayer(c, W, H, 'rgba(8,12,17,0.95)', 1.2));
    } else if (kind === 'cavern') {
      make(0.15, (c, W, H) => cavernLayer(c, W, H, 'rgba(13,17,24,0.9)', 0.8));
      make(0.4,  (c, W, H) => cavernLayer(c, W, H, 'rgba(7,10,15,0.97)', 1.3));
    }
  },

  // --------------------------- frame ---------------------------
  sky(ctx, pal, time) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, pal.sky0);
    g.addColorStop(1, pal.sky1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // distant glow on horizon (the place you are walking toward)
    const gx = VIEW_W * 0.5, gy = VIEW_H * 0.62;
    const rg = ctx.createRadialGradient(gx, gy, 10, gx, gy, 420);
    rg.addColorStop(0, pal.horizonGlow || 'rgba(120,140,160,0.10)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  },

  parallax(ctx, cam) {
    for (const L of this.bgLayers) {
      const W = L.canvas.width;
      let ox = -((cam.x * L.factor) % W);
      const oy = -60 - cam.y * L.factor * 0.3;
      if (ox > 0) ox -= W;
      for (let x = ox; x < VIEW_W; x += W) ctx.drawImage(L.canvas, x, oy);
    }
  },

  fogBand(ctx, cam, time, color) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const y = VIEW_H * (0.55 + i * 0.16) + Math.sin(time * 0.1 + i * 2) * 12;
      const x = ((time * (8 + i * 5) + i * 400 - cam.x * 0.2) % (VIEW_W + 800)) - 400;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 320);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    ctx.restore();
  },

  // ------------------------ world tiles ------------------------
  tiles(ctx, level, cam, time) {
    const tx0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const tx1 = Math.min(level.w - 1, Math.ceil((cam.x + VIEW_W) / TILE) + 1);
    const ty0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const ty1 = Math.min(level.h - 1, Math.ceil((cam.y + VIEW_H) / TILE) + 1);

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const c = tileAt(level, tx, ty);
        const x = tx * TILE - cam.x, y = ty * TILE - cam.y;
        if (c === '#') {
          ctx.fillStyle = '#06080c';
          ctx.fillRect(x, y, TILE + 1, TILE + 1);
          // exposed surface = a crisp highlight lip with the ground DARKENING
          // just beneath it (an AO groove), so the top reads as a hard edge the
          // figure clearly stands ON. (The old fix lightened the ground going
          // downward, which put the brightest band right under the feet and
          // read as a lit pocket the legs were sunk into — "stuck in ground".)
          if (!isSolidTile(tileAt(level, tx, ty - 1))) {
            const grad = ctx.createLinearGradient(0, y + 1.5, 0, y + 9);
            grad.addColorStop(0, 'rgba(0,0,0,0.0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.5)');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y + 1.5, TILE + 1, 7.5);
            ctx.fillStyle = 'rgba(180,200,220,0.36)';
            ctx.fillRect(x, y, TILE + 1, 1.5);
          }
        } else if (c === '-') {
          ctx.fillStyle = '#0a0d13';
          ctx.fillRect(x, y, TILE + 1, 7);
          ctx.fillStyle = 'rgba(150,170,190,0.12)';
          ctx.fillRect(x, y, TILE + 1, 2);
        } else if (c === 'G') {
          // grass tufts (deterministic per tile)
          const r = makeRng(tx * 7919 + ty * 104729);
          ctx.strokeStyle = 'rgba(8,11,16,0.95)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 7; i++) {
            const bx = x + 2 + r() * (TILE - 4);
            const hgt = 12 + r() * 20;
            const sway = Math.sin(time * 1.4 + bx * 0.12) * 3;
            ctx.beginPath();
            ctx.moveTo(bx, y + TILE);
            ctx.quadraticCurveTo(bx + sway, y + TILE - hgt * 0.6, bx + sway * 1.8, y + TILE - hgt);
            ctx.stroke();
          }
        }
      }
    }
  },

  water(ctx, level, cam, time) {
    const tx0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const tx1 = Math.min(level.w - 1, Math.ceil((cam.x + VIEW_W) / TILE) + 1);
    const ty0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const ty1 = Math.min(level.h - 1, Math.ceil((cam.y + VIEW_H) / TILE) + 1);
    ctx.fillStyle = 'rgba(20,34,48,0.62)';
    for (let ty = ty0; ty <= ty1; ty++)
      for (let tx = tx0; tx <= tx1; tx++)
        if (tileAt(level, tx, ty) === '~') {
          const x = tx * TILE - cam.x, y = ty * TILE - cam.y;
          ctx.fillRect(x, y, TILE + 1, TILE + 1);
          if (tileAt(level, tx, ty - 1) !== '~') {
            const wob = Math.sin(time * 2 + tx * 0.9) * 2;
            ctx.fillStyle = 'rgba(160,190,210,0.18)';
            ctx.fillRect(x, y + wob, TILE + 1, 2);
            ctx.fillStyle = 'rgba(20,34,48,0.62)';
          }
        }
  },

  // ------------------- interactive entities ---------------------
  // Basic silhouettes so nothing collidable is invisible; T4 styles
  // these properly (and adds levers, lights, helms, lifts, etc).
  box(ctx, b, cam) {
    const x = b.x - cam.x, y = b.y - cam.y;
    ctx.fillStyle = '#080a0f';
    ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = 'rgba(150,170,190,0.14)';   // top catch-light, like tiles
    ctx.fillRect(x, y, b.w, 2);
    ctx.strokeStyle = 'rgba(150,170,190,0.07)'; // plank seams
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2.5, y + 2.5, b.w - 5, b.h - 5);
    ctx.beginPath();
    ctx.moveTo(x + 2, y + b.h / 2);
    ctx.lineTo(x + b.w - 2, y + b.h / 2);
    ctx.stroke();
  },

  door(ctx, d, cam) {
    const hh = d.h * (1 - d.openT);          // matches the physics rect
    const x = d.x - cam.x, y = d.y - cam.y;
    // frame posts either side, full height
    ctx.fillStyle = '#05070b';
    ctx.fillRect(x - 4, y, 4, d.h);
    ctx.fillRect(x + d.w, y, 4, d.h);
    if (hh > 1) {
      ctx.fillStyle = '#0a0d13';
      ctx.fillRect(x, y, d.w, hh);
      ctx.fillStyle = 'rgba(150,170,190,0.12)'; // leading (bottom) edge
      ctx.fillRect(x, y + hh - 2, d.w, 2);
    }
  },

  plate(ctx, p, cam) {
    const sink = p.sink * 5;
    const x = p.x - cam.x, y = p.y - cam.y + sink;
    ctx.fillStyle = '#0a0d13';
    ctx.fillRect(x + 2, y, p.w - 4, p.h - sink + 2);
    ctx.fillStyle = p.pressed ? 'rgba(190,205,225,0.22)' : 'rgba(150,170,190,0.12)';
    ctx.fillRect(x + 2, y, p.w - 4, 2);
  },

  lever(ctx, l, cam) {
    const bx = l.x + l.w / 2 - cam.x, by = l.y + l.h - cam.y;
    ctx.fillStyle = '#080a0f';
    ctx.fillRect(bx - 7, by - 6, 14, 6);             // base
    const ang = l.on ? 0.6 : -0.6;                   // stick leans by state
    ctx.strokeStyle = '#0a0d13';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, by - 5);
    ctx.lineTo(bx + Math.sin(ang) * 20, by - 5 - Math.cos(ang) * 20);
    ctx.stroke();
    ctx.fillStyle = l.on ? 'rgba(190,205,225,0.5)' : 'rgba(150,170,190,0.18)';
    ctx.beginPath();
    ctx.arc(bx + Math.sin(ang) * 20, by - 5 - Math.cos(ang) * 20, 3, 0, Math.PI * 2);
    ctx.fill();
  },

  // distance from the fixture (wx,wy) along `ang` to the first occluder
  // (solid tile, box, or closed door) within maxLen — same occluders the
  // detection raycast in updateLights() uses, so the visible shadow matches
  // exactly where the player is actually hidden.
  _coneRayHit(level, world, wx, wy, ang, maxLen) {
    const cs = Math.cos(ang), sn = Math.sin(ang);
    for (let d = 8; d <= maxLen; d += 5) {
      const sx = wx + cs * d, sy = wy + sn * d;
      if (level && isSolidTile(tileAt(level, Math.floor(sx / TILE), Math.floor(sy / TILE)))) return d;
      if (world) {
        for (const b of world.boxes) if (sx > b.x && sx < b.x + b.w && sy > b.y && sy < b.y + b.h) return d;
        for (const dr of world.doors) {
          const hh = dr.h * (1 - dr.openT);
          if (hh > 4 && sx > dr.x && sx < dr.x + dr.w && sy > dr.y && sy < dr.y + hh) return d;
        }
      }
    }
    return maxLen;
  },

  lightCone(ctx, Lt, cam, level, world) {
    const x = Lt.x - cam.x, y = Lt.y - cam.y;
    // fixture
    ctx.fillStyle = '#05070b';
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    // beam: soft gradient wedge, brightens as detection fills. A
    // signal-disabled fixture goes dark (just a faint dead glow).
    const a = Lt.disabled ? 0.012 : 0.10 + Lt.detect * 0.22;
    const g = ctx.createRadialGradient(x, y, 10, x, y, Lt.len);
    g.addColorStop(0, `rgba(200,215,235,${(a * 1.4).toFixed(3)})`);
    g.addColorStop(0.7, `rgba(190,205,230,${a.toFixed(3)})`);
    g.addColorStop(1, 'rgba(190,205,230,0)');
    ctx.fillStyle = g;
    // fan of rays across the fov, each stopped at the first occluder: walls
    // clip the beam and a pushed box carves a visible shadow behind it.
    const N = Math.max(18, Math.round(Lt.fov / 0.012));
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i <= N; i++) {
      const ra = Lt.ang - Lt.fov / 2 + Lt.fov * (i / N);
      const d = this._coneRayHit(level, world, Lt.x, Lt.y, ra, Lt.len);
      ctx.lineTo(x + Math.cos(ra) * d, y + Math.sin(ra) * d);
    }
    ctx.closePath();
    ctx.fill();
  },

  helm(ctx, h, cam, time) {
    const cx = h.x + h.w / 2 - cam.x, top = h.y - cam.y;
    // cable from above
    ctx.strokeStyle = '#05070b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, top - 200);
    ctx.lineTo(cx, top + 14);
    ctx.stroke();
    // the helmet: a small dark dome at head height
    ctx.fillStyle = '#080a0f';
    ctx.beginPath(); ctx.arc(cx, top + 20, 8, Math.PI, 0); ctx.fill();
    ctx.fillRect(cx - 8, top + 20, 16, 4);
    // faint glow, stronger while connected (h.glow driven by game.js)
    const a = 0.10 + h.glow * 0.30 + Math.sin(time * 2.1) * 0.03;
    const g = ctx.createRadialGradient(cx, top + 20, 1, cx, top + 20, 26);
    g.addColorStop(0, `rgba(190,210,255,${a.toFixed(3)})`);
    g.addColorStop(1, 'rgba(190,210,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 26, top - 6, 52, 52);
  },

  lift(ctx, L, cam) {
    const r = liftRects(L);
    const beamY = Math.min(L.ay, L.by) - L.travel - 26 - cam.y;
    // overhead beam spanning both rope pairs
    ctx.fillStyle = '#05070b';
    const bx0 = Math.min(r.a.x, r.b.x) - 6 - cam.x;
    const bx1 = Math.max(r.a.x + r.a.w, r.b.x + r.b.w) + 6 - cam.x;
    ctx.fillRect(bx0, beamY - 5, bx1 - bx0, 5);
    ctx.strokeStyle = 'rgba(150,170,190,0.16)';
    ctx.lineWidth = 2;
    for (const pf of [r.a, r.b]) {
      const x = pf.x - cam.x, y = pf.y - cam.y;
      ctx.beginPath();
      ctx.moveTo(x + 4, y); ctx.lineTo(x + 4, beamY);
      ctx.moveTo(x + pf.w - 4, y); ctx.lineTo(x + pf.w - 4, beamY);
      ctx.stroke();
      // platform slab
      ctx.fillStyle = '#0a0d13';
      ctx.fillRect(x, y, pf.w, pf.h);
      ctx.fillStyle = 'rgba(150,170,190,0.14)';
      ctx.fillRect(x, y, pf.w, 2);
    }
  },

  creature(ctx, c, cam, time) {
    const x = c.x - cam.x, y = c.y - cam.y;
    const breathe = Math.sin(time * 1.1) * 2;
    ctx.fillStyle = '#05070b';
    ctx.beginPath();
    ctx.ellipse(x + c.w / 2, y + c.h * 0.62 + breathe * 0.3, c.w / 2, c.h * 0.55 - breathe * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // hunched shoulder mass
    ctx.beginPath();
    ctx.ellipse(x + c.w * 0.38, y + c.h * 0.3 + breathe * 0.5, c.w * 0.3, c.h * 0.34, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // the eye: opens with c.eye
    if (c.eye > 0.03) {
      const ex = x + c.w * 0.30, ey = y + c.h * 0.26 + breathe * 0.5;
      const g = ctx.createRadialGradient(ex, ey, 0.5, ex, ey, 16);
      g.addColorStop(0, `rgba(225,235,255,${(0.75 * c.eye).toFixed(3)})`);
      g.addColorStop(0.25, `rgba(180,200,235,${(0.4 * c.eye).toFixed(3)})`);
      g.addColorStop(1, 'rgba(180,200,235,0)');
      ctx.fillStyle = g;
      ctx.fillRect(ex - 16, ey - 16, 32, 32);
      ctx.fillStyle = `rgba(230,240,255,${(0.85 * c.eye).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 3.4, 3.4 * c.eye, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  check(ctx, c, cam, time) {
    const cx = c.x + c.w / 2 - cam.x, by = c.y + c.h - cam.y;
    ctx.strokeStyle = '#080a0f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, by);
    ctx.lineTo(cx, by - 40);
    ctx.stroke();
    ctx.fillStyle = '#080a0f';
    ctx.fillRect(cx - 5, by - 46, 10, 8);
    const a = (c.done ? 0.30 : 0.12) + Math.sin(time * 1.3) * 0.03;
    const g = ctx.createRadialGradient(cx, by - 42, 1, cx, by - 42, 30);
    g.addColorStop(0, `rgba(215,225,240,${a.toFixed(3)})`);
    g.addColorStop(1, 'rgba(215,225,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 30, by - 72, 60, 60);
  },

  exitGlow(ctx, e, cam, time) {
    const x = e.x - cam.x, y = e.y - cam.y;
    const pulse = 0.16 + Math.sin(time * 0.8) * 0.03;
    const g = ctx.createLinearGradient(x, y, x, y + e.h);
    g.addColorStop(0, `rgba(210,220,235,${(pulse * 0.4).toFixed(3)})`);
    g.addColorStop(1, `rgba(210,220,235,${pulse.toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, e.w, e.h);
  },

  // The Core: a warm pulsing glowing mass (the ending trigger). A bright,
  // breathing radial bloom with a hot center — the one warm light in the game.
  core(ctx, c, cam, time) {
    const cx = c.x + c.w / 2 - cam.x, cy = c.y + c.h * 0.55 - cam.y;
    const pulse = 0.5 + 0.5 * (Math.sin(time * 1.1) + Math.sin(time * 2.7) * 0.4);
    const R = c.w * (1.4 + 0.12 * pulse);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, R);
    g.addColorStop(0, `rgba(255,240,210,${(0.55 + 0.2 * pulse).toFixed(3)})`);
    g.addColorStop(0.25, `rgba(245,200,140,${(0.30 + 0.12 * pulse).toFixed(3)})`);
    g.addColorStop(0.6, 'rgba(220,150,90,0.10)');
    g.addColorStop(1, 'rgba(200,120,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // hot core
    const hot = ctx.createRadialGradient(cx, cy, 1, cx, cy, c.w * 0.42);
    hot.addColorStop(0, `rgba(255,250,235,${(0.7 + 0.25 * pulse).toFixed(3)})`);
    hot.addColorStop(1, 'rgba(255,235,200,0)');
    ctx.fillStyle = hot;
    ctx.fillRect(cx - c.w * 0.5, cy - c.w * 0.5, c.w, c.w);
    ctx.restore();
  },

  // Faint serif key-glyph caption, fades in by proximity (alpha set in
  // game.js). Drawn in world space; no box, no chrome — just dim letters.
  hint(ctx, h, cam) {
    if (h.alpha < 0.01) return;
    const x = h.x - cam.x, y = h.y - cam.y;
    ctx.save();
    ctx.globalAlpha = h.alpha * 0.55;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '20px Georgia, "Times New Roman", serif';
    ctx.fillStyle = 'rgba(205,215,230,1)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(h.text, x, y);
    ctx.restore();
  },

  // ---------------------- humanoid figure ----------------------
  humanoid(ctx, p, cam, opts) {
    opts = opts || {};
    const cx = p.x + p.w / 2 - cam.x;
    const feet = p.y + p.h - cam.y;
    const col = opts.color || '#0b0d11';
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = col;
    ctx.fillStyle = col;

    let hipY = feet - 19, headR = 5.6, lean = clamp(p.vx * 0.0011, -0.3, 0.3);
    const ph = p.runPhase * Math.PI * 2;
    let legA = { hx: 0, fy: feet, fx: cx }, legB = { fy: feet, fx: cx };

    if (p.state === 'swim') {
      hipY = feet - 12;
      lean = p.facing * 0.9;
    } else if (p.state === 'crouch') {
      hipY = feet - 12;
    } else if (p.state === 'run' || p.state === 'push') {
      const stride = p.state === 'push' ? 6 : 11;
      legA.fx = cx + Math.sin(ph) * stride * p.facing;
      legA.fy = feet - Math.max(0, Math.sin(ph + Math.PI / 2)) * 7;
      legB.fx = cx + Math.sin(ph + Math.PI) * stride * p.facing;
      legB.fy = feet - Math.max(0, Math.sin(ph + Math.PI * 1.5)) * 7;
      lean = p.facing * (p.state === 'push' ? 0.42 : 0.18);
      hipY = feet - 18 + Math.abs(Math.sin(ph)) * 1.5;
    } else if (p.state === 'jump' || p.state === 'fall') {
      legA.fx = cx + 7 * p.facing; legA.fy = feet - 6;
      legB.fx = cx - 5 * p.facing; legB.fy = feet - 1;
      lean = p.facing * 0.12;
    } else {
      legA.fx = cx - 4; legB.fx = cx + 4;
    }

    // The legs are stroked with round caps, so the rounded "toe" extends half
    // a line-width BELOW the foot endpoint. With the foot endpoint sitting at
    // p.y+p.h (the true floor contact), that overshoot pokes ~3.5px under the
    // ground lip and reads as the figure being sunk into the ground — worst
    // next to a tall dark door/box that gives the eye a vertical reference.
    // Lift the planted foot by the widest (rim) cap radius so the toe rests ON
    // the floor line instead of through it.
    const footCap = (4.5 + 2.6) / 2;
    legA.fy = Math.min(legA.fy, feet - footCap);
    legB.fy = Math.min(legB.fy, feet - footCap);

    const shY = hipY - 14 + (p.state === 'crouch' ? 5 : 0);
    const shX = cx + Math.sin(lean) * 10;
    const headX = shX + Math.sin(lean) * 6;
    const headY = shY - 8 + (p.state === 'crouch' ? 2 : 0);

    const armSwing = (p.state === 'run') ? Math.sin(ph + Math.PI) * 8 * p.facing : 2 * p.facing;
    const reach = (p.state === 'push' || p.grabbing) ? 13 * p.facing : armSwing;

    const drawFigure = (widen) => {
      // legs (hip -> knee -> foot)
      const drawLeg = (fx, fy) => {
        const kx = (cx + fx) / 2 + p.facing * 3, ky = (hipY + fy) / 2 - 2;
        ctx.lineWidth = 4.5 + widen;
        ctx.beginPath(); ctx.moveTo(cx, hipY); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      };
      drawLeg(legA.fx, legA.fy);
      drawLeg(legB.fx, legB.fy);

      // torso
      ctx.lineWidth = 7 + widen;
      ctx.beginPath(); ctx.moveTo(cx, hipY); ctx.lineTo(shX, shY); ctx.stroke();

      // arms
      ctx.lineWidth = 3.6 + widen;
      ctx.beginPath(); ctx.moveTo(shX, shY + 2);
      ctx.lineTo(shX + reach, shY + 11);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(shX, shY + 2);
      ctx.lineTo(shX - armSwing * 0.7, shY + 12);
      ctx.stroke();

      // head
      ctx.beginPath(); ctx.arc(headX, headY, headR + widen / 2, 0, Math.PI * 2); ctx.fill();
    };

    // faint rim so the figure separates from same-value backgrounds — and so
    // the legs read as a solid object terminating ON the floor, not sunk in it
    ctx.strokeStyle = ctx.fillStyle = opts.rim || 'rgba(140,160,185,0.32)';
    drawFigure(2.6);
    ctx.strokeStyle = ctx.fillStyle = col;
    drawFigure(0);

    // husk marker: tiny dim light on the head
    if (opts.huskGlow) {
      ctx.fillStyle = opts.connected ? 'rgba(190,210,255,0.9)' : 'rgba(120,140,170,0.4)';
      ctx.beginPath(); ctx.arc(headX, headY - 3, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  // ------------------------- post fx ---------------------------
  vignette(ctx) {
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // cinematic bars
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, 26);
    ctx.fillRect(0, VIEW_H - 26, VIEW_W, 26);
  },

  grainPass(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    const ox = Math.floor(Math.random() * 160), oy = Math.floor(Math.random() * 160);
    for (let y = -oy; y < VIEW_H; y += 160)
      for (let x = -ox; x < VIEW_W; x += 160)
        ctx.drawImage(this.grain, x, y);
    ctx.restore();
  },

  rainPass(ctx, dt, cam) {
    ctx.strokeStyle = 'rgba(170,190,210,0.13)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const r of this.rain) {
      r.y += r.s * dt;
      r.x -= r.s * 0.18 * dt + (cam.dx || 0);
      if (r.y > VIEW_H) { r.y = -20; r.x = Math.random() * (VIEW_W + 100); }
      if (r.x < -20) r.x += VIEW_W + 40;
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.l * 0.18, r.y + r.l);
    }
    ctx.stroke();
  },

  motesPass(ctx, dt, time) {
    ctx.fillStyle = 'rgba(180,200,220,0.07)';
    for (const m of this.motes) {
      m.x += m.vx * dt;
      if (m.x > VIEW_W) m.x = -4;
      const y = m.y + Math.sin(time * 0.5 + m.ph) * 14;
      ctx.fillRect(m.x, y, 2, 2);
    }
  },

  // darkness with light holes: holes = [{x,y,r,a}] in screen space
  darkness(ctx, amount, holes) {
    const dc = this.darkCanvas.getContext('2d');
    dc.clearRect(0, 0, VIEW_W, VIEW_H);
    dc.fillStyle = `rgba(2,3,5,${amount})`;
    dc.fillRect(0, 0, VIEW_W, VIEW_H);
    dc.globalCompositeOperation = 'destination-out';
    for (const h of holes) {
      const g = dc.createRadialGradient(h.x, h.y, h.r * 0.15, h.x, h.y, h.r);
      g.addColorStop(0, `rgba(0,0,0,${h.a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = g;
      dc.fillRect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
    }
    dc.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.darkCanvas, 0, 0);
  },
};
