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
// localStorage stub (save/continue tests poke `storageData` directly)
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

console.log('-- R respawn (no checkpoint yet -> playerStart)');
keyDown('ArrowRight'); frames(40); keyUp('ArrowRight');
const beforeR = P().x;
tap('KeyR');
frames(40);
check('dead state entered', Game.state === 'dead' || Game.state === 'play', Game.state);
frames(200);
check('respawned at start', Game.state === 'play' && Math.abs(P().x - (3 * TILE + 7)) < 2 && P().x < beforeR, at());

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

// =================== T3 gauntlet (cols 75+) ===================
// Continues from the plateau; do NOT press R before checkpoint 3 or
// the whole left half has to be replayed.

const W = () => Game.world;
const sv = () => { try { return JSON.parse(storageData.hollow_save); } catch (e) { return null; } };
// walk right (or left) until cond() or a frame budget runs out
function walkUntil(dir, cond, maxFrames) {
  const key = dir > 0 ? 'ArrowRight' : 'ArrowLeft';
  keyDown(key);
  let i = 0;
  for (; i < maxFrames && !cond(); i++) frames(1);
  keyUp(key);
  return cond();
}

console.log('-- checkpoint 0 (col 77) + save');
walkUntil(1, () => P().x > 78 * TILE, 600);   // off the plateau, through the lamp
frames(10);
check('checkpoint 0 latched', Game.checkpointIdx === 0, 'idx=' + Game.checkpointIdx);
check('save written', sv() && sv().chapter === 0 && sv().checkpointIdx === 0, JSON.stringify(sv()));

console.log('-- lever (80) toggles door (83)');
const lever = () => W().levers[0];
const lDoor = () => W().doors[1];
walkUntil(1, () => Math.abs(P().x + P().w / 2 - 80.5 * TILE) < 10, 300);
frames(5);
tap('KeyX');
frames(5);
check('lever flips on', lever().on === true);
let lOpened = false;
for (let i = 0; i < 180 && !lOpened; i++) { frames(1); lOpened = lDoor().openT > 0.6; }
check('lever door opens', lOpened, `openT=${lDoor().openT.toFixed(2)}`);
tap('KeyX');
const openTAtToggle = lDoor().openT;
frames(40);
check('lever flips back off and door closes', lever().on === false && lDoor().openT < openTAtToggle, `on=${lever().on} openT=${lDoor().openT.toFixed(2)} was=${openTAtToggle.toFixed(2)}`);
tap('KeyX');                                   // open it again for the crossing
let lReopened = false;
for (let i = 0; i < 200 && !lReopened; i++) { frames(1); lReopened = lDoor().openT > 0.9; }
check('door reopened', lReopened, `openT=${lDoor().openT.toFixed(2)}`);

console.log('-- searchlight (93): standing in the beam kills');
walkUntil(1, () => P().x + P().w / 2 > 90 * TILE + 16, 400);
let litDead = false;
for (let i = 0; i < 900 && !litDead; i++) { frames(1); litDead = Game.state === 'dead'; }
check('light kills exposed player', litDead, `detect=${W().lights[0].detect.toFixed(2)} ` + at());
frames(220);                                   // respawn
check('respawned at checkpoint 0', Game.state === 'play' && Math.abs(P().x - (77 * TILE + 7)) < 2, at());
check('death reset the lever', lever().on === false, 'on=' + lever().on);

console.log('-- searchlight: grass + timing crossing');
tap('KeyX', 3);                                // wrong spot: must do nothing
check('act away from lever is inert', lever().on === false);
walkUntil(1, () => Math.abs(P().x + P().w / 2 - 80.5 * TILE) < 10, 300);
tap('KeyX');
for (let i = 0; i < 200 && lDoor().openT < 0.9; i++) frames(1);
walkUntil(1, () => P().x + P().w / 2 > 87 * TILE, 300);
const ang = () => W().lights[0].ang;
for (let i = 0; i < 600 && ang() > 1.15; i++) frames(1);   // beam far right
walkUntil(1, () => P().x + P().w / 2 > 93.5 * TILE, 200);  // into the grass
keyDown('ArrowDown');                                       // hide
for (let i = 0; i < 600 && ang() < 1.95; i++) frames(1);   // beam far left
keyUp('ArrowDown');
walkUntil(1, () => P().x > 99 * TILE + 20, 300);           // dash out the far side
frames(10);
check('crossed the light alive', Game.state === 'play' && P().x > 99 * TILE, at());
check('checkpoint 1 latched', Game.checkpointIdx === 1, 'idx=' + Game.checkpointIdx);

