#!/usr/bin/env node
// ---------------------------------------------------------------
// HOLLOW - dev/ch6.js : Chapter 6 (THE MACHINES) walkthrough harness.
// Loads the REAL chapter list (LEVELS[5] = Ch.6) and proves every beat of the
// husks x lights x lifts x timed-plates synthesis:
//   HELM GROUPS — connecting at one room's helm drives only that room's husk.
//   ROOM A — THE BEAM CORRIDOR. Drive the lone husk through a player-lethal
//     searchlight (husks are immune) onto plate pA, which latches the player's
//     walkway gate d_a1. The beam does NOT leak up to the player on the walkway;
//     a player standing IN the lane would die (asymmetry).
//   ROOM B — THE RELAY. A timed plate (pB1 hold:4) opens a gate in the husk's
//     own lane (d_b1) + the player's walkway gate (d_bw1). Park the husk on pB1,
//     drop the player 4 tiles to tier 2 (the col-82 face is un-mantleable, so
//     B2 is forced), then at helm B2 re-drive the SAME husk off pB1, through the
//     still-open d_b1 (hold window), to pB2 which latches the exit gate d_b2.
//   ROOM C — THE COUNTERWEIGHT. Drive the husk onto lift platform A -> A sinks,
//     B rises to row 18 and HOLDS. The plateau (row 16) is unreachable from the
//     ground (4 tiles >102px) but reachable from raised B (2 tiles). A ground
//     searchlight (player-lethal, husk-immune) guards the approach with a real
//     off-window. Exit -> title (Ch.6 is the last built chapter).
//   Run `node dev/ch6.js`.
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
function startCh6() {
  loadChapter(5);
  Game.state = 'play'; Game.fade = 0; Game.fadeV = 0; Game.paused = false; Game.onFaded = null;
  Game.helmed = null;
  releaseAll(); frames(1);
}
// stand the player at a helm (feet on `feetRow`) and press X to connect
function connectAt(col, feetRow) {
  place(col, feetRow); frames(2);
  tap('KeyX', 2); frames(2);
  return Game.helmed;
}
const group = g => W().husks.filter(h => h.group === g);
const only = g => group(g)[0];
const col = e => e.x / TILE;
const row = e => (e.y + e.h) / TILE;   // feet row

const doorA = () => W().doors[0];   // d_a1  (Room A walkway gate, latch)
const dB1 = () => W().doors[1];      // d_b1  (Room B lane gate, NOT latch)
const dBW1 = () => W().doors[2];     // d_bw1 (Room B walkway gate, NOT latch)
const dB2 = () => W().doors[3];      // d_b2  (Room B exit gate, latch)
const lift = () => W().lifts[0];

// direct light sampler (mirrors updateLights' detection ray) for a point in
// world px — used to prove a beam is lethal / safe at a spot without driving a
// real body there.
function sees(Li, px, py) {
  const dx = px - Li.x, dy = py - Li.y, d = Math.sqrt(dx * dx + dy * dy);
  if (d >= Li.len || d <= 8) return false;
  let da = Math.atan2(dy, dx) - Li.ang;
  while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
  if (Math.abs(da) >= Li.fov / 2) return false;
  const steps = Math.ceil(d / 14);
  for (let i = 1; i < steps; i++) {
    const sx = Li.x + dx * (i / steps), sy = Li.y + dy * (i / steps);
    if (sandbox.isSolidTile(sandbox.tileAt(Game.level, Math.floor(sx / TILE), Math.floor(sy / TILE)))) return false;
  }
  return true;
}

// ----------------------------- tests -----------------------------
console.log('-- level sanity (Ch.6 THE MACHINES)');
startCh6();
check('is THE MACHINES', LEVELS[5].name === 'THE MACHINES', LEVELS[5].name);
check('24 rows, all 210 wide', LEVELS[5].rows.length === 24 && LEVELS[5].rows.every(r => r.length === 210));
check('3 husks / 4 helms / 3 plates / 4 doors / 1 lift / 2 lights / 1 exit / 3 checks',
  W().husks.length === 3 && W().helms.length === 4 && W().plates.length === 3 &&
  W().doors.length === 4 && W().lifts.length === 1 && W().lights.length === 2 &&
  W().exits.length === 1 && W().checks.length === 3,
  `h=${W().husks.length} hm=${W().helms.length} pl=${W().plates.length} d=${W().doors.length} lf=${W().lifts.length} li=${W().lights.length} ck=${W().checks.length}`);
