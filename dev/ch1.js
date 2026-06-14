#!/usr/bin/env node
// ---------------------------------------------------------------
// HOLLOW - dev/ch1.js : Chapter 1 (THE FOREST) walkthrough harness.
// Loads the REAL chapter list (no testmap swap) so LEVELS[0] = Ch.1,
// then verifies every taught beat is solvable: jump stones, mantle the
// rock, crouch under the log (and that you CAN'T stand under it),
// push the mud box + climb the 4-tile cliff, crouch under the fence,
// reach the exit. Run with `node dev/ch1.js`.
// ---------------------------------------------------------------
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeCtx2d() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => gradient;
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function makeCanvas() { return { width: 0, height: 0, style: {}, getContext: () => makeCtx2d() }; }
function audioParam() {
  return { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} };
}
function audioNode() {
  return { connect() {}, disconnect() {}, start() {}, stop() {}, gain: audioParam(), frequency: audioParam(), detune: audioParam(), Q: audioParam(), playbackRate: audioParam(), type: '', buffer: null, loop: false };
}
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; this.state = 'running'; }
  createGain() { return audioNode(); }
  createOscillator() { return audioNode(); }
  createBiquadFilter() { return audioNode(); }
  createBufferSource() { return audioNode(); }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
  resume() {}
}

