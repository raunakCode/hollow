#!/usr/bin/env node
// ---------------------------------------------------------------
// HOLLOW - dev/ch3.js : Chapter 3 (THE YARD) walkthrough harness.
// Loads the REAL chapter list (LEVELS[2] = Ch.3) and proves every beat:
//   ROOM A (plates) — the two-plate `all` gate needs box+player (a lone plate
//     won't open it, nor can the gate be jumped); full push-box-and-mount solve.
//   ROOM B (counterweight lift) — a box on platform A raises + HOLDS B; the
//     bare exit ledge is unclimbable; you board the balanced B and mantle the
//     ledge; the box can't be shoved across to cheese the ledge face.
//   ROOM C (THE CRANE) — the crate cranks B up past a mid band to its top
//     clamp; a ceiling girder makes the clamp UN-mountable so you must BRAKE B
//     (lever brkC, real X interaction) at a mid height to bridge; the lock
//     holds under load and releases; full crane solve (crate drives, brake, mount).
//   Then the exit ends the chapter (last chapter -> title). Run `node dev/ch3.js`.
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
const PLATEAU = 16 * TILE;                 // top of the 4-tile ledges (rows 16-19)
// place the player with feet on tile-row `feetRow` (default the main floor)
function place(col, feetRow = 20, crouched = false) {
  const p = P();
  p.h = crouched ? CROUCH_H : STAND_H;
  p.x = col * TILE; p.y = feetRow * TILE - p.h; p.vx = 0; p.vy = 0;
  p.mantle = null; p.grabbing = false; p.grabbedBox = null;
}
// drop a box flat on a surface whose top is `topY`, centered over column `col`
function placeBox(box, col, topY) {
  box.x = col * TILE + 1; box.y = topY - box.h; box.vx = 0; box.vy = 0; box.grounded = true;
}
// boot Ch.3 into a live play state at LEVELS[2]
function startCh3() {
  loadChapter(2);
  Game.state = 'play'; Game.fade = 0; Game.fadeV = 0; Game.paused = false; Game.onFaded = null;
  releaseAll(); frames(1);
}
// hop to the right with FULL-HEIGHT jumps: hold right, and on every landing
// fire a jump and HOLD it ~16 frames (HOLLOW has variable jump height, so a
// 1-frame tap is only a minimum hop — useless for clearing 2 tiles). The state
// machine keeps Space-edges clean (release on landing, press next frame, hold
// for height, release near apex). Returns true once `done()` holds.
function climbRight(maxFrames, done) {
  let t = -1;                                  // -1 idle; 0 about to press; 1..16 holding
  for (let i = 0; i < maxFrames; i++) {
    keyDown('ArrowRight');
    if (t < 0) {
      keyUp('Space');
      if (P().grounded) t = 0;                 // landed: release now, press next frame
    } else if (t === 0) {
      keyDown('Space'); t = 1;                 // clean up->down edge: jump starts
    } else if (t < 16) {
      keyDown('Space'); t++;                   // hold for near-full height
    } else {
      keyUp('Space'); t = -1;                  // released; wait for the next landing
    }
    frames(1);
    if (done()) { releaseAll(); return true; }
  }
  releaseAll();
  return false;
}

const W = () => Game.world;
const boxA = () => W().boxes[0];           // Room A box (onto pa1)
const boxB = () => W().boxes[1];           // Room B box (counterweights lift 0)
const crate = () => W().boxes[2];          // Room C crate (drives lift 1)
const pa1 = () => W().plates[0];
const pa2 = () => W().plates[1];
const doorA = () => W().doors[0];
const lift1 = () => W().lifts[0];          // Room B: box-counterweight lift
const lift2 = () => W().lifts[1];          // Room C (Crane): crate + brake
const leverC = () => W().levers.find(l => l.id === 'brkC');   // Room C brake
// pull a brake lever via the real X-key interaction (player stands at its col)
function pullLever(col) { place(col); tap('KeyX', 2); frames(2); }

// ----------------------------- tests -----------------------------
console.log('-- level sanity (Ch.3 THE YARD)');
startCh3();
check('is THE YARD', LEVELS[2].name === 'THE YARD', LEVELS[2].name);
check('24 rows', LEVELS[2].rows.length === 24, LEVELS[2].rows.length);
check('rows equal length', LEVELS[2].rows.every(r => r.length === LEVELS[2].rows[0].length));
check('3 boxes / 2 plates / 1 door / 2 lifts / 1 lever', W().boxes.length === 3 && W().plates.length === 2 && W().doors.length === 1 && W().lifts.length === 2 && W().levers.length === 1,
  `b=${W().boxes.length} p=${W().plates.length} d=${W().doors.length} l=${W().lifts.length} v=${W().levers.length}`);
check('2 checkpoints / 1 exit', W().checks.length === 2 && W().exits.length === 1, `c=${W().checks.length} e=${W().exits.length}`);
check('only Room C lift carries a brake lock', lift1().lock === null && lift2().lock === 'brkC', `${lift1().lock} ${lift2().lock}`);

