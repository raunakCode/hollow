#!/usr/bin/env node
// ---------------------------------------------------------------
// HOLLOW - dev/ch2.js : Chapter 2 (THE FENCE) walkthrough harness.
// Loads the REAL chapter list (LEVELS[1] = Ch.2) and proves every
// searchlight beat: crouch-in-grass vanishes from Light 1 while standing
// in the same spot gets caught; the 3-tile wall mantles; Light 3's lever
// is lethal bare but safe behind the pushed box, the box shields the whole
// rolling push through the latched gate, and the exit ends the chapter.
// Run with `node dev/ch2.js`.
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
for (const f of ['util', 'audio', 'player', 'entities', 'render', 'levels1', 'levels2', 'game']) {
  const file = path.join(root, 'js', f + '.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
}
vm.runInContext('globalThis.__T = { Input, Game, LEVELS, TILE, STAND_H, CROUCH_H, loadChapter };', sandbox);
const { Input, Game, LEVELS, TILE, STAND_H, CROUCH_H, loadChapter } = sandbox.__T;

// --------------------------- driving -----------------------------
let now = 0;
function frames(n) {
  for (let i = 0; i < n; i++) { now += 1000 / 60; const cb = rafCb; rafCb = null; if (cb) cb(now); }
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
const at = () => `x=${P().x.toFixed(1)} y=${P().y.toFixed(1)} h=${P().h} state=${Game.state}`;
const FLOOR = 20 * TILE;
function place(col, crouched = false) {
  const p = P();
  p.h = crouched ? CROUCH_H : STAND_H;
  p.x = col * TILE; p.y = FLOOR - p.h; p.vx = 0; p.vy = 0;
  p.mantle = null; p.grabbing = false; p.grabbedBox = null;
}
const FLOOR_B = 19 * TILE;              // stage B's raised floor top (1 tile above base)
function placeB(col) {
  const p = P();
  p.h = STAND_H; p.x = col * TILE; p.y = FLOOR_B - p.h; p.vx = 0; p.vy = 0;
  p.mantle = null; p.grabbing = false; p.grabbedBox = null;
}
// boot the chapter into a live play state at LEVELS[1]
function startCh2() {
  loadChapter(1);
  Game.state = 'play'; Game.fade = 0; Game.fadeV = 0; Game.paused = false; Game.onFaded = null;
  releaseAll(); frames(1);
}
// run up to `maxFrames` while holding the given keys; stop early on death.
// returns true if the player survived the whole window.
function survive(maxFrames) {
  for (let i = 0; i < maxFrames; i++) { frames(1); if (Game.state !== 'play') return false; }
  return true;
}

// ----------------------------- tests -----------------------------
console.log('-- level sanity (Ch.2 THE FENCE)');
startCh2();
check('is THE FENCE', LEVELS[1].name === 'THE FENCE', LEVELS[1].name);
check('24 rows', LEVELS[1].rows.length === 24, LEVELS[1].rows.length);
check('rows equal length', LEVELS[1].rows.every(r => r.length === LEVELS[1].rows[0].length));
check('four searchlights (1, 2, 3a, 3b)', Game.world.lights.length === 4, Game.world.lights.length);
check('reached play', Game.state === 'play', Game.state);

console.log('-- LIGHT 1: standing in grass island A (col 16) gets swept');
startCh2(); place(16);                    // standing, on grass row 19
const standDied = !survive(900);          // ~15s: a full sweep must catch a standing target
releaseAll();
check('standing in the yard is detected', standDied, at());

console.log('-- LIGHT 1: crouching in the same grass vanishes from the beam');
startCh2(); place(16);
keyDown('ArrowDown');                      // crouch -> hidden in grass
const hidSurvived = survive(900);
releaseAll();
check('crouch-in-grass hides from the searchlight', hidSurvived, at());

console.log('-- LIGHT 2: the 3-tile wall (60-61) mantles to the far corridor');
startCh2();
Game.world.lights = [];                    // isolate traversal from the sweep timing
place(58);
keyDown('ArrowRight');
let cleared = false;
for (let i = 0; i < 40 && !cleared; i++) { tap('Space', 14); frames(20); cleared = P().x >= 63 * TILE; }
releaseAll(); frames(20);
check('mantled the wall to the dark side', cleared && P().grounded, at());

const lever = () => Game.world.levers[0];
const door = () => Game.world.doors[0];

console.log('-- LIGHT 3 / STAGE A: the gate lever stays lit (bare = caught, no run-up window)');
startCh2(); place(86);                      // at the lever, box still parked at col 81
const bareDied = !survive(900);
releaseAll();
check('lever is lethal without the box', bareDied, at());

console.log('-- LIGHT 3 / STAGE A: the box casts a standing shadow over the lever');
startCh2(); place(86);
const sbox = Game.world.boxes[0];
sbox.x = P().x + P().w + 1; sbox.y = FLOOR - 30; sbox.vx = 0; sbox.vy = 0; sbox.grounded = true;
const shadowSurvived = survive(420);       // ~7s in the box's shadow
check('box shadow protects the lever pull', shadowSurvived, at());
if (Game.state === 'play') {
  tap('KeyX');                             // pull the lever
  frames(120);                             // let the gate run up (latch)
  check('lever latches the gate open', lever().on && door().open, `on=${lever().on} open=${door().open}`);
}

console.log('-- LIGHT 3 / STAGE A: full traversal — shield to lever, over the box+step, to checkpoint 1');
startCh2(); place(79);                      // left of the box (col 81)
keyDown('ArrowRight');
let pushAlive = true, pulled = false;
// phase 1: push the box through the lit zone (shield), pull the lever in its shadow
for (let i = 0; i < 1200; i++) {
  frames(1);
  if (Game.state !== 'play') { pushAlive = false; break; }
  if (!pulled) {
    const p = P(), l = lever();
    if (p.x - 6 < l.x + l.w && p.x + 24 > l.x) { tap('KeyX'); keyDown('ArrowRight'); pulled = true; }
  }
  if (P().x >= 90 * TILE) break;            // reached the end of the lit zone (box ahead)
}
check('survived the shielded push past the lever', pushAlive, at());
check('pulled the lever from cover, gate latched', pulled && door().open, `pulled=${pulled} open=${door().open}`);
// phase 2: clamber over the box, through the open gate, up the step to checkpoint 1
for (let i = 0; i < 500 && Game.checkpointIdx < 1 && Game.state === 'play'; i++) {
  keyDown('ArrowRight'); if (i % 22 < 4) keyDown('Space'); else keyUp('Space');
  frames(1);
}
releaseAll();
check('cleared stage A to checkpoint 1 (no softlock)', Game.state === 'play' && Game.checkpointIdx >= 1, at() + ` cp=${Game.checkpointIdx}`);

console.log('-- ANTI-CHEESE: gate is sealed — box-step + jump cannot climb over it');
startCh2();
// stage the exact exploit: box shoved flush against the closed gate, player ON it
const cbox = Game.world.boxes[0];
cbox.x = door().x - cbox.w - 1; cbox.y = FLOOR - 30; cbox.vx = 0; cbox.vy = 0; cbox.grounded = true;
const cp = P(); cp.x = cbox.x; cp.y = cbox.y - STAND_H; cp.vx = 0; cp.vy = 0;   // standing on the box
const gateClosedX = door().x;
let crossed = false;
for (let i = 0; i < 240; i++) {            // spam jump + right, try to vault the gate
  keyDown('ArrowRight'); if (i % 18 < 2) keyDown('Space'); else keyUp('Space');
  frames(1);
  if (P().x + P().w > gateClosedX + 14) { crossed = true; break; }   // got to the far side
}
releaseAll();
check('cannot box-climb / jump over the sealed gate', !crossed && !door().open, at());

console.log('-- ANTI-CHEESE: the box cannot be pushed up the step into stage B');
startCh2();
const stepBox = Game.world.boxes[0];
stepBox.x = 94 * TILE; stepBox.y = FLOOR - 30; stepBox.vx = 0; stepBox.vy = 0; stepBox.grounded = true;
const sp = P(); sp.x = 92 * TILE; sp.y = FLOOR - STAND_H; sp.vx = 0; sp.vy = 0;
// open the gate so only the step (not the gate) is what stops the box
Game.world.levers[0].on = true; frames(120);
keyDown('ArrowRight');
let boxClimbed = false;
for (let i = 0; i < 360; i++) { frames(1); if (stepBox.y < FLOOR - 30 - 4 || stepBox.x + stepBox.w > 97 * TILE + 4) { boxClimbed = true; break; } }
releaseAll();
check('box stays in stage A — cannot climb the step', !boxClimbed, `box x=${stepBox.x.toFixed(0)} y=${stepBox.y.toFixed(0)}`);

console.log('-- LIGHT 3 / STAGE B: a dwell column on the raised floor is lethal (real threat)');
let lethalCol = -1;
for (const c of [100, 101, 102, 108, 109]) {
  startCh2(); placeB(c);
  if (!survive(900)) { lethalCol = c; break; }
  releaseAll();
}
check('stage-B beam catches a standing target', lethalCol >= 0, 'none of 100-109 killed');

console.log('-- LIGHT 3 / STAGE B: a well-timed dash across IS possible (solvable + threat)');
let anySurvived = false, anyDied = false;
for (let delay = 0; delay < 120 && !(anySurvived && anyDied); delay += 7) {
  startCh2(); placeB(98);                   // up the step, before the sweep
  frames(delay);                            // vary the phase we start the run on
  keyDown('ArrowRight');
  let ok = true;
  for (let i = 0; i < 240 && P().x < 111 * TILE; i++) { frames(1); if (Game.state !== 'play') { ok = false; break; } }
  releaseAll();
  if (ok && P().x >= 111 * TILE) anySurvived = true; else if (!ok) anyDied = true;
}
check('the stage-B dash is solvable (some timing survives)', anySurvived, 'no start phase cleared it');
check('the stage-B dash is a real threat (some timing dies)', anyDied, 'never caught at any phase');

console.log('-- reach the exit -> advances to Ch.3 (THE YARD)');
startCh2();
Game.world.lights = [];                     // clear path: just prove the exit fires
place(118);
keyDown('ArrowRight');
for (let i = 0; i < 400 && Game.chapterIdx === 1; i++) frames(1);
releaseAll();
check('exit advanced to the next chapter', Game.chapterIdx === 2 && Game.state === 'play', `idx=${Game.chapterIdx} state=${Game.state} ${at()}`);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
