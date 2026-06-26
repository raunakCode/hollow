#!/usr/bin/env node
// ---------------------------------------------------------------
// HOLLOW - dev/ch8.js : Chapter 8 (THE CORE) walkthrough harness.
// Loads the REAL chapter list (LEVELS[7] = Ch.8) and proves the gauntlet +
// the ending cinematic:
//   ROOM A — THE GLARE. A single STEADY beam down the roofed strip (no sweep ->
//     no timing gap; can't be jumped over or outrun), so the box shadow is
//     required: a no-box sprint is caught, while a box-shield push crosses alive
//     and latches the exit gate d_a.
//   ROOM B — THE CHORUS. Driving both husks right + a jump at the step desyncs
//     them (one onto pBhi, one onto pBlo) and latches d_b; a naive no-jump walk
//     leaves both low (only pBlo) and the gate stays shut.
//   ROOM C — THE STILLNESS. The Listener HEARS HUSKS: a husk moving near its
//     open eye is lunged at and killed; a still husk is safe; a careful drive
//     reaches pC and latches d_c; the player's own freeze-on-the-eye crossing
//     survives.
//   THE CORE. Touching the Core flips to the ending: the crowd walks to the
//     wall, it opens, then whiteout -> card -> credits -> end -> title.
//   Run `node dev/ch8.js`.
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
const husksOf = g => W().husks.filter(h => h.group === g);
const plate = id => W().plates.find(p => p.id === id);
const helmOf = g => W().helms.find(h => h.group === g);
const doorLinking = id => W().doors.find(d => d.links && d.links.includes(id));

function place(c, feetRow) {
  const p = P();
  p.h = STAND_H;
  p.x = c * TILE + (TILE - 18) / 2; p.y = feetRow * TILE - p.h; p.vx = 0; p.vy = 0;
  p.mantle = null; p.grabbing = false; p.grabbedBox = null;
  Game.breath = 9;
}
function startCh8() {
  loadChapter(7);
  Game.state = 'play'; Game.fade = 0; Game.fadeV = 0; Game.paused = false; Game.onFaded = null;
  Game.helmed = null; Game.ending = null;
  releaseAll(); frames(1);
}
function connect(g) { Game.helmed = helmOf(g); }
function step(n, keep) {
  let left = false;
  for (let i = 0; i < n; i++) {
    if (keep) keep();
    frames(1);
    if (Game.state !== 'play') left = true;
  }
  return left;
}
function waitState(ci, st, cap = 1400) {
  let n = 0;
  while (cre(ci).state !== st && n < cap) { frames(1); n++; }
  return n;
}
const danger = ci => cre(ci).state === 'waking' || cre(ci).state === 'alert';

// ----------------------------- tests -----------------------------
console.log('-- level sanity (Ch.8 THE CORE)');
startCh8();
check('is THE CORE', LEVELS[7].name === 'THE CORE', LEVELS[7].name);
check('24 rows, all 170 wide', LEVELS[7].rows.length === 24 && LEVELS[7].rows.every(r => r.length === 170));
check('1 core / 7 husks / 2 helms / 1 creature',
  W().cores.length === 1 && W().husks.length === 7 && W().helms.length === 2 && W().creatures.length === 1,
  `cores=${W().cores.length} husks=${W().husks.length} helms=${W().helms.length} cr=${W().creatures.length}`);
check('the Listener hears husks', cre(0).hearsHusks === true);
check('the wall (links _wall) starts shut', doorLinking('_wall') && doorLinking('_wall').openT < 0.1);

// ============================ ROOM A ============================
console.log('-- ROOM A: standing in the steady beam is lethal');
startCh8();
place(24, 18);                                  // stand in the lit strip, never move
const seamDied = step(180);                     // the beam is steady -> caught fast
check('standing still in the beam gets caught', seamDied,
  `died=${seamDied} state=${Game.state}`);

console.log('-- ROOM A: running the strip WITHOUT the box gets caught (the exploit this fixes)');
startCh8();
for (const b of W().boxes) b.x = -10000;        // remove the box entirely
place(10, 18);                                  // already inside the strip
let aRunDied = false;
for (let i = 0; i < 900 && col(P()) < 40; i++) {
  keyDown('ArrowRight');                         // sprint straight through, no cover
  frames(1);
  if (Game.state !== 'play') { aRunDied = true; break; }
}
releaseAll();
check('a no-box sprint through the glare is caught (cannot be outrun)', aRunDied,
  `died=${aRunDied} col=${col(P()).toFixed(1)} state=${Game.state}`);