console.log('-- ROOM A: the closed gate blocks passage (no jump-over)');
startCh3(); place(28);
const blockedA = !climbRight(180, () => P().x > 32 * TILE);
check('cannot pass the closed two-plate gate', blockedA && !doorA().open, at() + ` open=${doorA().open}`);

console.log('-- ROOM A: a single plate is not enough (all-mode)');
startCh3();
placeBox(boxA(), 20, FLOOR);                // box on pa1 only
place(16);                                  // player off both plates
frames(60);
check('one plate held -> gate stays shut', pa1().pressed && !pa2().pressed && !doorA().open, `pa1=${pa1().pressed} pa2=${pa2().pressed} open=${doorA().open}`);

console.log('-- ROOM A: box on pa1 + you on pa2 -> gate latches open');
startCh3();
placeBox(boxA(), 20, FLOOR);                // box on pa1
place(25);                                  // you on pa2
frames(60);
check('both plates -> gate opens', doorA().open, `pa1=${pa1().pressed} pa2=${pa2().pressed} open=${doorA().open}`);
// latch: step off and the gate stays open
place(16); frames(60);
check('gate stays latched after stepping off', doorA().open, `open=${doorA().open}`);

console.log('-- ROOM A: full solve — push box onto pa1, mount pa2, walk through to checkpoint 0');
startCh3(); place(14);
// phase 1: push the box onto pa1 (zone cols 20-21)
keyDown('ArrowRight');
for (let i = 0; i < 700 && boxA().x < 20 * TILE + 4; i++) frames(1);
releaseAll();
const boxOnPa1 = boxA().x >= 20 * TILE - 6 && boxA().x <= 22 * TILE;
// phase 2: a single full-height jump over the box (clear it without nudging it)
keyDown('ArrowRight'); keyDown('Space');
for (let i = 0; i < 16; i++) frames(1);
keyUp('Space');
for (let i = 0; i < 40 && !P().grounded; i++) frames(1);   // land right of the box
// phase 3: walk (grounded, so pa2 registers) across pa2 -> gate latches -> on
// through it to checkpoint 0. The gate keeps opening once latched, so pressing
// against it and holding right walks through as soon as it clears.
let throughA = false;
for (let i = 0; i < 700; i++) {
  keyDown('ArrowRight'); keyUp('Space');
  frames(1);
  if (Game.checkpointIdx >= 0 && P().x > 33 * TILE) { throughA = true; break; }
}
releaseAll();
check('cleared Room A to checkpoint 0', boxOnPa1 && throughA && doorA().open && boxA().x <= 22 * TILE,
  at() + ` boxX=${boxA().x.toFixed(0)} cp=${Game.checkpointIdx} open=${doorA().open}`);

// ====================== ROOM B — counterweight lift ======================
// The BASIC lift: a box on platform A sinks it and raises + HOLDS the far
// platform B; you board the balanced B and mantle the exit ledge (51-57,
// 4-tile face, top row 16). No brake — the box does the holding.

console.log('-- ROOM B: the bare exit ledge (51-57, 4-tile face) is NOT climbable');
startCh3(); place(46);                       // on the divider, lift at rest (B flush)
const bareB = !climbRight(240, () => P().y < PLATEAU + 6 && P().x > 51 * TILE);
check('cannot scale the bare exit ledge without the lift', bareB, at());

console.log('-- ROOM B: box on platform A sinks it and RAISES + holds platform B');
startCh3();
placeBox(boxB(), 42, FLOOR);                 // box onto platform A (cols 42-43)
frames(180);
check('lift drove to its clamp (B fully raised to row 18)', lift1().off <= -TILE * 2 + 4, `off=${lift1().off.toFixed(1)}`);
const bTopRaised = lift1().by + lift1().off; // platform B top (px)
check('platform B rose ~2 tiles', bTopRaised <= FLOOR - TILE * 2 + 4, `Btop=${bTopRaised.toFixed(1)}`);
frames(120);                                 // box still on A, nothing on B
check('the box HOLDS B raised (position is state, not drift)', lift1().off <= -TILE * 2 + 4, `off=${lift1().off.toFixed(1)}`);

console.log('-- ROOM B: with B raised, board it and mantle the exit ledge (solvable)');
// search over run-up timing on the divider (a player picks the launch; the
// script must too): raise B fresh each attempt, run a few frames, then hop the
// air gap onto the held B and mantle the exit ledge.
function ascend(boxIdx, boxCol, startCol, targetX) {
  for (let r = 0; r <= 30; r += 2) {
    startCh3();
    placeBox(W().boxes[boxIdx], boxCol, FLOOR);
    frames(180);                             // raise the far platform + settle
    place(startCol);
    keyDown('ArrowRight'); frames(r); releaseAll();   // vary the launch point
    if (climbRight(320, () => P().y < PLATEAU + 6 && P().x > targetX && P().grounded)) return r;
  }
  return -1;
}
const upB = ascend(1, 42, 46, 51 * TILE);
check('reached the exit ledge via the raised lift', upB >= 0, `no run-up timing worked, last ${at()}`);

