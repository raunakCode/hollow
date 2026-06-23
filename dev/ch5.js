#!/usr/bin/env node
// ---------------------------------------------------------------
// HOLLOW - dev/ch5.js : Chapter 5 (THE HUSKS) walkthrough harness.
// Loads the REAL chapter list (LEVELS[4] = Ch.5) and proves every beat:
//   HELM GROUPS — connecting at one room's helm drives only that room's husks;
//     husks of other groups (finished/upcoming rooms) stay frozen.
//   ROOM A — drive the lone husk onto its plate to latch the player's gate; the
//     player can't open it alone (the plate is sealed in the pit).
//   ROOM B — gate needs BOTH plates at once. Just walking both husks right
//     piles them on the floor (only the floor plate) -> shut. The desync solve
//     (jump the lead husk onto the step, walk the other onto the floor plate)
//     opens it.
//   ROOM C — three husks, a 3-tile gap. Only the lead husk has runway to clear
//     it on a timed jump and reach the far plate; the others fall into the gap
//     (safe, don't cross). Gate latches; player walks out the exit -> title.
//   Run `node dev/ch5.js`.
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
vm.runInContext('globalThis.__T = { Input, Game, LEVELS, TILE, STAND_H, loadChapter, controlledHusks };', sandbox);
const { Input, Game, LEVELS, TILE, STAND_H, loadChapter } = sandbox.__T;

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

function place(col, feetRow) {
  const p = P();
  p.h = STAND_H;
  p.x = col * TILE; p.y = feetRow * TILE - p.h; p.vx = 0; p.vy = 0;
  p.mantle = null; p.grabbing = false; p.grabbedBox = null;
}
function startCh5() {
  loadChapter(4);
  Game.state = 'play'; Game.fade = 0; Game.fadeV = 0; Game.paused = false; Game.onFaded = null;
  Game.helmed = null;
  releaseAll(); frames(1);
}
// stand the player at a helm (on the walkway, feet on row 12) and press X
function connectAt(col) {
  place(col, 12); frames(2);
  tap('KeyX', 2); frames(2);
  return Game.helmed;
}
const group = g => W().husks.filter(h => h.group === g);
const lead = hs => hs.reduce((a, b) => (a.x > b.x ? a : b));   // rightmost
const trail = hs => hs.reduce((a, b) => (a.x < b.x ? a : b));  // leftmost
const col = e => e.x / TILE;
const row = e => (e.y + e.h) / TILE;   // feet row

const gateA = () => W().doors[0];
const gateB = () => W().doors[1];
const gateC = () => W().doors[2];

// ----------------------------- tests -----------------------------
console.log('-- level sanity (Ch.5 THE HUSKS)');
startCh5();
check('is THE HUSKS', LEVELS[4].name === 'THE HUSKS', LEVELS[4].name);
check('24 rows, all 172 wide', LEVELS[4].rows.length === 24 && LEVELS[4].rows.every(r => r.length === 172));
check('6 husks / 3 helms / 4 plates / 3 doors / 3 checks / 1 exit',
  W().husks.length === 6 && W().helms.length === 3 && W().plates.length === 4 &&
  W().doors.length === 3 && W().checks.length === 3 && W().exits.length === 1,
  `h=${W().husks.length} hm=${W().helms.length} pl=${W().plates.length} d=${W().doors.length}`);
check('husks grouped 1/2/3 across a,b,c',
  group('a').length === 1 && group('b').length === 2 && group('c').length === 3);
check('all three gates start shut', !gateA().open && !gateB().open && !gateC().open);

// ===================== HELM GROUP ISOLATION =====================
console.log('-- helm groups: connecting at room B only drives group-b husks');
startCh5();
const aStart = group('a')[0].x, cStartXs = group('c').map(h => h.x);
connectAt(59);                                       // helm B (group b)
check('connected at helm B', Game.helmed === W().helms[1], `helmed=${!!Game.helmed}`);
keyDown('ArrowRight');
for (let i = 0; i < 90; i++) frames(1);
releaseAll();
check('group-b husks moved', group('b').every(h => h.x > 56 * TILE));
check('group-a husk did NOT move (frozen, other group)', Math.abs(group('a')[0].x - aStart) < 1,
  `a moved ${(group('a')[0].x - aStart).toFixed(1)}px`);
check('group-c husks did NOT move (frozen, other group)',
  group('c').every((h, i) => Math.abs(h.x - cStartXs[i]) < 1));

// ============================ ROOM A ============================
console.log('-- ROOM A: the player alone cannot open gate A (plate is sealed in the pit)');
startCh5();
place(2, 12);
keyDown('ArrowRight');
for (let i = 0; i < 240; i++) frames(1);                // walk the player right at the gate
releaseAll();
check('gate A stays shut without the husk (player blocked, < col 38)', !gateA().open && P().x < 38 * TILE,
  `open=${gateA().open} px=${col(P()).toFixed(1)}`);

console.log('-- ROOM A: connect, drive the husk onto plate pA -> gate A latches open');
startCh5();
connectAt(19);                                          // helm A
keyDown('ArrowRight');
for (let i = 0; i < 240 && !gateA().open; i++) frames(1);
releaseAll();
const huskA = group('a')[0];
check('husk reached its plate and latched gate A open', gateA().open && col(huskA) > 22,
  `open=${gateA().open} huskCol=${col(huskA).toFixed(1)}`);