console.log('-- ROOM A: STANDING behind the box leaves your head in the beam (caught)');
startCh8();
place(3, 18);                                   // WEST of the box (col 7)
let aStandDied = false;
for (let i = 0; i < 1600 && col(P()) < 37; i++) {
  keyDown('ArrowRight');                         // push standing — head pokes above the box
  frames(1);
  if (Game.state !== 'play') { aStandDied = true; break; }
}
releaseAll();
check('pushing the box while STANDING is caught (head above the box)', aStandDied,
  `died=${aStandDied} col=${col(P()).toFixed(1)} state=${Game.state}`);

console.log('-- ROOM A: CROUCH-pushing the box (fully in its shadow) crosses alive and latches d_a');
startCh8();
place(3, 18);                                   // WEST of the box (col 7) so we drive it east
let aDied = false;
for (let i = 0; i < 2600 && col(P()) < 37; i++) {
  keyDown('ArrowRight'); keyDown('ArrowDown');   // crouch-push: stay fully behind the box
  frames(1);
  if (Game.state !== 'play') { aDied = true; break; }
}
releaseAll();
const dA = doorLinking('pA');
check('crouch-pushed the box across the glare alive and latched d_a',
  !aDied && dA.open,
  `died=${aDied} d_a.open=${dA.open} col=${col(P()).toFixed(1)}`);

// ============================ ROOM B ============================
console.log('-- ROOM B: the husk is sealed in the basement — the player can never reach pB');
startCh8();
// try to open d_b from above without the husk: walk the floor over the basement
place(49, 18);
step(260, () => keyDown('ArrowRight'));         // walk right across the basement roof
releaseAll();
check('the player walking the floor never pressed pB / opened d_b (sealed below)',
  !plate('pB').pressed && !doorLinking('pB').open && col(P()) < 70,
  `pB=${plate('pB').pressed} d_b=${doorLinking('pB').open} col=${col(P()).toFixed(1)}`);

console.log('-- ROOM B: connect + drive the sealed husk onto pB -> d_b latches');
startCh8();
place(49, 18); connect('b');
step(140, () => keyDown('ArrowRight'));         // drive the basement husk east onto pB
releaseAll();
let hb0 = husksOf('b')[0];
check('the driven husk pressed pB and latched d_b',
  doorLinking('pB').open,
  `pB=${plate('pB').pressed} d_b=${doorLinking('pB').open} huskCol=${col(hb0).toFixed(1)} huskRow=${((hb0.y + hb0.h) / TILE).toFixed(1)}`);

console.log('-- ROOM B: the sealed husk can never escape the basement onto the main floor');
startCh8();
place(49, 18); connect('b');
hb0 = husksOf('b')[0];
// drive it around and jump repeatedly — it must stay below the row-19 roof
step(200, () => { keyDown('ArrowRight'); keyDown('Space'); });
step(60, () => { keyDown('ArrowLeft'); keyDown('Space'); });
releaseAll();
check('the husk stayed in the basement (feet below the main floor)',
  (hb0.y + hb0.h) / TILE > 19.5, `huskRow=${((hb0.y + hb0.h) / TILE).toFixed(1)}`);

// ============================ ROOM C ============================
console.log('-- ROOM C: a husk that MOVES near the open eye is lunged at and killed');
startCh8();
place(80, 18); connect('c');
// drive the husk into the danger zone while the eye is shut, then keep moving once it opens
let cMoveDied = false;
for (let i = 0; i < 1600 && !cMoveDied; i++) {
  keyDown('ArrowRight');                          // never freeze — keep the husk noisy
  frames(1);
  if (Game.state !== 'play') cMoveDied = true;
}
releaseAll();
check('moving the husk through the open eye killed the player (charge)', cMoveDied,
  `died=${cMoveDied} state=${Game.state}`);

