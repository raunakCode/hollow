#!/usr/bin/env node
// ---------------------------------------------------------------
// HOLLOW - dev/t5.js : focused checks for the T5 "engine extras".
// Loads the real scripts with stubbed DOM/canvas/audio (same harness
// as headless.js) and exercises the new systems in isolation:
//   - light.offWhen signal-disable
//   - scripted chase trigger zone
//   - breath timer (drain underwater, refill at the surface, drown)
//   - Esc pause freezes play; resume/restart/mute act
//   - title menu: continue vs new game
// Run with `node dev/t5.js`. Not part of the game.
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
for (const f of ['util', 'audio', 'player', 'entities', 'render', 'levels1', 'levels2']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), sandbox, { filename: f });
}
vm.runInContext(fs.readFileSync(path.join(__dirname, 'testmap.js'), 'utf8'), sandbox, { filename: 'testmap.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8'), sandbox, { filename: 'game.js' });
vm.runInContext('globalThis.__T = { Input, Game, LEVELS, AudioSys, TILE, spawnEntities, updateLights, updateTriggers, makeHumanoid, waterSurfaceY };', sandbox);
const { Input, Game, LEVELS, TILE, AudioSys, spawnEntities, updateLights, updateTriggers, makeHumanoid, waterSurfaceY } = sandbox.__T;

// ----------------------------- driving -----------------------------
let now = 0;
function frames(n) { for (let i = 0; i < n; i++) { now += 1000 / 60; const cb = rafCb; rafCb = null; cb(now); } }
function keyDown(code) { for (const fn of listeners.keydown || []) fn({ code, preventDefault() {} }); }
function keyUp(code) { for (const fn of listeners.keyup || []) fn({ code }); }
function tap(code, hold = 2) { keyDown(code); frames(hold); keyUp(code); }
function releaseAll() { for (const k of Object.keys(Input.keys)) keyUp(k); }

let failures = 0;
function check(label, cond, detail) {
  console.log((cond ? '  ok ' : 'FAIL ') + label + (cond ? '' : '   [' + detail + ']'));
  if (!cond) failures++;
}
const P = () => Game.player;

// boot to play (fresh, no save) ------------------------------------
frames(90);
tap('Space');
frames(150);
check('reached play', Game.state === 'play', Game.state);

// 1. light.offWhen --------------------------------------------------
console.log('-- light.offWhen signal-disable');
{
  const L = { rows: ['.....', '.....', '.....', '.....', '.....'] };
  const w = spawnEntities([
    { t: 'lever', x: 0, y: 0, id: 's', on: true },
    { t: 'light', x: 2, y: 1, a0: 1.57, a1: 1.57, len: 6, fov: 1.0, offWhen: 's' },
  ], 1);
  const ply = { x: 2 * TILE - 4, y: 2 * TILE, w: 18, h: 42 };   // sitting right under the cone
  let r = updateLights(w, L, ply, false, 0.05);
  check('disabled while signal on (no detection)', w.lights[0].disabled === true && r.danger === 0, `disabled=${w.lights[0].disabled} danger=${r.danger}`);
  w.levers[0].on = false;                                       // cut the signal -> light powers up
  r = updateLights(w, L, ply, false, 0.05);
  check('re-enabled when signal off (detects)', w.lights[0].disabled === false && r.danger > 0, `disabled=${w.lights[0].disabled} danger=${r.danger.toFixed(2)}`);
  // offWhen also accepts a list (disabled if ANY listed signal is on)
  const w2 = spawnEntities([
    { t: 'lever', x: 0, y: 0, id: 'a', on: false },
    { t: 'lever', x: 1, y: 0, id: 'b', on: true },
    { t: 'light', x: 2, y: 1, a0: 1.57, a1: 1.57, len: 6, fov: 1.0, offWhen: ['a', 'b'] },
  ], 1);
  updateLights(w2, L, ply, false, 0.05);
  check('offWhen list: disabled if any signal on', w2.lights[0].disabled === true);
}

