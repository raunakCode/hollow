#!/usr/bin/env node
// ---------------------------------------------------------------
// HOLLOW - dev/ch7.js : Chapter 7 (THE DEEP) walkthrough harness.
// Loads the REAL chapter list (LEVELS[6] = Ch.7) and proves the red-light /
// green-light Listener mechanic and every room:
//   CORE — moving near an OPEN eye is lethal (charge); standing still is always
//     safe; the 0.8 s waking "growl" is a true warning (no charge mid-waking).
//   ROOM A — THE FIRST EYE. A careful freeze-on-the-eye crossing survives.
//   ROOM B — THE TWO. Two Listeners on independent cycles; a stop-and-go
//     crossing (freeze when EITHER eye opens) survives; freezing is safe even
//     when both eyes are open.
//   ROOM C — THE FLOODED HOLLOW. A submerged bottom-walk crossing: the safe
//     freeze is standing still on the pool floor (grounded); the crossing
//     survives without drowning.
//   ROOM D — THE COLLAPSE. Entering wakes the chaser (no lunge); stepping pD
//     opens the descending exit door dD AND lunges the chaser; a full sprint
//     slides under dD and reaches the exit -> title; dawdling at pD is swept;
//     the door is required (shut by default blocks the exit) and it re-seals.
//   Run `node dev/ch7.js`.
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
vm.runInContext('globalThis.__T = { Input, Game, LEVELS, TILE, STAND_H, loadChapter };', sandbox);
const { Input, Game, LEVELS, TILE, STAND_H, loadChapter } = sandbox.__T;

// --------------------------- driving -----------------------------
let now = 0;
function frames(n) {
  for (let i = 0; i < n; i++) { now += 1000 / 60; const cb = rafCb; rafCb = null; if (cb) cb(now); }
}
function keyDown(code) { for (const fn of listeners.keydown || []) fn({ code, preventDefault() {} }); }
function keyUp(code) { for (const fn of listeners.keyup || []) fn({ code }); }
function releaseAll() { for (const k of Object.keys(Input.keys)) keyUp(k); }

let failures = 0;
function check(label, cond, detail) {
  const ok = !!cond;
  console.log((ok ? '  ok ' : 'FAIL ') + label + (ok ? '' : '   [' + detail + ']'));
  if (!ok) failures++;
}
const P = () => Game.player;
const W = () => Game.world;
const cre = i => W().creatures[i];
const col = e => e.x / TILE;

function place(c, feetRow) {
  const p = P();
  p.h = STAND_H;
  p.x = c * TILE + (TILE - 18) / 2; p.y = feetRow * TILE - p.h; p.vx = 0; p.vy = 0;
  p.mantle = null; p.grabbing = false; p.grabbedBox = null;
  Game.breath = 9;
}
function startCh7() {
  loadChapter(6);
  Game.state = 'play'; Game.fade = 0; Game.fadeV = 0; Game.paused = false; Game.onFaded = null;
  Game.helmed = null;
  releaseAll(); frames(1);
}
// advance n frames; returns true if the game left 'play' (a death/exit) at any point
function step(n, keep) {
  let left = false;
  for (let i = 0; i < n; i++) {
    if (keep) keep();
    frames(1);
    if (Game.state !== 'play') left = true;
  }
  return left;
}
// advance until creature ci reaches `st` state (or cap); returns frames waited
function waitState(ci, st, cap = 1200) {
  let n = 0;
  while (cre(ci).state !== st && n < cap) { frames(1); n++; }
  return n;
}
const danger = ci => cre(ci).state === 'waking' || cre(ci).state === 'alert';

// ----------------------------- tests -----------------------------
console.log('-- level sanity (Ch.7 THE DEEP)');
startCh7();
check('is THE DEEP', LEVELS[6].name === 'THE DEEP', LEVELS[6].name);
check('24 rows, all 226 wide', LEVELS[6].rows.length === 24 && LEVELS[6].rows.every(r => r.length === 226));
check('dark mask on', LEVELS[6].dark === true, `dark=${LEVELS[6].dark}`);
check('5 creatures / 5 checks / 1 plate / 1 door / 1 exit / 2 triggers',
  W().creatures.length === 5 && W().checks.length === 5 && W().plates.length === 1 &&
  W().doors.length === 1 && W().exits.length === 1 && W().triggers.length === 2,
  `cr=${W().creatures.length} ck=${W().checks.length} pl=${W().plates.length} d=${W().doors.length} ex=${W().exits.length} tr=${W().triggers.length}`);
