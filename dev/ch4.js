#!/usr/bin/env node
// ---------------------------------------------------------------
// HOLLOW - dev/ch4.js : Chapter 4 (THE DRAINS) walkthrough harness.
// Loads the REAL chapter list (LEVELS[3] = Ch.4) and proves every beat:
//   ROOM A (the pool) — swim across an open pool and jump out onto the far bank
//     (no drowning: the surface is always open).
//   ROOM B (flooded corridor) — the breath timer drains head-underwater and
//     refills at the air-pocket chimneys; the exit GRATE (door gB) stays shut
//     until its SUNKEN lever (gB, pulled underwater with X) latches it open; the
//     lever detour fits the breath budget (a chimney->lever->chimney dive never
//     drowns), and a surface swim spans the whole corridor without drowning.
//   ROOM C (the raft) — the high pipe ledge (row 9) is unreachable from the pool
//     (can't jump out that high, can't mantle from water), but floating the box
//     in as a raft and climbing it bridges to the pipe.
//   ROOM D (the cistern) — the sunken lever (gD) sits under a guard grate (you
//     can't drop straight onto it; you descend beside it and swim in along the
//     floor); pulling it latches the exit gate (gD) open; the gate blocks the
//     walk-out until then. Then the exit ends the chapter (last chapter->title).
//   Run `node dev/ch4.js`.
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
vm.runInContext('globalThis.__T = { Input, Game, LEVELS, TILE, STAND_H, CROUCH_H, loadChapter, BREATH_MAX };', sandbox);
const { Input, Game, LEVELS, TILE, STAND_H, CROUCH_H, loadChapter, BREATH_MAX } = sandbox.__T;

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
const W = () => Game.world;
const at = () => `x=${P().x.toFixed(1)} y=${P().y.toFixed(1)} inW=${P().inWater} g=${P().grounded} br=${Game.breath.toFixed(1)} state=${Game.state}`;

// place the player with feet on tile-row `feetRow`, centered over column `col`
function place(col, feetRow, crouched = false) {
  const p = P();
  p.h = crouched ? CROUCH_H : STAND_H;
  p.x = col * TILE; p.y = feetRow * TILE - p.h; p.vx = 0; p.vy = 0;
  p.mantle = null; p.grabbing = false; p.grabbedBox = null;
}
function placeBox(box, col, topY) {
  box.x = col * TILE + 1; box.y = topY - box.h; box.vx = 0; box.vy = 0; box.grounded = true;
}
function startCh4() {
  loadChapter(3);
  Game.state = 'play'; Game.fade = 0; Game.fadeV = 0; Game.paused = false; Game.onFaded = null;
  releaseAll(); frames(1);
}

// Swim driver: hold `dir` keys; vertical mode is one of
//   opts.dive  — hold ArrowDown (sink to the floor),
//   opts.hold  — HOLD Space (swim-up held = glide along the surface, no
//                jump-out launch; jumpPressed only fires once),
//   default    — PULSE Space (swim up + repeated jump-out edges, e.g. to clamber
//                out onto a bank).
// Tracks the minimum breath seen. Returns true once done() holds.
let minBreath = BREATH_MAX;
function swim(dirKeys, maxFrames, done, opts = {}) {
  opts = opts || {};
  for (let i = 0; i < maxFrames; i++) {
    for (const k of dirKeys) keyDown(k);
    if (opts.dive) { keyDown('ArrowDown'); keyUp('Space'); }
    else {
      keyUp('ArrowDown');
      if (opts.hold) keyDown('Space');                          // surface glide
      else { if (i % 3 < 2) keyDown('Space'); else keyUp('Space'); }  // pulse / jump-out
    }
    frames(1);
    minBreath = Math.min(minBreath, Game.breath);
    if (done && done()) { releaseAll(); return true; }
  }
  releaseAll();
  return false;
}
const FLOOR = 21 * TILE;

// ----------------------------- tests -----------------------------
console.log('-- level sanity (Ch.4 THE DRAINS)');
startCh4();
check('is THE DRAINS', LEVELS[3].name === 'THE DRAINS', LEVELS[3].name);
check('24 rows, all 150 wide', LEVELS[3].rows.length === 24 && LEVELS[3].rows.every(r => r.length === 150));
check('1 box / 2 levers / 2 doors / 3 checks / 1 exit',
  W().boxes.length === 1 && W().levers.length === 2 && W().doors.length === 2 && W().checks.length === 3 && W().exits.length === 1,
  `b=${W().boxes.length} v=${W().levers.length} d=${W().doors.length} c=${W().checks.length} e=${W().exits.length}`);