console.log('-- ROOM C: a husk that holds STILL near the open eye is safe');
startCh8();
place(80, 18); connect('c');
// nudge the husk to ~col 100 (in range), then hold still through an alert
for (let i = 0; i < 130 && col(husksOf('c')[0]) < 99; i++) { keyDown('ArrowRight'); frames(1); }
releaseAll();
waitState(0, 'alert');
const cStillDied = step(150);                     // freeze through the open eye
check('the still husk survived the open eye', !cStillDied && Game.state === 'play',
  `died=${cStillDied} huskCol=${col(husksOf('c')[0]).toFixed(1)} creState=${cre(0).state}`);

console.log('-- ROOM C: a careful husk drive (freeze on the eye) reaches pC and latches d_c');
startCh8();
place(80, 18); connect('c');
let cDriveDied = false;
for (let i = 0; i < 4000 && col(husksOf('c')[0]) < 118; i++) {
  if (danger(0)) keyUp('ArrowRight'); else keyDown('ArrowRight');
  frames(1);
  if (Game.state !== 'play') cDriveDied = true;
}
releaseAll();
const dC = doorLinking('pC');
check('husk reached pC and latched d_c (alive)', !cDriveDied && plate('pC').pressed && dC.open,
  `died=${cDriveDied} huskCol=${col(husksOf('c')[0]).toFixed(1)} pC=${plate('pC').pressed} d_c=${dC.open}`);

console.log('-- ROOM C: the player can then cross on foot, freezing on the eye, and survive');
startCh8();
// latch d_c first (so the gate is open), then walk the player across
place(80, 18); connect('c');
for (let i = 0; i < 4000 && col(husksOf('c')[0]) < 118; i++) {
  if (danger(0)) keyUp('ArrowRight'); else keyDown('ArrowRight');
  frames(1);
}
releaseAll();
Game.helmed = null;
place(86, 18);
let pCrossDied = false;
for (let i = 0; i < 4000 && col(P()) < 124; i++) {
  if (danger(0)) keyUp('ArrowRight'); else keyDown('ArrowRight');
  frames(1);
  if (Game.state !== 'play') pCrossDied = true;
}
releaseAll();
check('player crossed the Listener on foot (past col 123) alive', !pCrossDied && col(P()) >= 124,
  `died=${pCrossDied} col=${col(P()).toFixed(1)}`);

// ============================ THE CORE / ENDING ============================
console.log('-- THE CORE: touching the glowing mass flips to the ending cinematic');
startCh8();
place(135, 18);
let touched = false;
for (let i = 0; i < 240 && !touched; i++) { keyDown('ArrowRight'); frames(1); if (Game.state === 'ending') touched = true; }
releaseAll();
check('walking into the Core started the ending', touched && Game.state === 'ending', `state=${Game.state}`);

console.log('-- THE CORE: the unison walk opens the wall, then whiteout -> card -> credits -> end -> title');
const wall = doorLinking('_wall');
let sawWhiteout = false, sawCard = false, sawCredits = false, sawEnd = false, backToTitle = false;
let maxOpen = 0;
for (let i = 0; i < 6000; i++) {
  // once the end-prompt is up, press a key to dismiss to the title
  if (Game.ending && Game.ending.phase === 'end') keyDown('Space');
  frames(1);
  if (Game.ending) {
    maxOpen = Math.max(maxOpen, wall.openT);
    if (Game.ending.phase === 'whiteout') sawWhiteout = true;
    if (Game.ending.phase === 'card') sawCard = true;
    if (Game.ending.phase === 'credits') sawCredits = true;
    if (Game.ending.phase === 'end') sawEnd = true;
  }
  if (Game.state === 'title') { backToTitle = true; break; }
}
releaseAll();
check('the wall opened during the unison walk', maxOpen > 0.85, `maxOpen=${maxOpen.toFixed(2)}`);
check('ending ran whiteout -> card -> credits -> end and returned to the title',
  sawWhiteout && sawCard && sawCredits && sawEnd && backToTitle,
  `whiteout=${sawWhiteout} card=${sawCard} credits=${sawCredits} end=${sawEnd} title=${backToTitle} state=${Game.state}`);
check('the ending cleared the save', storageData['hollow_save'] === undefined,
  `save=${storageData['hollow_save']}`);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