console.log('-- ROOM B: the box cannot be shoved across pit B to the ledge face');
startCh3(); place(38);                         // left of the Room B box (39)
let boxCrossed = false;
keyDown('ArrowRight');
for (let i = 0; i < 600; i++) { frames(1); if (boxB().x > 47 * TILE) { boxCrossed = true; break; } }
releaseAll();
check('box stays on the A side (never reaches the ledge face)', !boxCrossed, `box x=${boxB().x.toFixed(0)}`);

// ============================ ROOM C — THE CRANE ============================
// The crate drives B up; a ceiling girder (row 15, cols 75-76) makes B at its
// top clamp (row 17) un-mountable, so you must BRAKE it at a mountable mid
// height (row 18) as it rises, then hop on and mantle the exit ledge (79-84).

console.log('-- ROOM C: the crate cranks B up toward its (overshooting) top clamp');
startCh3();
placeBox(crate(), 70, FLOOR);                  // crate onto platform A -> B rises
let passedMid = false;
for (let i = 0; i < 240; i++) { frames(1); if (lift2().off <= -TILE * 2 + 1) passedMid = true; }
check('crate drove B up past the mid band (row 18) to its top clamp (row 17)', passedMid && lift2().off <= -TILE * 3 + 4, `off=${lift2().off.toFixed(1)}`);

console.log('-- ROOM C: the crate can be PUSHED onto A (not just teleported) to drive it');
// the other Room-C tests place the crate on A directly; this proves it actually
// loads by pushing it off the floor onto the platform, then that you can cross
// pit A to reach the brake lever (the real loop a player walks).
startCh3(); place(63);                          // on the floor, left of the crate (65)
keyDown('ArrowRight');
for (let i = 0; i < 420 && lift2().off > -TILE * 2; i++) frames(1);
releaseAll();
check('pushing the crate onto A cranks the lift up past the mid band', lift2().off <= -TILE * 2, `off=${lift2().off.toFixed(1)} crateCol=${(crate().x / TILE).toFixed(1)}`);
const crossedC = climbRight(180, () => P().grounded && P().x >= 72 * TILE && P().x < 75 * TILE && P().y + P().h <= FLOOR + 4);
check('then cross pit A to the brake lever on the divider', crossedC, at());

console.log('-- ROOM C: the top clamp (row 17) is UN-mountable (ceiling girder)');
startCh3();
lift2().off = -TILE * 3;                       // B at its top clamp, row 17
leverC().on = true;                            // freeze it there
place(74);                                     // on the divider, beside the gap
const clampC = climbRight(260, () => P().y < PLATEAU + 6 && P().x > 79 * TILE && P().grounded);
check('cannot mount B at the clamp (the girder caps your jump)', !clampC, at());

console.log('-- ROOM C: braking B at a MID height (row 18) bridges to the exit ledge');
startCh3();
lift2().off = -TILE * 2;                       // B braked at row 18 (mountable)
leverC().on = true;
place(74);                                     // on the divider, beside the gap
const midC = climbRight(260, () => P().y < PLATEAU + 6 && P().x > 79 * TILE && P().grounded);
check('mount the mid-braked B and mantle the exit ledge (row 16)', midC, at());

console.log('-- ROOM C: the BRAKE (real X lever) freezes the lift under load, releases free');
startCh3();
placeBox(crate(), 70, FLOOR);                  // crate on A -> lift wants to drive
pullLever(73);                                 // walk to brkC and tap X to engage the brake
check('lever brkC engaged by the X key', leverC().on, `on=${leverC().on}`);
const offHeld = lift2().off; frames(150);
check('locked lift holds position under load (brake engaged)', Math.abs(lift2().off - offHeld) < 2, `off ${offHeld.toFixed(1)} -> ${lift2().off.toFixed(1)}`);
leverC().on = false; frames(150);              // release the brake
check('released lift resumes driving to its clamp (row 17)', lift2().off <= -TILE * 3 + 4, `off=${lift2().off.toFixed(1)}`);

console.log('-- ROOM C: full solve — crate drives, brake at mid, mount, reach the ledge');
startCh3();
placeBox(crate(), 70, FLOOR);                  // crate cranks B up
let braked = false;
for (let i = 0; i < 240 && !braked; i++) { frames(1); if (lift2().off <= -TILE * 2) { leverC().on = true; braked = true; } }
check('caught B at the mid band with the brake', braked && lift2().off > -TILE * 3 + 2, `off=${lift2().off.toFixed(1)}`);
place(74);                                     // to the divider, beside the gap
const solvedC = climbRight(260, () => P().y < PLATEAU + 6 && P().x > 79 * TILE && P().grounded);
check('crane solved: mid-braked B is mountable to the exit ledge', solvedC, at());

console.log('-- reach the exit -> chapter ends (last chapter -> title)');
startCh3();
place(88);                                     // foot of the Room C exit stairs
keyDown('ArrowRight');
for (let i = 0; i < 400 && Game.state === 'play'; i++) frames(1);
releaseAll();
check('exit finished the chapter (returned to title)', Game.state === 'title', `state=${Game.state} ${at()}`);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