const leverB = () => W().levers.find(l => l.id === 'gB');
const leverD = () => W().levers.find(l => l.id === 'gD');
const grateB = () => W().doors[0];                 // exit grate, links gB
const gateD = () => W().doors[1];                  // exit gate, links gD
check('both gates start latched-shut', !grateB().open && !gateD().open, `B=${grateB().open} D=${gateD().open}`);

// ============================ ROOM A — THE POOL ============================
console.log('-- ROOM A: full breath at the open surface (no drowning while swimming)');
startCh4();
place(15, 16);                                      // mid-pool, near the surface
swim(['ArrowRight'], 120, null);                    // swim around at the surface
check('breath stays full at an open surface', Game.breath > BREATH_MAX - 1, `br=${Game.breath.toFixed(2)}`);

console.log('-- ROOM A: swim across the pool and jump out onto the far bank');
startCh4(); place(3, 12);                            // on the start deck
const crossedA = swim(['ArrowRight'], 600, () => P().grounded && !P().inWater && P().x > 25 * TILE);
check('reached the far bank (swam across + jumped out)', crossedA, at());

// ============================ ROOM B — THE FLOODED CORRIDOR ================
console.log('-- ROOM B: breath DRAINS while submerged under the roof');
startCh4();
place(46, 18);                                      // mid-corridor, deep (under the roof)
const br0 = Game.breath;
frames(120);                                        // ~2 s submerged
check('submerged head-underwater drains breath', Game.breath < br0 - 1.5, `${br0.toFixed(1)} -> ${Game.breath.toFixed(1)}`);

console.log('-- ROOM B: breath REFILLS at an air-pocket chimney');
startCh4();
Game.breath = 3;                                    // start low
place(40, 14);                                      // in chimney 1, near the surface
swim(['ArrowRight'], 60, null);                     // hold near the surface in the shaft
check('surfacing at a chimney refills breath', Game.breath > 6, `br=${Game.breath.toFixed(2)}`);

console.log('-- ROOM B: the exit grate is SHUT, blocking the corridor at col 81');
startCh4();
place(78, 18);                                      // in the roofed corridor, left of the grate
const passed = swim(['ArrowRight'], 200, () => P().x > 82 * TILE, { hold: true });
check('cannot pass the shut grate to the exit shaft', !passed && !grateB().open, at() + ` open=${grateB().open}`);

console.log('-- ROOM B: the sunken lever (X underwater) latches the exit grate open');
startCh4();
place(58, 20);                                      // at the lever, on the corridor floor
tap('KeyX', 2); frames(2);
check('lever gB engaged by X underwater', leverB().on, `on=${leverB().on}`);
frames(150);
check('exit grate latched open', grateB().open, `open=${grateB().open}`);

console.log('-- ROOM B: the lever detour fits the breath budget (chimney->lever->chimney)');
startCh4();
place(52, 14);                                      // surfaced at chimney 2 (full breath)
minBreath = Game.breath;
swim(['ArrowRight'], 50, () => P().x > 57 * TILE && P().y > 18 * TILE, { dive: true });  // dive down-right to the lever
swim([], 20, null, { dive: true });                 // settle at the lever depth
const reachedLever = Math.abs(P().x - 58 * TILE) < 2.5 * TILE && P().y > 17 * TILE;
swim(['ArrowLeft'], 120, () => !P().inWater || (P().x < 53 * TILE && P().y < 14 * TILE));  // back up to a chimney
check('reached the lever and back to air without drowning', reachedLever && minBreath > 0.2 && Game.state === 'play',
  `reached=${reachedLever} minBr=${minBreath.toFixed(2)} ${at()}`);

console.log('-- ROOM B: traversing the corridor (breathe at chimneys) never drowns');
// Position-aware swim: glide right under the roofs (head submerged, breath
// drains); whenever the roof is OPEN above (a chimney/shaft) and breath isn't
// full, rise to surface and breathe. Proves the corridor is physically passable
// AND that the chimney spacing keeps you alive end to end.
startCh4();
leverB().on = true; frames(120);                    // grate open (lever already pulled)
place(33, 14);                                      // dropped into the entrance shaft
minBreath = Game.breath;
const rows = Game.level.rows;
let spanned = false;
for (let i = 0; i < 1400; i++) {
  const p = P();
  keyDown('ArrowRight');
  const col = Math.floor((p.x + p.w / 2) / TILE);
  const openAbove = col >= 0 && col < 150 && rows[10][col] !== '#';   // chimney/shaft column
  if (openAbove && Game.breath < 7) keyDown('Space');                 // rise into the chimney to breathe
  else if (p.y > 14 * TILE) keyDown('Space');                         // sinking too deep -> nudge up toward the surface
  else keyUp('Space');                                                // glide right just under the roof
  frames(1);
  minBreath = Math.min(minBreath, Game.breath);
  if (p.grounded && !p.inWater && p.x > 85 * TILE) { spanned = true; break; }
}
releaseAll();
check('crossed the flooded corridor onto the Room-C ledge alive', spanned && minBreath > 0.1,
  `spanned=${spanned} minBr=${minBreath.toFixed(2)} ${at()}`);

