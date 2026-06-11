#!/usr/bin/env node
// ---------------------------------------------------------------
// HOLLOW - dev/fuzz.js : random-input fuzzer for stuck/embed bugs.
// Drives the real game with random held keys and checks every frame
// that the player is not embedded in solid tiles or deep inside a
// box (the "stuck in the ground" class). Run: node dev/fuzz.js
// ---------------------------------------------------------------
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeWorld() {
  const ctxStub = () => new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  const canvas = () => ({ width: 0, height: 0, style: {}, getContext: ctxStub });
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() {}, start() {}, stop() {}, gain: param(), frequency: param(), Q: param(), detune: param(), playbackRate: param(), type: '', buffer: null, loop: false });
  class AC {
    constructor() { this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; this.state = 'running'; }
    createGain() { return node(); } createOscillator() { return node(); }
    createBiquadFilter() { return node(); } createBufferSource() { return node(); }
    createBuffer(c, len) { return { getChannelData: () => new Float32Array(len) }; }
    resume() {}
  }
  const listeners = {};
  const sb = {
    console, innerWidth: 1920, innerHeight: 1080,
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    removeEventListener() {},
    requestAnimationFrame(cb) { sb.__raf = cb; },
    document: { getElementById: canvas, createElement: canvas },
    AudioContext: AC,
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  const root = path.join(__dirname, '..');
  for (const f of ['util', 'audio', 'player', 'entities', 'render', 'levels1', 'levels2', 'game'])
    vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), sb, { filename: f });
  vm.runInContext('globalThis.__T = { Input, Game, rectHitsSolidTiles, aabb, TILE };', sb);
  return { sb, listeners };
}

function rng(seed) {
  let s = seed >>> 0;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyX'];
const FRAMES_PER_SEED = 25000;
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

let totalFailures = 0;

for (const seed of SEEDS) {
  const { sb, listeners } = makeWorld();
  const { Input, Game, rectHitsSolidTiles, TILE } = sb.__T;
  const rand = rng(seed * 7919);
  const key = (type, code) => { for (const f of listeners[type] || []) f({ code, preventDefault() {} }); };
  let now = 0;
  const frame = () => { now += 1000 / 60; const cb = sb.__raf; sb.__raf = null; cb(now); };

  // boot to play
  for (let i = 0; i < 90; i++) frame();
  key('keydown', 'Space'); key('keyup', 'Space');
  for (let i = 0; i < 160; i++) frame();
  if (Game.state !== 'play') { console.log(`seed ${seed}: FAILED TO REACH PLAY`); totalFailures++; continue; }

  const held = {};
  const log = [];
  let failures = 0;

  for (let f = 0; f < FRAMES_PER_SEED; f++) {
    // re-roll input every 5..40 frames, movement-biased
    if (f % (5 + Math.floor(rand() * 36)) === 0) {
      for (const k of KEYS) {
        const p = k === 'ArrowLeft' || k === 'ArrowRight' ? 0.45 : (k === 'Space' ? 0.35 : 0.2);
        const want = rand() < p;
        if (want && !held[k]) { key('keydown', k); held[k] = true; }
        if (!want && held[k]) { key('keyup', k); held[k] = false; }
      }
      if (rand() < 0.003) { key('keydown', 'KeyR'); key('keyup', 'KeyR'); }
      log.push({ f, held: Object.keys(held).filter(k => held[k]).join('+') });
      if (log.length > 12) log.shift();
    }
    frame();

    if (Game.state !== 'play') continue;
    const p = Game.player;
    if (p.mantle) continue;                       // scripted clip-through is expected

    // (a) embedded in solid tiles (shrunk 1px to ignore boundary kisses)
    if (rectHitsSolidTiles(Game.level, p.x + 1, p.y + 1, p.w - 2, p.h - 2)) {
      console.log(`seed ${seed} frame ${f}: EMBEDDED IN TILES at x=${p.x.toFixed(1)} y=${p.y.toFixed(1)} vx=${p.vx.toFixed(0)} vy=${p.vy.toFixed(0)} state=${p.state}`);
      console.log('  recent input:', JSON.stringify(log));
      failures++; break;
    }
    // (b) deep inside a box (>8px overlap on both axes)
    for (const b of Game.world.boxes) {
      const ox = Math.min(p.x + p.w, b.x + b.w) - Math.max(p.x, b.x);
      const oy = Math.min(p.y + p.h, b.y + b.h) - Math.max(p.y, b.y);
      if (ox > 8 && oy > 8) {
        console.log(`seed ${seed} frame ${f}: INSIDE BOX overlap ${ox.toFixed(1)}x${oy.toFixed(1)} player ${p.x.toFixed(1)},${p.y.toFixed(1)} box ${b.x.toFixed(1)},${b.y.toFixed(1)} grab=${!!p.grabbedBox}`);
        console.log('  recent input:', JSON.stringify(log));
        failures++; break;
      }
    }
    if (failures) break;
    // (c) box embedded in tiles
    for (const b of Game.world.boxes) {
      if (rectHitsSolidTiles(Game.level, b.x + 1, b.y + 1, b.w - 2, b.h - 2)) {
        console.log(`seed ${seed} frame ${f}: BOX IN TILES at ${b.x.toFixed(1)},${b.y.toFixed(1)} vx=${b.vx.toFixed(0)} vy=${b.vy.toFixed(0)}`);
        failures++; break;
      }
    }
    if (failures) break;
  }
  totalFailures += failures;
  console.log(`seed ${seed}: ${failures === 0 ? 'clean' : 'FAILED'} (${FRAMES_PER_SEED} frames ≈ ${(FRAMES_PER_SEED / 3600).toFixed(0)} min of play)`);
}

console.log(totalFailures === 0 ? '\nFUZZ CLEAN' : `\n${totalFailures} EMBED FAILURE(S)`);
process.exit(totalFailures ? 1 : 0);