console.log('-- helm (103): husk mirrors input, camera follows husks');
const husk = () => W().husks[0];
const hDoor = () => W().doors[2];
const plate2 = () => W().plates[1];
walkUntil(1, () => Math.abs(P().x + P().w / 2 - 103.5 * TILE) < 8, 400);
frames(5);
tap('KeyX');
frames(5);
check('connected to helm', !!Game.helmed);
const pXBefore = P().x, huskXBefore = husk().x;
keyDown('ArrowRight');
frames(20);                                     // short hop: plate is close
keyUp('ArrowRight');
check('husk walks right', husk().x > huskXBefore + 50, `husk ${huskXBefore.toFixed(0)} -> ${husk().x.toFixed(0)}`);
check('player stays slumped', Math.abs(P().x - pXBefore) < 2, at());
let camOnHusk = false;
for (let i = 0; i < 240 && !camOnHusk; i++) { frames(1); camOnHusk = Game.cam.x > 3000; }
check('camera drifts to husk', camOnHusk, `cam.x=${Game.cam.x.toFixed(0)}`);
// walk the husk onto the plate (113-114), a body's width past the edge
keyDown('ArrowRight');
let onPlate = false;
for (let i = 0; i < 400 && !onPlate; i++) { frames(1); onPlate = plate2().pressed; }
frames(8);
keyUp('ArrowRight');
frames(20);                                     // settle on the plate
check('husk presses the plate', onPlate && plate2().pressed, `husk x=${husk().x.toFixed(0)}`);
let hOpened = false;
for (let i = 0; i < 200 && !hOpened; i++) { frames(1); hOpened = hDoor().openT > 0.6; }
check('husk door opens', hOpened, `openT=${hDoor().openT.toFixed(2)}`);
tap('KeyX');                                   // disconnect
frames(40);
check('disconnected, husk holds the plate', !Game.helmed && plate2().pressed === true);

console.log('-- through the husk door to checkpoint 2 (117)');
walkUntil(1, () => P().x > 117 * TILE + 20, 600);
frames(10);
check('checkpoint 2 latched', Game.checkpointIdx === 2, 'idx=' + Game.checkpointIdx + ' ' + at());

console.log('-- counterweight lift: box sinks A, husk joins, ride B up');
const lift = () => W().lifts[0];
const liftBox = () => W().boxes[3];
// push the box (121) into pit A (124-125); stop at the brink
keyDown('ArrowRight');
for (let i = 0; i < 500 && liftBox().x < 124 * TILE + 2; i++) frames(1);
keyUp('ArrowRight');
frames(120);                                    // box falls in, platform sinks
check('box rides platform A down', liftBox().y > 660, `box y=${liftBox().y.toFixed(0)} off=${lift().off.toFixed(1)}`);
check('lift state: A sunk, B risen', lift().off < -60, `off=${lift().off.toFixed(1)}`);
// fetch the husk as extra counterweight: back to the helm
walkUntil(-1, () => Math.abs(P().x + P().w / 2 - 103.5 * TILE) < 8, 700);
frames(5);
tap('KeyX');
frames(5);
keyDown('ArrowRight');                          // drive husk toward the pit
let huskInPit = false;
for (let i = 0; i < 700 && !huskInPit; i++) {
  frames(1);
  // on platform A = feet at the sunken platform, anywhere over its span
  huskInPit = husk().x + husk().w > 124 * TILE + 4 && husk().y + husk().h > 21 * TILE + 28;
}
keyUp('ArrowRight');
frames(20);
check('husk rides into pit A (platform weight 2)', huskInPit,
  `husk=${husk().x.toFixed(0)},${(husk().y + husk().h).toFixed(0)}`);
tap('KeyX');                                    // disconnect
frames(30);
const feet = () => P().y + P().h;
// hop pit A onto the strip (126-127); a short fall onto the box below
// self-recovers because the same right+jump mantles back out
const onStripNow = () => P().grounded && P().x > 126 * TILE - 2 &&
  P().x + P().w < 128 * TILE + 6 && Math.abs(feet() - 20 * TILE) < 3;
walkUntil(1, () => P().x + P().w > 123.8 * TILE, 400);
let onStrip = false;
for (let i = 0; i < 10 && !onStrip; i++) {
  const inPitB = feet() > 20 * TILE + 20 && P().x > 128 * TILE - 6;
  const dirKey = inPitB ? 'ArrowLeft' : 'ArrowRight';
  keyDown(dirKey); keyDown('Space');
  frames(14);
  keyUp('Space');
  for (let j = 0; j < 70 && !onStrip; j++) { frames(1); onStrip = onStripNow(); }
  keyUp(dirKey); frames(8);
}
check('on the strip between the pits', onStrip, at());
// board the widened platform B (128-130, risen to row 18). It's a lift
// solid, not a tile wall, so you can't mantle onto it — a running jump
// from the strip has to land on top.
const onBNow = () => P().grounded && P().x + P().w / 2 > 128 * TILE &&
  P().x < 131 * TILE && feet() < 19 * TILE;