// ============================ ROOM C — THE RAFT ============================
const box = () => W().boxes[0];
console.log('-- ROOM C: the pipe ledge (row 9) is NOT reachable from the pool bare');
startCh4();
place(100, 19);                                     // down in the pool, no raft
const reachedPipeBare = swim(['ArrowRight'], 260, () => P().grounded && P().x > 102 * TILE && P().y < 10 * TILE);
check('cannot reach the high pipe without the raft', !reachedPipeBare, at());

console.log('-- ROOM C: the box can be pushed off the ledge into the pool and floats');
startCh4(); place(93, 12);                           // on the ledge, left of the box (96)
keyDown('ArrowRight');
for (let i = 0; i < 300 && box().x < 100 * TILE; i++) frames(1);
releaseAll(); frames(40);                            // let it settle on the water
const surf = 12 * TILE;
check('box floats in the pool (rides at the surface)', box().x >= 99 * TILE && Math.abs(box().y - (surf - 8)) < 14,
  `boxX=${box().x.toFixed(0)} boxY=${box().y.toFixed(0)} surf=${surf}`);

console.log('-- ROOM C: climb the floated box (raft) and mantle the high pipe ledge');
startCh4();
placeBox(box(), 100, surf - 8 + box().h);           // box floating against the pipe wall
frames(30);                                          // settle the raft
place(100, 11);                                      // standing on the raft (feet just above it)
const upC = (function () {
  let t = -1;
  for (let i = 0; i < 320; i++) {
    keyDown('ArrowRight');
    if (t < 0) { keyUp('Space'); if (P().grounded) t = 0; }
    else if (t === 0) { keyDown('Space'); t = 1; }
    else if (t < 16) { keyDown('Space'); t++; }
    else { keyUp('Space'); t = -1; }
    frames(1);
    if (P().grounded && P().x > 102 * TILE && P().y < 10 * TILE) { releaseAll(); return true; }
  }
  releaseAll(); return false;
})();
check('raft + climb reaches the pipe ledge (row 9)', upC, at());

// ============================ ROOM D — THE CISTERN ============================
console.log('-- ROOM D: you CANNOT drop straight onto the lever (guard grate lid)');
startCh4();
place(125, 13);                                      // directly above the lever, at the surface
swim([], 120, null, { dive: true });                 // dive straight down
check('a straight drop is stopped by the grate lid (above the lever floor)', P().y + P().h < 19 * TILE,
  `feet=${(P().y + P().h).toFixed(0)} lidTop=${18 * TILE} leverFloor=${21 * TILE}`);

console.log('-- ROOM D: the sunken lever (reached via the floor) latches the exit gate open');
startCh4();
place(125, 20);                                      // in the pocket, beside the lever
tap('KeyX', 2); frames(2);
check('lever gD engaged by X', leverD().on, `on=${leverD().on}`);
frames(150);
check('exit gate latched open', gateD().open, `open=${gateD().open}`);

console.log('-- ROOM D: the exit gate blocks the walk-out until the lever is pulled');
startCh4();
place(143, 12);                                      // on the exit ledge, gate shut
keyDown('ArrowRight');
for (let i = 0; i < 120; i++) frames(1);
releaseAll();
check('cannot pass the shut exit gate', P().x < 145 * TILE && !gateD().open, at() + ` open=${gateD().open}`);

console.log('-- ROOM D: with the gate open, walk through the exit -> advances to Ch.5');
startCh4();
leverD().on = true; frames(120);                     // open the exit gate
place(143, 12);
keyDown('ArrowRight');
for (let i = 0; i < 400 && Game.chapterIdx === 3; i++) frames(1);
releaseAll();
check('exit advanced to Ch.5 (THE HUSKS)', Game.chapterIdx === 4 && LEVELS[4].name === 'THE HUSKS',
  `chapterIdx=${Game.chapterIdx} state=${Game.state} ${at()}`);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
