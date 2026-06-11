#!/usr/bin/env node
// ---------------------------------------------------------------
// HOLLOW - dev/headless.js : node smoke test for the game loop.
// Loads the real scripts with stubbed DOM/canvas/audio, drives
// scripted input through requestAnimationFrame, and asserts the
// player can run / jump / mantle / cross the gap / swim / crouch.
// Not part of the game; run with `node dev/headless.js`.
// ---------------------------------------------------------------
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ----------------------------- stubs -----------------------------

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

function makeCanvas() {
  return { width: 0, height: 0, style: {}, getContext: () => makeCtx2d() };
}

function audioParam() {
  return {
    value: 0,
    setValueAtTime() {}, linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {}, cancelScheduledValues() {},
  };
}
function audioNode() {
  return {
    connect() {}, disconnect() {}, start() {}, stop() {},
    gain: audioParam(), frequency: audioParam(), detune: audioParam(),
    Q: audioParam(), playbackRate: audioParam(),
    type: '', buffer: null, loop: false,
  };
}
class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.destination = {};
    this.state = 'running';
  }
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
  console,
  innerWidth: 1920, innerHeight: 1080,
  addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  removeEventListener() {},
  requestAnimationFrame(cb) { rafCb = cb; },
  document: {
    getElementById: () => makeCanvas(),
    createElement: () => makeCanvas(),
  },
  AudioContext: FakeAudioContext,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const root = path.join(__dirname, '..');