check('husks grouped 1/1/1 across a,b,c',
  group('a').length === 1 && group('b').length === 1 && group('c').length === 1);
check('all four gates start shut', !doorA().open && !dB1().open && !dBW1().open && !dB2().open);

// ===================== HELM GROUP ISOLATION =====================
console.log('-- helm groups: connecting at helm B1 only drives the group-b husk');
startCh6();
const aStart = only('a').x, cStart = only('c').x;
connectAt(64, 12);                                   // helm B1 (group b)
check('connected at helm B1', Game.helmed === W().helms[1], `helmed=${!!Game.helmed}`);
keyDown('ArrowRight');
for (let i = 0; i < 90; i++) frames(1);
releaseAll();
check('group-b husk moved', only('b').x > 62 * TILE, `b@${col(only('b')).toFixed(1)}`);
check('group-a husk did NOT move (frozen, other group)', Math.abs(only('a').x - aStart) < 1,
  `a moved ${(only('a').x - aStart).toFixed(1)}px`);
check('group-c husk did NOT move (frozen, other group)', Math.abs(only('c').x - cStart) < 1,
  `c moved ${(only('c').x - cStart).toFixed(1)}px`);

// ============================ ROOM A ============================
console.log('-- ROOM A: the player alone cannot open gate A (plate sealed in the lane)');
startCh6();
place(14, 12);
keyDown('ArrowRight');
for (let i = 0; i < 240; i++) frames(1);                 // walk the player right at the gate
releaseAll();
check('gate A stays shut without the husk (player blocked < col 50)', !doorA().open && P().x < 50 * TILE,
  `open=${doorA().open} px=${col(P()).toFixed(1)}`);

console.log('-- ROOM A: drive the husk through the lethal beam onto pA -> gate A latches; husk never dies');
startCh6();
connectAt(18, 12);                                       // helm A
let aDied = false;
keyDown('ArrowRight');
for (let i = 0; i < 300 && !doorA().open; i++) { frames(1); if (Game.state !== 'play') aDied = true; }
releaseAll();
check('husk reached pA and latched gate A open', doorA().open && col(only('a')) > 38,
  `open=${doorA().open} huskCol=${col(only('a')).toFixed(1)}`);
check('the husk was NEVER killed walking the lit lane (game stayed in play)', !aDied && Game.state === 'play',
  `state=${Game.state}`);

console.log('-- ROOM A: the beam does NOT leak up to the player on the walkway, but IS lethal in the lane');
startCh6();
const laneLight = W().lights[0];
let walkwaySeen = 0, laneSeen = 0;
laneLight.t = 0;
for (let i = 0; i < 480; i++) {
  frames(1);
  for (const c of [25, 30, 35, 40]) if (sees(laneLight, c * TILE + 9, 11.3 * TILE)) walkwaySeen++;   // walkway points
  for (const c of [36, 40]) if (sees(laneLight, c * TILE + 9, 19.4 * TILE)) laneSeen++;               // lane points (near pA)
}
check('player on the walkway is NEVER detected (no leak through the - windows)', walkwaySeen === 0,
  `walkwaySeen=${walkwaySeen}`);
check('a player standing IN the lane WOULD be detected (beam is real/lethal there)', laneSeen > 60,
  `laneSeen=${laneSeen}`);

console.log('-- ROOM A: disconnect, walk the player through the open gate to checkpoint 0');
startCh6();
connectAt(18, 12);
keyDown('ArrowRight');
for (let i = 0; i < 300 && !doorA().open; i++) frames(1);
releaseAll();
tap('KeyX', 2); frames(2);                               // disconnect
check('disconnected (control back to player)', !Game.helmed);
place(46, 12);                                           // on the divider block, before gate A (col 50)
keyDown('ArrowRight');
for (let i = 0; i < 240 && Game.checkpointIdx < 0; i++) frames(1);
releaseAll();
check('player walked through gate A to checkpoint 0', Game.checkpointIdx === 0 && col(P()) > 50,
  `ckpt=${Game.checkpointIdx} px=${col(P()).toFixed(1)}`);

// ============================ ROOM B ============================
// Helper: drive the group-b husk right and park it on pB1 (release as it
// arrives so it settles ON the plate rather than rolling off).
function parkHuskOnPB1() {
  connectAt(64, 12);                                     // helm B1
  let f = 0;
  for (; f < 240; f++) { keyDown('ArrowRight'); frames(1); if (col(only('b')) >= 72) break; }
  keyUp('ArrowRight');
  for (let k = 0; k < 50; k++) frames(1);                // settle on the plate
}