check('exit door dD starts shut', !W().doors[0].open && W().doors[0].openT < 0.1);

// ===================== CORE MECHANIC =====================
console.log('-- CORE: the Listener eye CYCLES dormant -> waking -> alert -> dormant');
startCh7();
place(24, 18);
let sawWaking = false, sawAlert = false, sawDormantAfter = false;
for (let i = 0; i < 1400; i++) {
  frames(1);
  const s = cre(0).state;
  if (s === 'waking') sawWaking = true;
  if (s === 'alert') sawAlert = true;
  if (sawAlert && s === 'dormant') sawDormantAfter = true;
}
check('eye opened (waking + alert observed) and shut again', sawWaking && sawAlert && sawDormantAfter,
  `waking=${sawWaking} alert=${sawAlert} reclosed=${sawDormantAfter}`);

console.log('-- CORE: standing STILL while the eye is open is safe (no charge)');
startCh7();
place(24, 18);                                        // within range of creatures[0] (col 30, range 14)
waitState(0, 'alert');
const stillDied = step(180);                          // hold still through the whole alert
check('did NOT die standing still during an open eye', !stillDied && Game.state === 'play',
  `state=${Game.state}`);

console.log('-- CORE: MOVING while the eye is open triggers a lethal charge');
startCh7();
place(26, 18);
waitState(0, 'alert');
const movedDied = step(60, () => keyDown('ArrowRight'));   // move with the eye open
releaseAll();
check('moving near an open eye got the player killed (charge)', movedDied,
  `state=${Game.state} eye=${cre(0).eye.toFixed(2)}`);

console.log('-- CORE: the 0.8s waking growl is a true warning (no charge mid-waking)');
startCh7();
place(26, 18);
waitState(0, 'waking');
// move for ~0.3s — still inside the 0.8s waking window, then stop
const wakeMovedDied = step(18, () => keyDown('ArrowRight'));
releaseAll();
check('moving DURING the waking growl did not (yet) charge', !wakeMovedDied,
  `state=${Game.state} creState=${cre(0).state}`);

// ============================ ROOM A ============================
console.log('-- ROOM A: a careful freeze-on-the-eye crossing past the lone Listener survives');
startCh7();
place(16, 18);
let aDied = false;
for (let i = 0; i < 2400 && col(P()) < 46; i++) {
  if (danger(0)) keyUp('ArrowRight'); else keyDown('ArrowRight');
  frames(1);
  if (Game.state !== 'play') aDied = true;
}
releaseAll();
check('crossed Room A alive (reached past col 45, never charged)', !aDied && col(P()) >= 46,
  `died=${aDied} col=${col(P()).toFixed(1)}`);

// ============================ ROOM B ============================
console.log('-- ROOM B: the two Listeners run on INDEPENDENT cycles');
startCh7();
place(64, 18);
let everDiffer = false;
for (let i = 0; i < 1200; i++) { frames(1); if (cre(1).state !== cre(2).state) everDiffer = true; }
check('creatures[1] and [2] are out of phase at some point (independent timers)', everDiffer);

console.log('-- ROOM B: a stop-and-go crossing (freeze when EITHER eye opens) survives');
startCh7();
place(52, 18);
let bDied = false;
for (let i = 0; i < 3000 && col(P()) < 92; i++) {
  if (danger(1) || danger(2)) keyUp('ArrowRight'); else keyDown('ArrowRight');
  frames(1);
  if (Game.state !== 'play') bDied = true;
}
releaseAll();
check('crossed Room B alive (reached past col 91)', !bDied && col(P()) >= 92,
  `died=${bDied} col=${col(P()).toFixed(1)}`);

// ============================ ROOM C ============================
console.log('-- ROOM C: an idle submerged player SINKS to the floor (so the safe freeze is a floor-stand)');
startCh7();
place(125, 15);                                        // drop in mid-water, above the floor
step(120);                                             // let it settle
check('idle swimmer ended up grounded on the pool floor', P().grounded && P().inWater,
  `grounded=${P().grounded} inWater=${P().inWater} feetRow=${((P().y + P().h) / TILE).toFixed(2)}`);