console.log('-- ROOM A: disconnect, walk the player through the open gate to checkpoint 0');
tap('KeyX', 2); frames(2);                              // disconnect
check('disconnected (control back to player)', !Game.helmed);
place(33, 12);                                          // on the walkway before the gate
keyDown('ArrowRight');
for (let i = 0; i < 260 && Game.checkpointIdx < 0; i++) frames(1);
releaseAll();
check('player walked through gate A to checkpoint 0', Game.checkpointIdx === 0 && col(P()) > 38,
  `ckpt=${Game.checkpointIdx} px=${col(P()).toFixed(1)}`);

// ============================ ROOM B ============================
console.log('-- ROOM B: naively walking both husks right (no jump) leaves gate B SHUT');
startCh5();
connectAt(59);                                          // helm B
keyDown('ArrowRight');
for (let i = 0; i < 360; i++) { keyUp('Space'); frames(1); }   // never jump
releaseAll();
const onStepB = group('b').some(h => row(h) < 19);     // anyone up on the step?
check('no jump -> both husks stuck on the floor, gate B shut', !gateB().open && !onStepB,
  `open=${gateB().open} onStep=${onStepB} rows=${group('b').map(h => row(h).toFixed(1))}`);

console.log('-- ROOM B: desync solve — jump the lead husk onto the step, walk both onto the plates');
startCh5();
connectAt(59);
{
  const hb = group('b');
  // phase 1: walk right until the lead husk jams against the step face (col 68)
  let f = 0;
  for (; f < 240; f++) { keyDown('ArrowRight'); keyUp('Space'); frames(1);
    if (lead(hb).lastHitX === 'tile' && lead(hb).grounded && col(lead(hb)) > 66) break; }
  // phase 2: jump it up onto the step (a short hold; the 2-tile step mantles)
  for (let k = 0; k < 14; k++) { keyDown('ArrowRight'); keyDown('Space'); frames(1);
    if (row(lead(hb)) < 19) break; }
  keyUp('Space');
  // phase 3: keep walking — lead -> step plate, trail -> floor plate (no more jumps)
  for (let k = 0; k < 360 && !gateB().open; k++) { keyDown('ArrowRight'); keyUp('Space'); frames(1); }
  releaseAll();
}
const hbUp = group('b').filter(h => row(h) < 19);      // on the step (row 18)
const hbDown = group('b').filter(h => row(h) >= 19);   // on the floor (row 20)
check('one husk ended up on the step, one on the floor', hbUp.length === 1 && hbDown.length === 1,
  `rows=${group('b').map(h => row(h).toFixed(1))}`);
check('both plates pressed at once -> gate B latched open', gateB().open, `open=${gateB().open}`);

// ============================ ROOM C ============================
console.log('-- ROOM C: the player alone cannot open gate C (far plate sealed in the pit)');
startCh5();
place(99, 12);
keyDown('ArrowRight');
for (let i = 0; i < 240; i++) frames(1);
releaseAll();
check('gate C stays shut without a husk crossing (player blocked < col 158)',
  !gateC().open && P().x < 158 * TILE, `open=${gateC().open} px=${col(P()).toFixed(1)}`);

console.log('-- ROOM C: timed runway jump — only the lead husk clears the gap to plate pC');
startCh5();
connectAt(110);                                         // helm C
{
  const hc = group('c');
  let jumpedAt = -1;
  for (let i = 0; i < 700 && !gateC().open; i++) {
    keyDown('ArrowRight');
    const L = lead(hc);
    if (jumpedAt < 0 && col(L) > 120 && L.grounded) jumpedAt = i;   // fire at the lip
    if (jumpedAt >= 0 && i - jumpedAt < 14) keyDown('Space'); else keyUp('Space');
    frames(1);
  }
  releaseAll();
}
const hc = group('c');
const crossed = hc.filter(h => col(h) > 125);          // made it to the far ledge
check('exactly one husk crossed the gap to the far ledge', crossed.length === 1,
  `cols=${hc.map(h => col(h).toFixed(1))}`);
check('the lead husk reached plate pC and latched gate C open', gateC().open && col(crossed[0]) > 145,
  `open=${gateC().open} leadCol=${crossed.length ? col(crossed[0]).toFixed(1) : 'n/a'}`);
check('the other two husks did NOT cross (fell into the gap, safe)',
  hc.filter(h => col(h) <= 125).length === 2, `cols=${hc.map(h => col(h).toFixed(1))}`);

console.log('-- ROOM C: disconnect, walk the player out the exit -> advances to Ch.6 THE MACHINES');
tap('KeyX', 2); frames(2);                              // disconnect
place(154, 12);                                         // on the walkway before gate C
keyDown('ArrowRight');
for (let i = 0; i < 360 && Game.chapterIdx === 4; i++) frames(1);
releaseAll();
// Ch.5 is no longer the last chapter — its exit now loads Ch.6 (chapterIdx 5),
// not the title (same edit ch1-ch4 each got when the next chapter landed).
check('exit advanced to Ch.6 (chapterIdx 5, still in play)', Game.chapterIdx === 5 && Game.state === 'play',
  `chapter=${Game.chapterIdx} state=${Game.state} px=${col(P()).toFixed(1)}`);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