console.log('-- ROOM B stage 1: park the husk on pB1 -> d_bw1 (walkway) + d_b1 (lane) both open');
startCh6();
parkHuskOnPB1();
check('husk settled on pB1 (col 71.4-74)', col(only('b')) > 71.3 && col(only('b')) < 74.1,
  `huskCol=${col(only('b')).toFixed(2)}`);
check('pB1 pressed -> d_bw1 AND d_b1 both open (neither latched)', dBW1().open && dB1().open,
  `bw1=${dBW1().open} b1=${dB1().open}`);

console.log('-- ROOM B stage 1: disconnect — the parked husk holds both gates open');
tap('KeyX', 2); frames(2);
check('disconnected', !Game.helmed);
for (let i = 0; i < 120; i++) frames(1);                 // hold:4 plus the husk parked = stays open
check('parked husk keeps d_bw1 + d_b1 open after disconnect', dBW1().open && dB1().open,
  `bw1=${dBW1().open} b1=${dB1().open}`);

console.log('-- ROOM B stage 1: the player walks through d_bw1 and DROPS 4 tiles to tier 2');
place(75, 12);                                           // on tier-1 walkway, before the col-82 drop
keyDown('ArrowRight');
let droppedRow = 12;
for (let i = 0; i < 180; i++) { frames(1); droppedRow = Math.max(droppedRow, row(P())); if (col(P()) > 86) break; }
releaseAll();
for (let i = 0; i < 30; i++) frames(1);                  // settle on tier 2
check('player dropped past tier 1 to the tier-2 floor (feet row ~16)', row(P()) > 15.5 && row(P()) < 16.5 && col(P()) > 82,
  `feetRow=${row(P()).toFixed(2)} col=${col(P()).toFixed(1)}`);

console.log('-- ROOM B stage 1: the 4-tile col-82 face is un-mantleable -> cannot climb back to tier 1');
let minGroundedRow = 99;
place(85, 16);                                           // on tier 2, against the drop face
for (let i = 0; i < 240; i++) {
  keyDown('ArrowLeft'); keyDown('Space'); frames(1);
  if (P().grounded) minGroundedRow = Math.min(minGroundedRow, row(P()));
}
releaseAll();
check('player can never get grounded back on tier 1 (stays at/below row 16)', minGroundedRow > 15,
  `bestGroundedRow=${minGroundedRow.toFixed(2)}`);

console.log('-- ROOM B stage 2: at helm B2 re-drive the SAME husk off pB1 -> pB2 latches exit gate d_b2');
// continue from the parked-husk state: connect at B2 (tier 2) and drive right
connectAt(88, 16);                                       // helm B2 (same group b)
check('connected at helm B2 (group b again)', Game.helmed === W().helms[2], `helmed=${!!Game.helmed}`);
keyDown('ArrowRight');
let clearedB1 = false;
for (let i = 0; i < 600 && !dB2().open; i++) { frames(1); if (col(only('b')) > 82) clearedB1 = true; }
releaseAll();
check('husk cleared d_b1 (col 80) within the hold window', clearedB1, `huskCol=${col(only('b')).toFixed(1)}`);
check('husk reached pB2 -> exit gate d_b2 latched open', dB2().open && col(only('b')) > 109,
  `open=${dB2().open} huskCol=${col(only('b')).toFixed(1)}`);

console.log('-- ROOM B stage 2: disconnect, walk tier 2 through d_b2 to checkpoint 1');
tap('KeyX', 2); frames(2);
place(116, 16);                                          // on tier 2, before the exit gate (col 120)
keyDown('ArrowRight');
for (let i = 0; i < 200 && Game.checkpointIdx < 1; i++) frames(1);
releaseAll();
check('player walked through d_b2 to checkpoint 1', Game.checkpointIdx === 1 && col(P()) > 120,
  `ckpt=${Game.checkpointIdx} px=${col(P()).toFixed(1)}`);

console.log('-- ROOM B: hold-necessity — with pB1 hold:0, d_b1 slams shut and traps the husk before pB2');
startCh6();
W().plates.find(p => p.id === 'pB1').hold = 0;            // kill the hold window
parkHuskOnPB1();
tap('KeyX', 2); frames(2);                               // disconnect (husk parked on pB1)
connectAt(88, 16);                                       // helm B2
keyDown('ArrowRight');
for (let i = 0; i < 600 && !dB2().open; i++) frames(1);
releaseAll();
check('hold:0 -> husk cannot pass d_b1, d_b2 never latches (hold>0 is necessary)',
  !dB2().open && col(only('b')) < 81, `open=${dB2().open} huskCol=${col(only('b')).toFixed(1)}`);