let onB = false;
for (let attempt = 0; attempt < 14 && !onB; attempt++) {
  walkUntil(-1, () => P().x < 126 * TILE + 6, 120);   // back to the strip's left edge
  releaseAll();
  keyDown('ArrowRight');
  frames(7);                                          // short runway across the strip
  keyDown('Space');
  frames(15);
  keyUp('Space');
  for (let j = 0; j < 55 && !onB; j++) { frames(1); onB = onBNow(); }
  keyUp('ArrowRight');
  frames(8);
  if (!onB && feet() > 20 * TILE + 12) {              // fell into pit B: mantle back up to the strip
    for (let j = 0; j < 200 && feet() > 20 * TILE; j++) {
      keyDown('ArrowLeft');
      if (j % 24 < 12) keyDown('Space'); else keyUp('Space');
      frames(1);
    }
    releaseAll();
    frames(10);
  }
}
check('standing on risen platform B', onB, at() + ` off=${lift().off.toFixed(1)}`);
// from B, mantle up to the ledge (col 131, top row 16) — a 2-tile climb
let onLedge = false;
for (let i = 0; i < 8 && !onLedge; i++) {
  keyDown('ArrowRight'); keyDown('Space');
  frames(15);
  keyUp('Space');
  for (let j = 0; j < 80 && !onLedge; j++) {
    frames(1);
    onLedge = P().grounded && P().x >= 131 * TILE - 4 && P().y + P().h <= 16 * TILE + 1;
  }
  keyUp('ArrowRight'); frames(6);
}
releaseAll();
check('reached the ledge via the lift', onLedge, at());

console.log('-- checkpoint 3 (132), then the Listener kills a runner');
walkUntil(1, () => P().x > 133 * TILE, 300);
frames(10);
check('checkpoint 3 latched', Game.checkpointIdx === 3, 'idx=' + Game.checkpointIdx);
const cre = () => W().creatures[0];
// move into its range and keep moving there. When its eye next opens
// (alert) a noisy, nearby player is charged. Don't sprint past to the
// exit — jitter in place left of it so the charge is deterministic.
walkUntil(1, () => P().x > 137 * TILE, 200);
let charged = false, killed = false;
for (let i = 0; i < 2000 && !killed; i++) {
  const goRight = (i % 30) < 15 && P().x < 139 * TILE;   // stay noisy, stay left of the exit
  if (goRight) { keyDown('ArrowRight'); keyUp('ArrowLeft'); }
  else { keyDown('ArrowLeft'); keyUp('ArrowRight'); }
  frames(1);
  if (cre().state === 'charge') charged = true;
  killed = Game.state === 'dead';
}
releaseAll();
check('running triggers a charge', charged, 'state=' + cre().state);
check('charge kills on contact', killed, at());
frames(220);
check('respawned at checkpoint 3', Game.state === 'play' && Math.abs(P().x - (132 * TILE + 7)) < 2, at());
check('death reset the world (box, husk, lift)',
  Math.abs(liftBox().x - (121 * TILE + 1)) < 2 && Math.abs(husk().x - (110 * TILE + 7)) < 2 && lift().off === 0,
  `box=${liftBox().x.toFixed(0)} husk=${husk().x.toFixed(0)} off=${lift().off.toFixed(1)}`);

console.log('-- Listener: burst-walk while dormant, freeze on the growl');
let reachedExit = false;
for (let i = 0; i < 4000 && !reachedExit; i++) {
  const still = cre().state !== 'dormant' || cre().eye > 0.25;
  if (still) keyUp('ArrowRight');
  else keyDown('ArrowRight');
  frames(1);
  reachedExit = Game.fadeV > 0;                 // exit zone touched
}
releaseAll();
check('snuck past the Listener to the exit', reachedExit, at() + ' creature=' + cre().state);
frames(200);                                    // fade through the exit
check('single-chapter loop returns to title', Game.state === 'title', Game.state);
check('finishing clears the save', sv() === null, JSON.stringify(sv()));

console.log('-- continue from save');
storageData.hollow_save = JSON.stringify({ chapter: 0, checkpointIdx: 1 });
frames(30);
tap('Space');
frames(180);
check('continues at saved checkpoint', Game.state === 'play' && Math.abs(P().x - (99 * TILE + 7)) < 2 && Game.checkpointIdx === 1, at() + ' idx=' + Game.checkpointIdx);

console.log('-- camera');
check('camera clamped', Game.cam.x >= 0 && Game.cam.y >= 0 &&
  Game.cam.x <= L.rows[0].length * TILE - 960 && Game.cam.y <= 24 * TILE - 540,
  `cam=${Game.cam.x.toFixed(1)},${Game.cam.y.toFixed(1)}`);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