const listeners = {};
let rafCb = null;
const sandbox = {
  console, innerWidth: 1920, innerHeight: 1080,
  addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  removeEventListener() {},
  requestAnimationFrame(cb) { rafCb = cb; },
  document: { getElementById: () => makeCanvas(), createElement: () => makeCanvas() },
  AudioContext: FakeAudioContext,
};
const storageData = {};
sandbox.localStorage = {
  getItem: k => (k in storageData ? storageData[k] : null),
  setItem: (k, v) => { storageData[k] = String(v); },
  removeItem: k => { delete storageData[k]; },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const root = path.join(__dirname, '..');
// NOTE: no testmap swap — we want the real Ch.1 as LEVELS[0].
for (const f of ['util', 'audio', 'player', 'entities', 'render', 'levels1', 'levels2', 'game']) {
  const file = path.join(root, 'js', f + '.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
}
vm.runInContext('globalThis.__T = { Input, Game, LEVELS, TILE, STAND_H, CROUCH_H };', sandbox);
const { Input, Game, LEVELS, TILE, STAND_H, CROUCH_H } = sandbox.__T;

// --------------------------- driving -----------------------------
let now = 0;
function frames(n) {
  for (let i = 0; i < n; i++) { now += 1000 / 60; const cb = rafCb; rafCb = null; cb(now); }
}
function keyDown(code) { for (const fn of listeners.keydown || []) fn({ code, preventDefault() {} }); }
function keyUp(code) { for (const fn of listeners.keyup || []) fn({ code }); }
function tap(code, holdFrames = 2) { keyDown(code); frames(holdFrames); keyUp(code); }
function releaseAll() { for (const k of Object.keys(Input.keys)) keyUp(k); }

let failures = 0;
function check(label, cond, detail) {
  const ok = !!cond;
  console.log((ok ? '  ok ' : 'FAIL ') + label + (ok ? '' : '   [' + detail + ']'));
  if (!ok) failures++;
}
const P = () => Game.player;
const at = () => `x=${P().x.toFixed(1)} y=${P().y.toFixed(1)} h=${P().h} state=${P().state}`;
const FLOOR = 20 * TILE;               // top of the base ground
// drop the player standing on the base floor at column `col`
function place(col, crouched = false) {
  const p = P();
  p.h = crouched ? CROUCH_H : STAND_H;
  p.x = col * TILE; p.y = FLOOR - p.h; p.vx = 0; p.vy = 0;
  p.mantle = null; p.grabbing = false;
}

// ----------------------------- tests -----------------------------
console.log('-- level sanity (Ch.1 THE FOREST)');
check('is THE FOREST', LEVELS[0].name === 'THE FOREST', LEVELS[0].name);
check('24 rows', LEVELS[0].rows.length === 24, LEVELS[0].rows.length);
check('rows equal length', LEVELS[0].rows.every(r => r.length === LEVELS[0].rows[0].length));

frames(90);
tap('Space');
frames(150);
check('reached play', Game.state === 'play', Game.state);
check('spawned grounded', P().grounded, at());

console.log('-- run from spawn: hop the step stones, mantle the rock wall (30-34)');
keyDown('ArrowRight');
let pastRock = false;
for (let i = 0; i < 30 && !pastRock; i++) {
  tap('Space', 14); frames(22);
  // the rock spans floor-to-3-tiles with no way around, so reaching its far
  // side on the ground proves the mantle (and the stone hops) worked.
  pastRock = P().x >= 40 * TILE;
}
releaseAll(); frames(10);
check('cleared the stones and mantled the rock', pastRock, at());

console.log('-- crouch shrinks the collision box');
keyDown('ArrowDown'); frames(6);
check('crouched: h = CROUCH_H', P().h === CROUCH_H && P().crouch, at());
keyUp('ArrowDown'); frames(6);
check('stood back up: h = STAND_H', P().h === STAND_H && !P().crouch, at());

console.log('-- crouch UNDER the fallen log (cols 48-55, gap row 19)');
place(45);
keyDown('ArrowDown'); keyDown('ArrowRight');
let alive = true;
for (let i = 0; i < 450 && P().x < 57 * TILE; i++) { frames(1); if (Game.state !== 'play') alive = false; }
releaseAll();
check('crossed under the log', P().x >= 57 * TILE && alive, at());
check('still grounded past the log', P().grounded, at());
frames(10);

console.log('-- cannot stand up while under the log');
place(51, true);                       // mid-log, already crouched
frames(1);                             // no Down held -> tries to stand
check('forced to stay crouched', P().h === CROUCH_H, at());

console.log('-- push the mud box rightward');
const box = () => Game.world.boxes[0];
place(60);                             // just left of the box (spawned at col 62)
const bx0 = box().x;
keyDown('ArrowRight'); frames(70); releaseAll(); frames(5);
check('box was pushed right', box().x > bx0 + TILE, `bx0=${bx0.toFixed(1)} now=${box().x.toFixed(1)}`);

console.log('-- pull the box right without outrunning it (grab keeps pace)');
// stage the box on the open flat walk (cols ~89-145, no low ceiling) with
// the player just to its right, then hold grab + right for a sustained pull.
const pb = box();
pb.x = 95 * TILE; pb.y = FLOOR - 30; pb.vx = 0; pb.vy = 0; pb.grounded = true;
const pp = P();
pp.h = STAND_H; pp.x = pb.x + pb.w + 2; pp.y = FLOOR - STAND_H; pp.vx = 0; pp.vy = 0;
pp.grabbedBox = null; pp.grabbing = false;
frames(2);
keyDown('KeyX'); frames(3);            // grab
const held = !!P().grabbedBox;
keyDown('ArrowRight');
let tornLoose = false, maxSep = 0;
for (let i = 0; i < 100; i++) {
  frames(1);
  if (!P().grabbedBox) { tornLoose = true; break; }
  const b = box();
  maxSep = Math.max(maxSep, P().x - (b.x + b.w));   // player is to the box's right
}
const pulled = box().x - 95 * TILE;
releaseAll(); frames(3);
check('grab engaged', held, at());
check('box stayed grabbed through a long pull', !tornLoose, `maxSep=${maxSep.toFixed(1)}`);
check('box actually traveled with the player', pulled > 3 * TILE, `pulled=${pulled.toFixed(1)}px`);

console.log('-- the 4-tile cliff is impossible bare (no box)');
place(69);                             // at the cliff face, box elsewhere
let bare = false;
for (let i = 0; i < 6 && !bare; i++) { keyDown('ArrowRight'); tap('Space', 14); frames(36); bare = P().y + P().h <= 16 * TILE + 2; }
releaseAll();
check('bare jump cannot climb the cliff', !bare, at());

console.log('-- ...but the box makes it climbable');
// stage the box against the cliff face (col 69) and stand on it
const b = box();
b.x = 69 * TILE; b.y = FLOOR - 30; b.vx = 0; b.vy = 0;
const p = P();
p.h = STAND_H; p.x = b.x + 6; p.y = b.y - STAND_H; p.vx = 0; p.vy = 0; p.mantle = null;
frames(4);
let climbed = false;
keyDown('ArrowRight');
for (let i = 0; i < 8 && !climbed; i++) { tap('Space', 14); frames(40); climbed = P().y + P().h <= 16 * TILE + 2 && P().grounded; }
releaseAll();
check('box-assisted climb reaches the plateau', climbed, at());

console.log('-- crouch under the fence (cols 146-147, gap row 19)');
place(143);
keyDown('ArrowDown'); keyDown('ArrowRight');
alive = true;
for (let i = 0; i < 200 && P().x < 150 * TILE; i++) { frames(1); if (Game.state !== 'play') alive = false; }
releaseAll();
check('crossed under the fence', P().x >= 150 * TILE && alive, at());

console.log('-- reach the exit -> advances to the next chapter (Ch.2)');
place(153);
keyDown('ArrowRight');
let advanced = false;
for (let i = 0; i < 400 && !advanced; i++) { frames(1); if (Game.chapterIdx === 1) advanced = true; }
releaseAll();
check('exit advanced to chapter 2', advanced && Game.chapterIdx === 1, `idx=${Game.chapterIdx} ${at()}`);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