// 2. scripted chase trigger ----------------------------------------
console.log('-- scripted chase trigger zone');
{
  const w = spawnEntities([
    { t: 'creature', x: 100, y: 100, range: 20 },
    { t: 'trigger', x: 0, y: 0, w: 3, h: 3, target: 0, action: 'charge' },
  ], 1);
  updateTriggers(w, { x: 200, y: 200, w: 18, h: 42 });          // player outside the zone
  check('dormant until entered', w.creatures[0].state === 'dormant' && w.triggers[0].fired === false);
  updateTriggers(w, { x: 10, y: 10, w: 18, h: 42 });            // player inside the zone
  check('entering forces a charge', w.creatures[0].state === 'charge' && w.triggers[0].fired === true, w.creatures[0].state);
  const before = w.creatures[0].state;
  updateTriggers(w, { x: 10, y: 10, w: 18, h: 42 });            // one-shot: does not re-fire
  check('one-shot (no re-fire)', w.creatures[0].state === before);
}

// 3. breath timer ---------------------------------------------------
console.log('-- breath: drain underwater, refill, drown');
{
  const lvl = Game.level;
  const surf = waterSurfaceY(lvl, 36 * TILE + 16);              // pool is cols 33-40 in TEST GROUNDS
  check('test map has a pool', surf !== null, String(surf));
  releaseAll();
  P().x = 36 * TILE; P().y = surf + 24; P().vx = 0; P().vy = 0; // sink the head under
  const full = Game.breath;
  frames(60);                                                  // ~1s submerged
  check('breath drains underwater', Game.breath < full - 0.6, `breath=${Game.breath.toFixed(2)}`);
  P().x = 22 * TILE; P().y = (19) * TILE - 42;                  // back onto dry ground (cols ~21)
  frames(120);
  check('breath refills at the surface', Game.breath > full - 0.05, `breath=${Game.breath.toFixed(2)}`);
  // hold underwater until it runs out -> drown -> respawn
  P().x = 36 * TILE; P().y = surf + 24;
  let drowned = false;
  for (let i = 0; i < 900 && !drowned; i++) {
    if (P().y < surf + 10) P().y = surf + 24;                   // keep the head submerged
    frames(1);
    if (Game.state === 'dead') drowned = true;
  }
  check('runs out of air -> drown death', drowned, `state=${Game.state} breath=${Game.breath.toFixed(2)}`);
  frames(200);                                                  // fade through respawn
  check('respawns after drowning', Game.state === 'play' && Game.breath > 8, `state=${Game.state} breath=${Game.breath.toFixed(2)}`);
}

// 4. Esc pause ------------------------------------------------------
console.log('-- Esc pause freezes play; resume/restart/mute');
{
  releaseAll();
  frames(5);
  const m0 = AudioSys.muted;
  tap('KeyM');                                                 // global mute key (DESIGN: M)
  check('M toggles mute in play', AudioSys.muted === !m0, 'muted=' + AudioSys.muted);
  tap('KeyM');                                                 // back

  tap('Escape');
  check('Esc opens the pause menu', Game.paused === true);
  const x0 = P().x;
  keyDown('ArrowRight'); frames(30); keyUp('ArrowRight');       // input ignored while paused
  check('play is frozen while paused', Math.abs(P().x - x0) < 0.001, `dx=${(P().x - x0).toFixed(2)}`);
  tap('ArrowDown'); tap('ArrowDown');                           // select 'mute'
  check('pause cursor moves', Game.pauseSel === 2, 'sel=' + Game.pauseSel);
  const wasMuted = AudioSys.muted;
  tap('Space');                                                // confirm mute
  check('mute toggles', AudioSys.muted === !wasMuted, 'muted=' + AudioSys.muted);
  tap('Escape');
  check('Esc closes the pause menu', Game.paused === false);
}

// 5. title menu: continue vs new game ------------------------------
console.log('-- title menu: continue / new game');
{
  // drop to title cleanly, then set a save and reload the title
  Game.state = 'title'; Game.fade = 0; Game.fadeV = 0;
  storageData.hollow_save = JSON.stringify({ chapter: 0, checkpointIdx: 1 });
  Game.titleSel = 0;
  frames(2);
  tap('ArrowDown');                                            // move to 'new game'
  check('title cursor moves with a save present', Game.titleSel === 1, 'sel=' + Game.titleSel);
  tap('ArrowUp');
  check('back to continue', Game.titleSel === 0, 'sel=' + Game.titleSel);
  tap('Space');                                               // confirm continue
  frames(180);
  check('continue resumes at the saved checkpoint', Game.state === 'play' && Game.checkpointIdx === 1, `state=${Game.state} idx=${Game.checkpointIdx}`);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
