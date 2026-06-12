// ---------------------------------------------------------------
// HOLLOW - audio.js : procedural ambient + event sounds (WebAudio)
// ---------------------------------------------------------------
'use strict';

// Recorded-sample manifest. These are real audio files loaded at runtime
// (NOTE: this is why the game now needs to be served over http — fetch +
// decodeAudioData are blocked on file://; see CLAUDE.md / README). Any file
// that is missing or fails to load falls back to the procedural synth, so the
// game still runs with no assets present.
// Filenames must match what's in assets/audio/. Format is decided by the file
// contents, not the extension — mp3/ogg/wav all decode. (mp3 is fine for the
// one-shot; for the seamless loop, encoder padding can click — ogg/wav if so.)
const AUDIO_SAMPLES = {
  splash:    'assets/audio/water_splash.mp3', // one-shot: body entering water
  waterLoop: 'assets/audio/water_loop.mp3',   // seamless loop: ambient water bed
};

const AudioSys = {
  ctx: null,
  master: null,
  muted: false,
  ambient: null,     // { drone1, drone2, windGain, rainGain, droneGain, lfo }
  heartbeat: { timer: 0, level: 0 },
  samples: {},       // name -> decoded AudioBuffer (absent until loaded)
  _waterBed: null,   // { src, gain } lazily built once waterLoop decodes

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    this._buildAmbient();
    this._loadSamples();
  },

  // Fetch + decode every sample in the manifest. Fire-and-forget: each lands
  // in this.samples[name] when ready; failures are logged once and ignored
  // (the caller falls back to synth). Requires an http origin (file:// blocks
  // fetch); served over a local server this just works.
  _loadSamples() {
    if (typeof fetch === 'undefined') return;   // headless/no-network: synth only
    for (const name in AUDIO_SAMPLES) {
      const url = AUDIO_SAMPLES[name];
      fetch(url)
        .then(r => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.arrayBuffer(); })
        .then(buf => this.ctx.decodeAudioData(buf))
        .then(audioBuf => {
          this.samples[name] = audioBuf;
          if (name === 'waterLoop') this._ensureWaterBed();
        })
        .catch(err => console.warn('[audio] sample "' + name + '" unavailable, using synth fallback:', err.message));
    }
  },

  // Play a decoded sample once. Returns false if it isn't loaded so callers
  // can fall back. rate/gain add per-shot variation (so repeats don't machine-gun).
  _playSample(name, gain, rate) {
    const buf = this.samples[name];
    if (!buf || !this.ctx) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate || 1;
    const g = this.ctx.createGain();
    g.gain.value = gain == null ? 1 : gain;
    src.connect(g); g.connect(this.master);
    src.start(this.ctx.currentTime);
    return true;
  },

  // Build the looping water-bed source (once the buffer exists). Starts at
  // gain 0; setWaterLevel() fades it by player proximity to water.
  _ensureWaterBed() {
    if (this._waterBed || !this.samples.waterLoop) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.samples.waterLoop; src.loop = true;
    const gain = this.ctx.createGain(); gain.gain.value = 0;
    src.connect(gain); gain.connect(this.master);
    src.start(this.ctx.currentTime);
    this._waterBed = { src, gain };
  },

  // Fade the ambient water bed by proximity (0 = silent/away, 1 = in water).
  // No-op until the sample loads (synth has no continuous water bed anyway).
  setWaterLevel(level) {
    if (!this._waterBed) return;
    const t = this.ctx.currentTime;
    this._waterBed.gain.gain.linearRampToValueAtTime(clamp(level, 0, 1) * 0.6, t + 0.25);
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.8;
  },

  _noiseBuffer(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  },

  _buildAmbient() {
    const ctx = this.ctx;
    // Low drone: two detuned sines through a lowpass
    const droneGain = ctx.createGain(); droneGain.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 55.7;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 6;
    lfo.connect(lfoGain); lfoGain.connect(o2.frequency);
    o1.connect(lp); o2.connect(lp); lp.connect(droneGain); droneGain.connect(this.master);
    o1.start(); o2.start(); lfo.start();

    // Wind: a low hollow moan, not hiss. Bandpass kept low and narrow so it
    // reads as a draught moving through a big empty space, slowly breathing.
    const noise = ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(4); noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 260; bp.Q.value = 2.2;
    const windGain = ctx.createGain(); windGain.gain.value = 0;
    const wLfo = ctx.createOscillator(); wLfo.frequency.value = 0.09;
    const wLfoGain = ctx.createGain(); wLfoGain.gain.value = 140;
    wLfo.connect(wLfoGain); wLfoGain.connect(bp.frequency);
    // slow amplitude swell so gusts rise and fall (radios don't breathe)
    const wTrem = ctx.createGain(); wTrem.gain.value = 0.7;
    const wTremLfo = ctx.createOscillator(); wTremLfo.frequency.value = 0.06;
    const wTremAmt = ctx.createGain(); wTremAmt.gain.value = 0.5;
    wTremLfo.connect(wTremAmt); wTremAmt.connect(wTrem.gain);
    noise.connect(bp); bp.connect(windGain); windGain.connect(wTrem); wTrem.connect(this.master);
    noise.start(); wLfo.start(); wTremLfo.start();

    // Rain: a dark, undulating wash — NOT bright broadband hiss (that reads as
    // radio static). Bandpass sits low-mid and a slow tremolo makes it surge
    // and ebb like distant rainfall rather than a flat carrier.
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = this._noiseBuffer(3); rainSrc.loop = true;
    const rbp = ctx.createBiquadFilter(); rbp.type = 'bandpass'; rbp.frequency.value = 1100; rbp.Q.value = 0.6;
    const rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 2600;
    const rainGain = ctx.createGain(); rainGain.gain.value = 0;
    const rTrem = ctx.createGain(); rTrem.gain.value = 0.75;
    const rTremLfo = ctx.createOscillator(); rTremLfo.frequency.value = 0.13;
    const rTremAmt = ctx.createGain(); rTremAmt.gain.value = 0.42;
    rTremLfo.connect(rTremAmt); rTremAmt.connect(rTrem.gain);
    rainSrc.connect(rbp); rbp.connect(rlp); rlp.connect(rainGain);
    rainGain.connect(rTrem); rTrem.connect(this.master);
    rainSrc.start(); rTremLfo.start();

    this.ambient = { droneGain, windGain, rainGain, droneOsc: o1, droneOsc2: o2 };
  },

  // Crossfade ambience for a chapter. mood: {drone, wind, rain, pitch}
  setMood(mood) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const a = this.ambient;
    a.droneGain.gain.linearRampToValueAtTime(mood.drone, t + 3);
    a.windGain.gain.linearRampToValueAtTime(mood.wind, t + 3);
    a.rainGain.gain.linearRampToValueAtTime(mood.rain, t + 3);
    a.droneOsc.frequency.linearRampToValueAtTime(mood.pitch, t + 4);
    a.droneOsc2.frequency.linearRampToValueAtTime(mood.pitch * 1.012, t + 4);
  },

  // --- one-shot helpers ---
  _blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  _thud(dur, vol, freq) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = freq || 300;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t);
  },

  step()      { this._thud(0.07, 0.10, 700); },
  jump()      { this._thud(0.12, 0.12, 500); },
  land()      { this._thud(0.16, 0.22, 320); },
  gasp()      { this._thud(0.45, 0.22, 1100); },   // sharp inhale breaking the surface

  // One air bubble (Farnell / Minnaert model): a sine at the cavity's
  // resonant pitch that rises as the bubble collapses, amplitude decaying
  // fast. A single one is a cartoon "bloop"; dozens overlapping become water.
  _bubble(f0, vol, t0) {
    const ctx = this.ctx, t = t0;
    const dur = 0.035 + Math.random() * 0.09;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    // smaller (higher) bubbles rise more steeply; cap the glide
    o.frequency.exponentialRampToValueAtTime(f0 * (1.3 + Math.random() * 0.6), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  splash() {
    if (!this.ctx) return;
    // recorded splash if available (slight pitch/gain wobble per hit), else synth
    if (this._playSample('splash', 0.42 + Math.random() * 0.12, 0.94 + Math.random() * 0.12)) return;
    this._synthSplash();
  },

  _synthSplash() {
    const ctx = this.ctx, t = ctx.currentTime;
    // 1) Impact: a soft mid-band noise burst — the water breaking. Soft attack
    //    so it's a "pff", not a knock; low gain so the bubbles carry the sound.
    const brk = ctx.createBufferSource(); brk.buffer = this._noiseBuffer(0.22);
    const bbp = ctx.createBiquadFilter(); bbp.type = 'bandpass'; bbp.frequency.value = 1100; bbp.Q.value = 0.6;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.linearRampToValueAtTime(0.13, t + 0.025);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    brk.connect(bbp); bbp.connect(bg); bg.connect(this.master); brk.start(t);
    // 2) Soft low body for weight, quiet + slow attack so it never knocks
    const body = ctx.createBufferSource(); body.buffer = this._noiseBuffer(0.35);
    const blp = ctx.createBiquadFilter(); blp.type = 'lowpass'; blp.frequency.value = 460;
    const bdg = ctx.createGain();
    bdg.gain.setValueAtTime(0.0001, t);
    bdg.gain.linearRampToValueAtTime(0.035, t + 0.05);
    bdg.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    body.connect(blp); blp.connect(bdg); bdg.connect(this.master); body.start(t);
    // 3) Bubble cloud: ~30 faint bubbles, log-spread pitches biased toward the
    //    mid/high where water lives, onsets clustered near the impact then
    //    thinning. Density is what reads as water — each one is quiet so no
    //    single "bloop" stands out (that was the cartoon problem).
    const N = 30;
    for (let i = 0; i < N; i++) {
      const r = Math.pow(Math.random(), 0.75);               // bias upward
      const onset = Math.pow(Math.random(), 1.7) * 0.26;     // front-loaded
      const f0 = 300 * Math.pow(3000 / 300, r);              // 300–3000 Hz, log
      const vol = 0.008 + Math.random() * 0.012;             // flat, faint
      this._bubble(f0, vol, t + onset);
    }
  },

  boxDrag()   { this._thud(0.09, 0.07, 220); },
  lever()     { this._blip(160, 0.25, 'square', 0.12, 70); this._thud(0.2, 0.2, 250); },
  doorMove()  { this._thud(0.7, 0.18, 140); },
  connect()   { this._blip(880, 0.5, 'sine', 0.10, 1320); this._blip(440, 0.6, 'sine', 0.08); },
  disconnect(){ this._blip(660, 0.4, 'sine', 0.08, 220); },
  detectTick(){ this._blip(1200, 0.06, 'square', 0.05); },
  alarm()     { this._blip(620, 0.7, 'sawtooth', 0.16, 480); },
  death()     { this._thud(1.2, 0.5, 180); this._blip(110, 1.0, 'sine', 0.2, 40); },
  checkpoint(){ this._blip(523, 0.7, 'sine', 0.07, 784); },
  creatureGrowl() { this._thud(1.4, 0.4, 120); this._blip(60, 1.2, 'sawtooth', 0.12, 35); },
  creatureOpen()  { this._blip(220, 0.5, 'sine', 0.06, 330); },
  heartbeatThump(){ this._thud(0.12, 0.30, 150); },

  // Called every frame: drives heartbeat when 'level' (0..1) is high
  update(dt, dangerLevel) {
    this.heartbeat.level = dangerLevel;
    if (dangerLevel > 0.05) {
      this.heartbeat.timer -= dt;
      if (this.heartbeat.timer <= 0) {
        this.heartbeatThump();
        this.heartbeat.timer = lerp(1.0, 0.42, dangerLevel);
      }
    } else {
      this.heartbeat.timer = 0.4;
    }
  },
};
