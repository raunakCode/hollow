// ---------------------------------------------------------------
// HOLLOW - audio.js : procedural ambient + event sounds (WebAudio)
// ---------------------------------------------------------------
'use strict';

const AudioSys = {
  ctx: null,
  master: null,
  muted: false,
  ambient: null,     // { drone1, drone2, windGain, rainGain, droneGain, lfo }
  heartbeat: { timer: 0, level: 0 },

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    this._buildAmbient();
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

    // Wind: filtered noise, slowly modulated
    const noise = ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(4); noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
    const windGain = ctx.createGain(); windGain.gain.value = 0;
    const wLfo = ctx.createOscillator(); wLfo.frequency.value = 0.11;
    const wLfoGain = ctx.createGain(); wLfoGain.gain.value = 250;
    wLfo.connect(wLfoGain); wLfoGain.connect(bp.frequency);
    noise.connect(bp); bp.connect(windGain); windGain.connect(this.master);
    noise.start(); wLfo.start();

    // Rain: brighter noise hiss
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = this._noiseBuffer(3); rainSrc.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    const rainGain = ctx.createGain(); rainGain.gain.value = 0;
    rainSrc.connect(hp); hp.connect(rainGain); rainGain.connect(this.master);
    rainSrc.start();

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
  splash()    { this._thud(0.5, 0.35, 1400); },
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