for (const f of ['util', 'audio', 'player', 'entities', 'render', 'levels1', 'levels2', 'game']) {
  const file = path.join(root, 'js', f + '.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
}
// expose top-level lexical bindings to the harness
vm.runInContext('globalThis.__T = { Input, Game, LEVELS, AudioSys, TILE };', sandbox);
const { Input, Game, LEVELS, TILE } = sandbox.__T;

// --------------------------- driving -----------------------------

let now = 0;
function frames(n) {
  for (let i = 0; i < n; i++) {
    now += 1000 / 60;
    const cb = rafCb; rafCb = null;
    cb(now);
  }
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
const at = () => `x=${P().x.toFixed(1)} y=${P().y.toFixed(1)} state=${P().state}`;

// ----------------------------- tests -----------------------------

console.log('-- level sanity');
const L = LEVELS[0];
check('24 rows', L.rows.length === 24, L.rows.length);
check('rows equal length', L.rows.every(r => r.length === L.rows[0].length));

console.log('-- title -> play');
frames(90);                       // boot fade-in on title
check('starts on title', Game.state === 'title', Game.state);
tap('Space');                     // any key: audio init + start fade
frames(150);                      // fade out, switch, fade in
check('reached play', Game.state === 'play', Game.state);
const start = { x: P().x, y: P().y };
check('spawned on ground', P().grounded, at());

console.log('-- run right');
keyDown('ArrowRight');
frames(60);
check('moved right', P().x > start.x + 100, at());
check('running state', P().state === 'run', at());

console.log('-- grass + crouch');
// stop on the grass patch (cols 5-8)
keyUp('ArrowRight');
frames(30);
keyDown('ArrowDown');
frames(20);
check('crouches', P().crouch === true, at());
keyUp('ArrowDown');

console.log('-- mantle up the 3-tile wall (cols 14-20, top row 17)');
keyDown('ArrowRight');
let mantled = false;
for (let i = 0; i < 8 && !mantled; i++) {
  tap('Space', 14);               // held jump for full height
  frames(40);
  mantled = P().y + P().h <= 17 * TILE + 1 && P().grounded;
}
check('on top of wall', mantled, at());

console.log('-- one-way platform above the wall (row 14, cols 17-19)');
// stand under it, jump straight up through it
keyUp('ArrowRight');
frames(20);
// nudge to be under the oneway
while (P().x + P().w / 2 < 17.5 * TILE) { keyDown('ArrowRight'); frames(2); keyUp('ArrowRight'); frames(1); }
frames(20);
let onOneway = false;
for (let i = 0; i < 6 && !onOneway; i++) {
  tap('Space', 16);
  frames(45);
  onOneway = Math.abs(P().y + P().h - 14 * TILE) < 2 && P().grounded;
}
check('lands on one-way platform', onOneway, at());
// drop back down through is NOT supported (no drop-through input); walk off right edge
keyDown('ArrowRight');
frames(80);
keyUp('ArrowRight');
frames(40);
check('back on ground right of wall', P().y + P().h >= 20 * TILE - 1 && P().grounded, at());

console.log('-- 4-tile gap (cols 24-27)');
// walk to just before the gap edge, then run + jump across
while (P().x + P().w < 23.3 * TILE) { keyDown('ArrowRight'); frames(2); }
keyUp('ArrowRight');
frames(30);
keyDown('ArrowRight');
frames(3);
keyDown('Space');
frames(30);
keyUp('Space');
let landed = false;
for (let i = 0; i < 60 && !landed; i++) { frames(1); landed = P().grounded; }
keyUp('ArrowRight');
const clearedGap = P().x > 28 * TILE && P().grounded && P().y + P().h <= 20 * TILE + 1;
check('cleared the gap', clearedGap, at());
if (!clearedGap && P().x < 28 * TILE && P().y + P().h > 22 * TILE) {
  console.log('  (fell in pit — testing mantle-out instead)');
  let out = false;
  for (let i = 0; i < 8 && !out; i++) {
    tap('Space', 14);
    frames(40);
    out = P().y + P().h <= 20 * TILE + 1;
  }
  check('mantled out of pit', out, at());
  keyDown('ArrowRight'); frames(60); keyUp('ArrowRight');
}

console.log('-- floating box in the pool (cols 33-40)');
releaseAll();
// walk to the left bank edge (col 32) while the box settles
while (P().x + P().w < 33 * TILE - 4) { keyDown('ArrowRight'); frames(2); }
keyUp('ArrowRight');
frames(120);
const poolBox = () => Game.world.boxes[0];
check('box floats near surface', poolBox().y + 4 < 20 * TILE + 10 && Math.abs(poolBox().vy) < 60,
  `box y=${poolBox().y.toFixed(1)} vy=${poolBox().vy.toFixed(1)}`);

// jump from the bank onto the floating box and ride it
const onPoolBox = () => P().grounded &&
  P().x + P().w > poolBox().x - 1 && P().x < poolBox().x + poolBox().w + 1 &&
  Math.abs(P().y + P().h - poolBox().y) < 5;
let onBox = false;
for (let i = 0; i < 5 && !onBox; i++) {
  keyDown('ArrowRight'); keyDown('Space');
  frames(14);
  keyUp('Space');
  for (let j = 0; j < 50 && !onBox; j++) {
    frames(1);
    if (onPoolBox()) { keyUp('ArrowRight'); onBox = true; }
  }
  if (!onBox) { // missed: get back to the left bank and retry
    keyUp('ArrowRight'); keyDown('ArrowLeft'); keyDown('ArrowUp');
    for (let j = 0; j < 300 && (P().inWater || !P().grounded || P().x + P().w > 33 * TILE); j++) {
      if (j % 10 === 0) tap('Space', 4);
      keyDown('ArrowLeft'); keyDown('ArrowUp');
      frames(1);
    }
    releaseAll(); frames(30);
  }
}
check('stands on floating box', onBox, at() + ` box=${poolBox().x.toFixed(0)},${poolBox().y.toFixed(0)}`);
if (onBox) {
  let rode = 0;
  for (let i = 0; i < 40; i++) { frames(1); if (onPoolBox()) rode++; }
  check('box carries the rider', rode > 32, `rode ${rode}/40 frames ` + at());
}

console.log('-- swim under the box, out the far side');
keyDown('ArrowRight');
let swam = false;
for (let i = 0; i < 240 && !swam; i++) { frames(1); swam = P().inWater; }
check('enters water / swims', swam, at());
keyDown('ArrowDown');                      // dive under the floating box
let pastBox = false;
for (let i = 0; i < 300 && !pastBox; i++) { frames(1); pastBox = P().x > 39 * TILE; }
keyUp('ArrowDown');
check('dives under the box', pastBox, at());
keyDown('ArrowUp');
let outOfWater = false;
for (let i = 0; i < 360 && !outOfWater; i++) {
  if (i % 12 === 0) { keyUp('Space'); tap('Space', 4); keyDown('ArrowUp'); keyDown('ArrowRight'); }
  frames(1);
  outOfWater = !P().inWater && P().grounded && P().x > 41 * TILE;
}
check('climbs out the far side', outOfWater, at());
releaseAll();
frames(30);

console.log('-- grab/pull box A (col 50)');
const boxA = () => Game.world.boxes[1];
while (P().lastHitX !== boxA()) { keyDown('ArrowRight'); frames(2); if (P().x > 52 * TILE) break; }
keyUp('ArrowRight');
frames(5);
const aStart = boxA().x;
keyDown('KeyX');
frames(5);
keyDown('ArrowLeft');
frames(35);
keyUp('ArrowLeft'); keyUp('KeyX');
check('pull drags box toward player', boxA().x < aStart - 12,
  `boxA ${aStart.toFixed(1)} -> ${boxA().x.toFixed(1)}`);
frames(30);                      // let residual pull momentum decay

console.log('-- push box A onto plate (52-53), door opens');
const door = () => Game.world.doors[0];
const plate = () => Game.world.plates[0];
let pushJitter = 0, lastAx = boxA().x;
keyDown('ArrowRight');
for (let i = 0; i < 600 && boxA().x < 52 * TILE + 11; i++) {
  frames(1);
  if (boxA().x < lastAx - 0.01) pushJitter++;
  lastAx = boxA().x;
}
keyUp('ArrowRight');
check('box pushed onto plate', boxA().x >= 52 * TILE + 8, `boxA x=${boxA().x.toFixed(1)}`);
check('push has no jitter', pushJitter === 0, pushJitter + ' backward frames');
frames(10);
check('plate pressed', plate().pressed === true);
let opened = false;
for (let i = 0; i < 180 && !opened; i++) { frames(1); opened = door().openT > 0.6; }
check('door opens from plate', opened, `openT=${door().openT.toFixed(2)}`);

// hop over box A, walk through the open door
let pastDoor = false;
for (let i = 0; i < 4 && !pastDoor; i++) {
  keyDown('ArrowRight'); keyDown('Space');
  frames(12);
  keyUp('Space');
  for (let j = 0; j < 90 && !pastDoor; j++) { frames(1); pastDoor = P().x > 55 * TILE + 24 && P().grounded; }
}
keyUp('ArrowRight');
check('through the open door', pastDoor, at());

console.log('-- 4-tile wall (60-69) must be impossible bare...');
// hop over box B (57) into the gap before the wall
let inGap = false;
for (let i = 0; i < 4 && !inGap; i++) {
  keyDown('ArrowRight'); keyDown('Space');
  frames(13);
  keyUp('Space');
  for (let j = 0; j < 90 && !inGap; j++) { frames(1); inGap = P().x > 58 * TILE && P().grounded; }
}
keyUp('ArrowRight');
frames(10);
let bareClimb = false;
for (let i = 0; i < 5; i++) {
  keyDown('ArrowRight'); keyDown('Space');
  frames(16);
  keyUp('Space');
  frames(50);
  if (P().y + P().h <= 16 * TILE + 1) bareClimb = true;
  keyUp('ArrowRight'); frames(10);
}
check('bare jump cannot climb it', !bareClimb, at());

console.log('-- ...but a pushed box makes it climbable');
// hop back left over box B, then push it to the wall face
const boxB = () => Game.world.boxes[2];
let backLeft = false;
for (let i = 0; i < 5 && !backLeft; i++) {
  keyDown('ArrowLeft'); keyDown('Space');
  frames(14);
  keyUp('Space');
  for (let j = 0; j < 90 && !backLeft; j++) { frames(1); backLeft = P().x < boxB().x - 20 && P().grounded; }
}
keyUp('ArrowLeft');
frames(5);
keyDown('ArrowRight');
for (let i = 0; i < 700 && boxB().x < 60 * TILE - 31; i++) frames(1);
keyUp('ArrowRight');
check('box B pushed to wall face', boxB().x >= 60 * TILE - 32, `boxB x=${boxB().x.toFixed(1)}`);
// climb onto the box
let onBoxB = false;
for (let i = 0; i < 5 && !onBoxB; i++) {
  keyDown('ArrowRight'); keyDown('Space');
  frames(12);
  keyUp('Space');
  for (let j = 0; j < 60 && !onBoxB; j++) {
    frames(1);
    onBoxB = P().grounded && Math.abs(P().y + P().h - (boxB().y + 1)) < 4;
  }
  keyUp('ArrowRight'); frames(8);
}
check('stands on box at wall', onBoxB, at() + ` boxB y=${boxB().y.toFixed(1)}`);
let onPlateau = false;
for (let i = 0; i < 6 && !onPlateau; i++) {
  keyDown('ArrowRight'); keyDown('Space');
  frames(16);
  keyUp('Space');
  for (let j = 0; j < 80 && !onPlateau; j++) {
    frames(1);
    onPlateau = P().grounded && P().y + P().h <= 16 * TILE + 1 && P().x >= 60 * TILE;
  }
}
releaseAll();
check('mantles from box onto 4-tile plateau', onPlateau, at());

console.log('-- R respawn');
const beforeR = P().x;
tap('KeyR');
frames(40);
check('dead state entered', Game.state === 'dead' || Game.state === 'play', Game.state);
frames(180);                      // fade out + respawn + fade in
check('respawned at start', Game.state === 'play' && Math.abs(P().x - (3 * TILE + 7)) < 2 && P().x < beforeR, at());

console.log('-- camera');
check('camera clamped', Game.cam.x >= 0 && Game.cam.y >= 0 &&
  Game.cam.x <= L.rows[0].length * TILE - 960 && Game.cam.y <= 24 * TILE - 540,
  `cam=${Game.cam.x.toFixed(1)},${Game.cam.y.toFixed(1)}`);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