console.log('-- ROOM C: standing still on the pool floor while the eye is open is safe');
startCh7();
place(124, 18);                                        // on the floor, in the water, near creatures[3]
step(60);
waitState(3, 'alert');
const cStillDied = step(150);
check('did NOT die standing still submerged during an open eye', !cStillDied && Game.state === 'play',
  `state=${Game.state}`);

console.log('-- ROOM C: a careful submerged crossing survives without drowning');
startCh7();
place(116, 18);                                        // dry, before the pool (checkpoint 3)
let cDied = false, minBreath = 9;
for (let i = 0; i < 2600 && col(P()) < 134; i++) {
  if (danger(3)) keyUp('ArrowRight'); else keyDown('ArrowRight');
  frames(1);
  minBreath = Math.min(minBreath, Game.breath);
  if (Game.state !== 'play') cDied = true;
}
releaseAll();
check('crossed the pool alive (reached past col 133), never drowned, never charged',
  !cDied && col(P()) >= 134 && minBreath > 0.5,
  `died=${cDied} col=${col(P()).toFixed(1)} minBreath=${minBreath.toFixed(2)}`);

// ============================ ROOM D ============================
console.log('-- ROOM D: entering the finale corridor WAKES the chaser (a growl, no lunge)');
startCh7();
place(158, 18);
const wakeDied = step(60, () => keyDown('ArrowRight'));   // walk across trigger1 (col 162)
releaseAll();
check('crossing the entry trigger woke the chaser without charging (survived)',
  !wakeDied && cre(4).eye > 0.05 && cre(4).state !== 'charge',
  `state=${cre(4).state} eye=${cre(4).eye.toFixed(2)} died=${wakeDied}`);

console.log('-- ROOM D: stepping plate pD OPENS the descending exit door dD');
startCh7();
place(188, 18);                                        // on pD
step(80);
check('door dD opened while standing on pD', W().doors[0].openT > 0.7,
  `openT=${W().doors[0].openT.toFixed(2)}`);

console.log('-- ROOM D: pD released -> the door re-seals (the descending shutter)');
startCh7();
place(188, 18); step(40);                              // press pD (door opens, hold armed)
place(196, 18);                                        // step off, past the door
const sealed = step(200);
check('door dD closed again after the hold expired', !W().doors[0].open && W().doors[0].openT < 0.1,
  `open=${W().doors[0].open} openT=${W().doors[0].openT.toFixed(2)}`);

console.log('-- ROOM D: the door is required — shut by default it blocks the exit');
startCh7();
place(196, 18);
let exited = false;
for (let i = 0; i < 240; i++) { keyDown('ArrowRight'); frames(1); if (Game.state === 'title') exited = true; }
releaseAll();
check('a closed dD blocks the run to the exit (player held at the door, no exit)',
  !exited && col(P()) < 200, `exited=${exited} col=${col(P()).toFixed(1)}`);

console.log('-- ROOM D: dawdling on pD gets swept by the lunging chaser');
startCh7();
place(186, 18);
let dawdleDied = false;
for (let i = 0; i < 260; i++) {
  if (col(P()) < 188) keyDown('ArrowRight'); else keyUp('ArrowRight');   // walk onto pD, then STOP
  frames(1);
  if (Game.state !== 'play') dawdleDied = true;
}
releaseAll();
check('stopping on pD let the chaser lunge through and kill the player', dawdleDied,
  `died=${dawdleDied}`);

console.log('-- ROOM D: a full sprint slides under the descending door and reaches the exit -> Ch.8');
startCh7();
place(150, 18);                                        // finale entrance (checkpoint 4)
let won = false, sprintDied = false;
for (let i = 0; i < 600; i++) {
  keyDown('ArrowRight');
  frames(1);
  if (Game.chapterIdx === 7) { won = true; break; }    // Ch.7 now advances to Ch.8
  if (Game.state === 'dead') sprintDied = true;
}
releaseAll();
check('full sprint cleared the finale (slid under dD) -> exit -> Ch.8 (THE CORE)',
  won && !sprintDied, `won=${won} died=${sprintDied} state=${Game.state} idx=${Game.chapterIdx} col=${col(P()).toFixed(1)}`);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