// ============================ ROOM C ============================
console.log('-- ROOM C: husk driven onto lift platform A -> platform B rises and HOLDS after disconnect');
startCh6();
connectAt(136, 20);                                      // helm C (on the ground)
keyDown('ArrowRight');
for (let i = 0; i < 200; i++) frames(1);                 // husk onto A
releaseAll();
check('husk parked on platform A (col ~148-149)', col(only('c')) > 147 && col(only('c')) < 150,
  `huskCol=${col(only('c')).toFixed(1)}`);
check('platform B rose ~2 tiles (lift off near -travel)', lift().off < -56,
  `off=${lift().off.toFixed(1)} travel=${lift().travel}`);
tap('KeyX', 2); frames(2);                               // disconnect
for (let i = 0; i < 120; i++) frames(1);
check('B HOLDS up after disconnect (parked husk counterweights it)', lift().off < -56,
  `off=${lift().off.toFixed(1)}`);

console.log('-- ROOM C: the row-16 plateau is UNREACHABLE from the ground (4 tiles > 102px mantle cap)');
startCh6();
place(151, 20);                                          // on the divider, approaching the plateau
let bestRowGround = 99;
for (let i = 0; i < 300; i++) {
  keyDown('ArrowRight'); keyDown('Space'); frames(1);
  if (P().grounded) bestRowGround = Math.min(bestRowGround, row(P()));
}
releaseAll();
// without B raised, the plateau (row 16) is a 4-tile mantle from any ground footing
// (divider row 20 / rest-B sunk into pit B) -> can never get grounded up at row 16
check('from the ground the player cannot mount the plateau (never grounded above row 17)', bestRowGround > 17,
  `bestGroundedRow=${bestRowGround.toFixed(2)} col=${col(P()).toFixed(1)}`);

console.log('-- ROOM C: with B raised, the plateau IS reachable (2 tiles) -> mantle + exit -> title');
startCh6();
connectAt(136, 20);
keyDown('ArrowRight');
for (let i = 0; i < 200; i++) frames(1);                 // raise B
releaseAll();
tap('KeyX', 2); frames(2);                               // disconnect; B holds
place(154, 18);                                          // stand the player on raised B (past the beam)
for (let i = 0; i < 20; i++) frames(1);
keyDown('ArrowRight');
for (let i = 0; i < 240 && Game.state === 'play'; i++) {
  // hop up onto the plateau then walk into the exit
  if (P().grounded && row(P()) > 16.5) keyDown('Space'); else keyUp('Space');
  frames(1);
}
releaseAll();
check('player mantled raised B onto the plateau and reached the exit -> title', Game.state === 'title',
  `state=${Game.state} col=${col(P()).toFixed(1)} feetRow=${row(P()).toFixed(1)}`);

console.log('-- ROOM C: the ground beam has a real off-window (dashable) and spares raised B / the plateau');
startCh6();
const beam = W().lights[1];
function offWindow(px, py, dur = 600) {
  let maxRun = 0, run = 0, anySeen = 0;
  beam.t = 0;
  for (let i = 0; i < dur; i++) { frames(1); if (sees(beam, px, py)) { anySeen++; run = 0; } else { run++; if (run > maxRun) maxRun = run; } }
  return { maxRun, anySeen };
}
const mid = offWindow(146 * TILE + 9, 19.4 * TILE);
check('beam IS lethal on the ground crossing (some lit frames)', mid.anySeen > 30, `lit=${mid.anySeen}`);
check('beam has a >=1.5s off-window on the crossing (a dash is possible)', mid.maxRun >= 90,
  `offWindow=${mid.maxRun}f (${(mid.maxRun / 60).toFixed(2)}s)`);
const onB = offWindow(154 * TILE + 9, 17.4 * TILE);
const onPlateau = offWindow(160 * TILE + 9, 15.4 * TILE);
check('player on raised B is NEVER in the beam', onB.anySeen === 0, `lit=${onB.anySeen}`);
check('player on the plateau is NEVER in the beam', onPlateau.anySeen === 0, `lit=${onPlateau.anySeen}`);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
