#!/usr/bin/env node
// ---------------------------------------------------------------
// HOLLOW - dev/browser-test.js : real-browser smoke test.
// Drives index.html in headless Chromium via playwright-core with
// trusted keyboard input (so AudioContext actually starts), takes
// screenshots to /tmp, reports state + fps + console errors.
//
// Setup (once, outside the repo so the game stays dependency-free):
//   mkdir -p /tmp/hollow-pw && cd /tmp/hollow-pw && npm i playwright-core
// Run:
//   node dev/browser-test.js
//
// Notes from session 2 bring-up:
// - Brave/Chrome `--headless --screenshot --virtual-time-budget` does
//   NOT drive requestAnimationFrame (one frame only) — don't use it.
// - Headless Chromium runs rAF uncapped (~120fps); dt clamping in
//   game.js handles it. Real-display vsync must be eyeballed.
// ---------------------------------------------------------------
'use strict';

const path = require('path');
const { chromium } = require(
  process.env.PLAYWRIGHT_CORE || '/tmp/hollow-pw/node_modules/playwright-core');

const EXE = process.env.HOLLOW_CHROMIUM ||
  '/Users/redkar/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const URL = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(URL);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/hollow_title.png' });

  // start game
  await page.keyboard.press('Space');
  await page.waitForTimeout(2200);
  const stateAfterStart = await page.evaluate(() => Game.state);

  // run right, then repeated full jumps (crosses grass, mantles the
  // 3-tile wall, jumps/escapes the gap — same sheet dev/headless.js
  // walks deterministically)
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1300);
  await page.screenshot({ path: '/tmp/hollow_run.png' });
  for (let i = 0; i < 6; i++) {
    await page.keyboard.down('Space');
    await page.waitForTimeout(300);
    await page.keyboard.up('Space');
    await page.waitForTimeout(550);
  }
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/hollow_end.png' });

  const snap = await page.evaluate(() => ({
    state: Game.state,
    x: Game.player.x, y: Game.player.y,
    grounded: Game.player.grounded,
    camX: Game.cam.x,
    audio: AudioSys.ctx ? AudioSys.ctx.state : 'none',
  }));
  const fps = await page.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    (function f() { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); })();
  }));

  console.log(JSON.stringify({ stateAfterStart, snap, fps, errors }, null, 2));
  await browser.close();
  const ok = stateAfterStart === 'play' && errors.length === 0 && snap.x > 500 && fps > 50;
  console.log(ok ? 'BROWSER SMOKE PASS' : 'BROWSER SMOKE FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
