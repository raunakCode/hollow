// ---------------------------------------------------------------
// HOLLOW - util.js : math helpers, seeded RNG, input handling
// ---------------------------------------------------------------
'use strict';

const TILE = 32;
const VIEW_W = 960, VIEW_H = 540;

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
// Frame-rate independent exponential approach
function damp(cur, target, rate, dt) { return lerp(cur, target, 1 - Math.exp(-rate * dt)); }
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function dist(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }

// Small deterministic RNG (mulberry32) for procedural backgrounds
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----------------------------- Input ---------------------------
const Input = {
  keys: {},          // currently held
  pressed: {},       // pressed this frame
  anyKeyThisFrame: false,

  left()  { return !!(this.keys['ArrowLeft'] || this.keys['KeyA']); },
  right() { return !!(this.keys['ArrowRight'] || this.keys['KeyD']); },
  up()    { return !!(this.keys['ArrowUp'] || this.keys['KeyW']); },
  down()  { return !!(this.keys['ArrowDown'] || this.keys['KeyS']); },
  jumpHeld()    { return !!(this.keys['Space'] || this.keys['KeyZ'] || this.keys['ArrowUp'] || this.keys['KeyW']); },
  jumpPressed() { return !!(this.pressed['Space'] || this.pressed['KeyZ'] || this.pressed['ArrowUp'] || this.pressed['KeyW']); },
  grabHeld()    { return !!(this.keys['KeyX'] || this.keys['KeyE']); },
  actPressed()  { return !!(this.pressed['KeyX'] || this.pressed['KeyE']); },

  // Menu navigation (title + pause). Arrows/WS move the cursor only; a
  // separate confirm set selects — kept disjoint so ArrowUp never both
  // moves and confirms (ArrowUp is also a jump key in play).
  menuUp()      { return !!(this.pressed['ArrowUp'] || this.pressed['KeyW']); },
  menuDown()    { return !!(this.pressed['ArrowDown'] || this.pressed['KeyS']); },
  menuConfirm() { return !!(this.pressed['Space'] || this.pressed['Enter'] || this.pressed['KeyZ'] || this.pressed['KeyX'] || this.pressed['KeyE']); },
  escPressed()  { return !!this.pressed['Escape']; },

  endFrame() { this.pressed = {}; this.anyKeyThisFrame = false; },
};

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
  if (!Input.keys[e.code]) Input.pressed[e.code] = true;
  Input.keys[e.code] = true;
  Input.anyKeyThisFrame = true;
});
window.addEventListener('keyup', (e) => { Input.keys[e.code] = false; });
window.addEventListener('blur', () => { Input.keys = {}; });

// Scale canvas to fit window, preserving 16:9
function fitCanvas(canvas) {
  const resize = () => {
    const s = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    canvas.style.width = Math.floor(VIEW_W * s) + 'px';
    canvas.style.height = Math.floor(VIEW_H * s) + 'px';
  };
  window.addEventListener('resize', resize);
  resize();
}
